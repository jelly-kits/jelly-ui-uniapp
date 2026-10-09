<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'

defineOptions({ name: 'JeFloatingBubble' })

const props = withDefaults(
  defineProps<{
    /** 当前坐标（相对视口左上角，单位 px） */
    offset?: { x: number; y: number }
    /** 允许拖拽的方向 */
    axis?: 'x' | 'y' | 'xy'
    /** 松手后吸附到哪条边 */
    magnetic?: 'x' | 'y'
    /** 气泡内的图标 */
    icon?: JeIconName
    /** 与屏幕边缘保持的距离 */
    gap?: number
  }>(),
  {
    offset: undefined,
    axis: 'y',
    magnetic: undefined,
    icon: undefined,
    gap: 24,
  },
)

const emit = defineEmits<{
  'update:offset': [value: { x: number; y: number }]
  /** 坐标变化（拖拽中与吸附后都会触发） */
  offsetChange: [value: { x: number; y: number }]
  /** 位移小于阈值时视为点击 */
  click: [event: MouseEvent | KeyboardEvent]
}>()

const instance = getCurrentInstance()
const rootRef = ref<HTMLElement | null>(null)
const pos = ref({ x: props.offset?.x ?? 0, y: props.offset?.y ?? 0 })
const dragging = ref(false)
/** 气泡边长缓存：夹取坐标要用，两端各自量一次后复用 */
const size = ref(0)

/** 拖动结束时用来吞掉随之而来的那次点击 */
let suppressClick = false
let moved = false
let startX = 0
let startY = 0
let originX = 0
let originY = 0

/**
 * 视口尺寸。小程序端没有 window，改问 uni（与 CSS 的 `@media (max-width: 768px)`
 * 无关，这里要的是真实像素边界）。
 */
const readViewport = () => {
  let width = 0
  let height = 0
  // #ifdef H5
  width = window.innerWidth
  height = window.innerHeight
  // #endif
  // #ifndef H5
  const info = uni.getWindowInfo()
  width = info.windowWidth
  height = info.windowHeight
  // #endif
  return { width, height }
}

const clampX = (x: number) => {
  const max = readViewport().width - size.value - props.gap
  return Math.min(Math.max(x, props.gap), Math.max(props.gap, max))
}

const clampY = (y: number) => {
  const max = readViewport().height - size.value - props.gap
  return Math.min(Math.max(y, props.gap), Math.max(props.gap, max))
}

const rootStyle = computed(() => ({
  transform: `translate3d(${pos.value.x}px, ${pos.value.y}px, 0)`,
}))

const update = (next: { x: number; y: number }) => {
  pos.value = next
  emit('update:offset', next)
  emit('offsetChange', next)
}

watch(
  () => props.offset,
  (value) => {
    if (value) pos.value = { x: value.x, y: value.y }
  },
)

/* ---------------- 尺寸与边界 ---------------- */

/* H5 下模板 ref 指向的是 uni-view 实例，真实 DOM 节点挂在 $el 上 */
// #ifdef H5
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null
// #endif

/** 首次挂载与窗口尺寸变化时只做边界收敛，不回抛事件 */
const applyClamp = () => {
  pos.value = { x: clampX(pos.value.x), y: clampY(pos.value.y) }
}

/** H5 直接读 offsetWidth；小程序端没有 DOM，异步量一次再回调 */
const measureSize = (done: () => void) => {
  // #ifdef H5
  size.value = pick(rootRef.value)?.offsetWidth ?? 0
  done()
  // #endif
  // #ifndef H5
  if (!instance?.proxy) {
    done()
    return
  }
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-floating-bubble')
    .boundingClientRect((result) => {
      const rect = (Array.isArray(result) ? result[0] : result) as unknown as
        | { width?: number }
        | null
      size.value = rect?.width ?? 0
      done()
    })
    .exec()
  // #endif
}

const onViewportResize = () => measureSize(applyClamp)

/* ---------------- 拖拽：鼠标走 pointer，触摸与小程序端走 touch ---------------- */

const beginDrag = (clientX: number, clientY: number) => {
  dragging.value = true
  moved = false
  suppressClick = false
  startX = clientX
  startY = clientY
  originX = pos.value.x
  originY = pos.value.y
}

