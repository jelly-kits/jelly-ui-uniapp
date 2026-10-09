<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({ name: 'JeSwipeCell' })

type SwipePosition = 'left' | 'right' | ''

const props = withDefaults(
  defineProps<{
    /** 当前展开的一侧，空字符串表示关闭 */
    modelValue?: SwipePosition
    /** 禁用滑动 */
    disabled?: boolean
    /** 左侧操作区宽度，传数字按 px 处理；不传则按内容自适应 */
    leftWidth?: number | string
    /** 右侧操作区宽度，传数字按 px 处理；不传则按内容自适应 */
    rightWidth?: number | string
  }>(),
  {
    modelValue: '',
    disabled: false,
    leftWidth: undefined,
    rightWidth: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: SwipePosition]
  /** 展开某一侧 */
  open: [position: 'left' | 'right']
  /** 收起某一侧 */
  close: [position: 'left' | 'right']
  /** 未展开时点击内容区 */
  click: [event: MouseEvent]
}>()

const rootRef = ref<HTMLElement | null>(null)
const leftRef = ref<HTMLElement | null>(null)
const rightRef = ref<HTMLElement | null>(null)
const instance = getCurrentInstance()

const offset = ref(0)
const dragging = ref(false)

let moved = false
let locked = false
let startX = 0
let startY = 0
let originOffset = 0
let leftWidthPx = 0
let rightWidthPx = 0

const toPx = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

const leftStyle = computed(() =>
  props.leftWidth === undefined ? undefined : { width: toPx(props.leftWidth) },
)
const rightStyle = computed(() =>
  props.rightWidth === undefined ? undefined : { width: toPx(props.rightWidth) },
)

const contentStyle = computed(() => ({ transform: `translateX(${offset.value}px)` }))

/**
 * 主库用 ResizeObserver + offsetWidth 量左右操作区宽度。
 * 小程序端两者都没有，改用 SelectorQuery；H5 下模板 ref 指向 <view> 组件实例，真实节点挂在 $el 上。
 */
const measure = () => {
  // #ifdef H5
  const pick = (value: unknown) => ((value as { $el?: HTMLElement })?.$el ?? value) as
    | HTMLElement
    | null
  leftWidthPx = pick(leftRef.value)?.offsetWidth ?? 0
  rightWidthPx = pick(rightRef.value)?.offsetWidth ?? 0
  applyModel()
  // #endif
  // #ifndef H5
  if (!instance?.proxy) return
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-swipe-cell__actions--left')
    .boundingClientRect()
    .select('.je-swipe-cell__actions--right')
    .boundingClientRect()
    .exec((results) => {
      const list = Array.isArray(results) ? results : []
      const left = list[0] as unknown as { width?: number } | null
      const right = list[1] as unknown as { width?: number } | null
      leftWidthPx = left?.width ?? 0
      rightWidthPx = right?.width ?? 0
      applyModel()
    })
  // #endif
}

const clamp = (value: number) => Math.min(Math.max(value, -rightWidthPx), leftWidthPx)

const applyModel = () => {
  if (dragging.value) return
  offset.value =
    props.modelValue === 'left'
      ? leftWidthPx
      : props.modelValue === 'right'
        ? -rightWidthPx
        : 0
}

const setPosition = (value: SwipePosition) => {
  const prev = props.modelValue
  offset.value = value === 'left' ? leftWidthPx : value === 'right' ? -rightWidthPx : 0
  emit('update:modelValue', value)
  if (value && value !== prev) emit('open', value)
  if (!value && prev) emit('close', prev)
}

/* ---- 拖动内核：触摸与鼠标共用同一套 begin / move / finish ---- */

const begin = (x: number, y: number) => {
  if (props.disabled) return
  dragging.value = true
  moved = false
  locked = false
  startX = x
  startY = y
  originOffset = offset.value
}

const move = (x: number, y: number) => {
  if (!dragging.value) return
  const dx = x - startX
  const dy = y - startY

  if (!locked) {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    // 竖向意图更强就交还给页面滚动
    if (Math.abs(dy) >= Math.abs(dx)) {
      dragging.value = false
      return
    }
    // 已经贴住某侧还继续往同方向拉，没必要接管
    if ((originOffset >= leftWidthPx && dx > 0) || (originOffset <= -rightWidthPx && dx < 0)) {
      dragging.value = false
      return
    }
    locked = true
  }

  moved = true
  offset.value = clamp(originOffset + dx)
}