const moveDrag = (clientX: number, clientY: number) => {
  if (!dragging.value) return
  const dx = clientX - startX
  const dy = clientY - startY
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true

  update({
    x: props.axis === 'y' ? originX : clampX(originX + dx),
    y: props.axis === 'x' ? originY : clampY(originY + dy),
  })
}

const snap = () => {
  const next = { ...pos.value }
  if (props.magnetic === 'x') {
    const left = pos.value.x + size.value / 2 < readViewport().width / 2
    next.x = left ? props.gap : readViewport().width - size.value - props.gap
  } else {
    const top = pos.value.y + size.value / 2 < readViewport().height / 2
    next.y = top ? props.gap : readViewport().height - size.value - props.gap
  }
  update(next)
}

const endDrag = () => {
  if (!dragging.value) return
  dragging.value = false
  suppressClick = moved
  if (!moved) return
  if (props.magnetic) snap()
}

/* 鼠标走 pointer 通道；触摸在同一台设备上也会派发 pointer 事件，这里跳过交给 touch */
const onPointerDown = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse') return
  beginDrag(event.clientX, event.clientY)
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse') return
  moveDrag(event.clientX, event.clientY)
}

const onPointerUp = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse') return
  const el = event.currentTarget as HTMLElement
  if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId)
  endDrag()
}

interface TouchPoint {
  clientX: number
  clientY: number
}

/** 从触摸事件里取出第一个触点，两端的事件形状不一样 */
const firstTouch = (event: unknown) => {
  const carrier = event as
    | { touches?: ArrayLike<TouchPoint>; changedTouches?: ArrayLike<TouchPoint> }
    | undefined
  return carrier?.touches?.[0] ?? carrier?.changedTouches?.[0]
}

const onTouchStart = (event: unknown) => {
  const touch = firstTouch(event)
  if (!touch) return
  beginDrag(touch.clientX, touch.clientY)
}

const onTouchMove = (event: unknown) => {
  const touch = firstTouch(event)
  if (!touch) return
  moveDrag(touch.clientX, touch.clientY)
}

const onTouchEnd = () => endDrag()

const onTap = (event: unknown) => {
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('click', event as MouseEvent)
}

/** 键盘只在 H5 存在；小程序端没有 keydown 事件，该绑定永不触发 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  emit('click', event)
}

onMounted(() => {
  measureSize(applyClamp)
  // #ifdef H5
  window.addEventListener('resize', onViewportResize)
  // #endif
  // #ifndef H5
  uni.onWindowResize(onViewportResize)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  window.removeEventListener('resize', onViewportResize)
  // #endif
  // #ifndef H5
  uni.offWindowResize(onViewportResize)
  // #endif
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-floating-bubble"
    :class="{ 'is-dragging': dragging }"
    :style="rootStyle"
    role="button"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @touchstart="onTouchStart"
    @touchmove.stop.prevent="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
    @tap="onTap"
    @keydown="onKeydown"
  >
    <slot>
      <JeIcon v-if="icon" :name="icon" :size="24" />
    </slot>
  </view>
</template>

<style scoped>
.je-floating-bubble {
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 52px;
  height: 52px;
  font-family: inherit;
  font-size: 20px;
  color: #fff;
  cursor: grab;
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-radius: 50%;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 45%, transparent);
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  /* 拖拽由 JS 接管，这里禁止浏览器把触摸当成滚动 / 缩放 */
  touch-action: none;
  /* 吸附回弹用 CSS 过渡，拖动过程中关掉 */
  transition: transform 0.34s var(--je-ease-out-back);
}

.je-floating-bubble.is-dragging {
  cursor: grabbing;
  transition: none;
}

.je-floating-bubble:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-primary) 45%, transparent),
    0 8px 24px color-mix(in srgb, var(--je-primary) 45%, transparent);
}

@media (max-width: 768px) {
  .je-floating-bubble {
    width: 56px;
    height: 56px;
  }
}

/* 减弱动效时必须把 .is-dragging 一并列出：它的特异性更高，只写基础类会被它反压回来 */
@media (prefers-reduced-motion: reduce) {
  .je-floating-bubble,
  .je-floating-bubble.is-dragging {
    transition: none;
  }
}
</style>