const finish = () => {
  if (!dragging.value) return
  dragging.value = false
  if (!locked) return

  if (offset.value > 0 && offset.value > leftWidthPx / 2) setPosition('left')
  else if (offset.value < 0 && -offset.value > rightWidthPx / 2) setPosition('right')
  else setPosition('')
}

/* ---- 触摸通道（两端都绑在根元素上） ---- */

const touchPoint = (event: TouchEvent) => {
  const touch = event.touches?.[0] ?? event.changedTouches?.[0]
  return touch ? { x: touch.clientX, y: touch.clientY } : null
}

const onTouchStart = (event: TouchEvent) => {
  const point = touchPoint(event)
  if (point) begin(point.x, point.y)
}

const onTouchMove = (event: TouchEvent) => {
  const point = touchPoint(event)
  if (point) move(point.x, point.y)
}

/*
 * 鼠标通道：mousedown 收在根元素上，mousemove / mouseup 挂到 document，
 * 划出内容区也能继续拖。不写条件编译——模板上同一个根元素同时绑了两套，
 * 砍掉任何一套都会让模板引用到不存在的绑定；小程序端 mousedown 永不触发。
 */
const onMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return
  begin(event.clientX, event.clientY)
}

/* 只有 H5 需要把移动 / 抬起挂到 document 上 */
// #ifdef H5
const onDocMouseMove = (event: MouseEvent) => move(event.clientX, event.clientY)

const onDocMouseUp = () => finish()
// #endif

const onClick = (event: MouseEvent) => {
  if (props.disabled) return
  // 拖动结束后浏览器还会补一次 click，这里吞掉
  if (moved) {
    moved = false
    return
  }
  if (props.modelValue) {
    setPosition('')
    return
  }
  emit('click', event)
}

/** 供外部调用：展开指定一侧 */
const open = (position: 'left' | 'right' = 'right') => {
  if (props.disabled) return
  setPosition(position)
}

/** 供外部调用：收起 */
const close = () => {
  if (!props.modelValue) return
  setPosition('')
}

onMounted(() => {
  measure()
  // #ifdef H5
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
  // #endif
})

watch(() => props.modelValue, applyModel)

defineExpose({ open, close })
</script>

<template>
  <view
    ref="rootRef"
    class="je-swipe-cell"
    :class="{
      'is-dragging': dragging,
      'is-disabled': disabled,
      'reveal-left': offset > 0,
      'reveal-right': offset < 0,
    }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="finish"
    @touchcancel="finish"
    @mousedown="onMouseDown"
  >
    <view
      v-if="$slots.left"
      ref="leftRef"
      class="je-swipe-cell__actions je-swipe-cell__actions--left"
      :style="leftStyle"
    >
      <slot name="left" />
    </view>

    <view class="je-swipe-cell__content" :style="contentStyle" @tap="onClick">
      <slot />
    </view>

    <view
      v-if="$slots.right"
      ref="rightRef"
      class="je-swipe-cell__actions je-swipe-cell__actions--right"
      :style="rightStyle"
    >
      <slot name="right" />
    </view>
  </view>
</template>

<style scoped>
.je-swipe-cell {
  position: relative;
  overflow: hidden;
  font-family: inherit;
  /* H5 竖向滚动交给浏览器，横向位移由手势接管；小程序端该声明无意义 */
  touch-action: pan-y;
}

.je-swipe-cell__content {
  position: relative;
  z-index: 1;
  /* 内容需要盖住背后的操作区，所以默认给一个近似不透明的底色 */
  background: var(--je-swipe-cell-bg, var(--je-popup));
  transition: transform var(--je-duration) var(--je-ease-out-back);
}

.je-swipe-cell.is-dragging {
  user-select: none;
  -webkit-user-select: none;
}

.je-swipe-cell.is-dragging .je-swipe-cell__content {
  transition: none;
}

.je-swipe-cell__actions {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
  /* 未展开的一侧不参与显示，免得透过半透明内容漏出来 */
  visibility: hidden;
}

.je-swipe-cell.reveal-left .je-swipe-cell__actions--left,
.je-swipe-cell.reveal-right .je-swipe-cell__actions--right {
  visibility: visible;
}

.je-swipe-cell__actions--left {
  left: 0;
}

.je-swipe-cell__actions--right {
  right: 0;
}

.je-swipe-cell.is-disabled .je-swipe-cell__content {
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .je-swipe-cell__content {
    transition: none;
  }
}
</style>
