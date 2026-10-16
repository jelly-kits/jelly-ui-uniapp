<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import JeScrollbar from '../je-scrollbar/je-scrollbar.vue'
import { useJeLocale } from '../je-locale'

defineOptions({ name: 'JeFloatingPanel' })

const props = withDefaults(
  defineProps<{
    /** 当前面板高度（px），配合 v-model 使用 */
    modelValue?: number
    /** 可吸附的高度档位（px），缺省为 100 与视口高度的 60% */
    anchors?: number[]
    /** 高度过渡时长，数字按秒处理，字符串原样使用 */
    duration?: number | string
    /** 是否可拖拽抓手调整高度 */
    draggable?: boolean
    /** 底部预留安全区 */
    safeAreaInsetBottom?: boolean
    /** 是否显示关闭按钮 */
    closeable?: boolean
    /** 面板标题 */
    title?: string
  }>(),
  {
    modelValue: undefined,
    // 缺省档位在下面按运行时视口高算：props 默认值工厂在 setup 之外执行，读不到这里的东西
    anchors: undefined,
    duration: 0.3,
    draggable: true,
    safeAreaInsetBottom: true,
    closeable: false,
    title: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [height: number]
  /** 高度吸附落定后派发 */
  heightChange: [height: number]
  /** 点击关闭按钮 */
  close: []
}>()

const { t } = useJeLocale()

/** 视口高度：小程序端没有 window，改问 uni */
const readViewportHeight = () => {
  let height = 0
  // #ifdef H5
  height = window.innerHeight
  // #endif
  // #ifndef H5
  height = uni.getWindowInfo().windowHeight
  // #endif
  return height
}

/** 档位升序排列，最小 / 最大档位决定拖拽的夹取范围 */
const sortedAnchors = computed(() =>
  [...(props.anchors ?? [100, Math.round(readViewportHeight() * 0.6)])].sort((a, b) => a - b),
)
const minAnchor = computed(() => sortedAnchors.value[0] ?? 0)
const maxAnchor = computed(() => sortedAnchors.value[sortedAnchors.value.length - 1] ?? 0)

const clamp = (value: number) => Math.min(maxAnchor.value, Math.max(minAnchor.value, value))

/** 就近吸附到某个档位 */
const closestAnchor = (value: number) => {
  const list = sortedAnchors.value
  const first = list[0]
  if (first === undefined) return value
  return list.reduce(
    (best, anchor) => (Math.abs(anchor - value) < Math.abs(best - value) ? anchor : best),
    first,
  )
}

/** 初始高度：优先 v-model，其次第二个档位，再退回第一个档位 */
const initialHeight = () => {
  const list = sortedAnchors.value
  if (props.modelValue !== undefined) return clamp(props.modelValue)
  return list[1] ?? list[0] ?? 0
}

const height = ref(initialHeight())
const dragging = ref(false)
/** 非模态浮层，挂载时取一次层级即可 */
const zIndex = ref(nextZIndex())

let startY = 0
let startHeight = 0

const rootStyle = computed(() => ({
  zIndex: zIndex.value,
  height: `${height.value}px`,
  // 安全区直接落在内联样式上，不经过 CSS 变量（小程序端对变量里的 env() 支持不稳）
  paddingBottom: props.safeAreaInsetBottom ? 'env(safe-area-inset-bottom, 0px)' : '0px',
  // 拖拽过程中关掉过渡才能跟手，松手后交还给 CSS（对象里给 undefined 表示不写这条内联样式）
  transition: dragging.value ? 'none' : undefined,
  '--je-floating-panel-duration':
    typeof props.duration === 'number' ? `${props.duration}s` : props.duration,
}))

const applyHeight = (value: number) => {
  height.value = Math.round(clamp(value))
}

/** 设置高度并吸附到最近档位，同时向上派发 */
const setHeight = (value: number) => {
  applyHeight(closestAnchor(value))
  emit('update:modelValue', height.value)
  emit('heightChange', height.value)
}

watch(
  () => props.modelValue,
  (value) => {
    if (value === undefined || dragging.value) return
    applyHeight(value)
  },
)

watch(sortedAnchors, () => applyHeight(height.value))

/* ---------------- 拖拽：鼠标走 pointer，触摸与小程序端走 touch ---------------- */

const beginDrag = (clientY: number) => {
  if (!props.draggable) return
  dragging.value = true
  startY = clientY
  startHeight = height.value
}

const moveDrag = (clientY: number) => {
  if (!dragging.value) return
  // 手指上移增大高度
  applyHeight(startHeight + (startY - clientY))
}

const endDrag = () => {
  if (!dragging.value) return
  dragging.value = false
  setHeight(height.value)
}

const onPointerDown = (event: PointerEvent) => {
  // 触摸在同一台设备上也会派发 pointer 事件，交给 touch 通道，避免两套逻辑打架
  if (event.pointerType !== 'mouse' || event.button !== 0) return
  beginDrag(event.clientY)
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse') return
  moveDrag(event.clientY)
}

const onPointerUp = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse') return
  const el = event.currentTarget as HTMLElement
  if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId)
  endDrag()
}

interface TouchPoint {
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
  beginDrag(touch.clientY)
}

const onTouchMove = (event: unknown) => {
  const touch = firstTouch(event)
  if (!touch) return
  moveDrag(touch.clientY)
}

const onTouchEnd = () => endDrag()

const onClose = () => emit('close')

defineExpose({
  /** 设置高度，会吸附到最近档位 */
  setHeight,
  /** 返回距离指定高度最近的档位 */
  closestAnchor,
})
</script>

<template>
  <view class="je-floating-panel" :style="rootStyle">
    <view
      v-if="$slots.header"
      class="je-floating-panel__header"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @touchstart="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <slot name="header" />
    </view>

    <view
      v-else
      class="je-floating-panel__header"
      :class="{ 'is-draggable': draggable }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @touchstart="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <view class="je-floating-panel__grabber" aria-hidden="true" />
      <view v-if="title || closeable" class="je-floating-panel__bar">
        <text v-if="title" class="je-floating-panel__title">{{ title }}</text>
        <!-- 关闭按钮上的手势要掐断，否则点一下也会被抓手当成「拖了 0 像素」而多派发一次吸附 -->
        <button
          v-if="closeable"
          type="button"
          class="je-floating-panel__close"
          :aria-label="t('close')"
          @pointerdown.stop
          @touchstart.stop
          @tap="onClose"
        >
          <JeIcon name="close" :size="16" />
        </button>
      </view>
    </view>

    <view class="je-floating-panel__content">
      <JeScrollbar>
        <view class="je-floating-panel__view">
          <slot />
        </view>
      </JeScrollbar>
    </view>
  </view>
</template>

<style scoped>
.je-floating-panel {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: var(--je-border);
  border-radius: var(--je-radius-lg) var(--je-radius-lg) 0 0;
  box-shadow: var(--je-shadow-popup);
  --je-floating-panel-duration: 0.3s;
  transition: height var(--je-floating-panel-duration) ease;
}

/* 抓手是独立的手势元素，可以独占 touch-action */
.je-floating-panel__header {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 4px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.je-floating-panel__header.is-draggable {
  cursor: grab;
}

.je-floating-panel__header.is-draggable:active {
  cursor: grabbing;
}

.je-floating-panel__grabber {
  width: 36px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

.je-floating-panel__bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 36px;
  padding: 0 48px;
}

.je-floating-panel__title {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-floating-panel__close {
  position: absolute;
  top: 50%;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  /* 两端原生 button 都自带 margin，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0;
  color: var(--je-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  outline: none;
  transform: translateY(-50%);
  transition: background var(--je-duration) ease, color var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-floating-panel__close::after {
  border: none;
}

.je-floating-panel__close:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-floating-panel__close:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-floating-panel__content {
  flex: 1 1 auto;
  min-height: 0;
  /* 内容滚动不把滚动链传递给页面 */
  overscroll-behavior: contain;
}

.je-floating-panel__view {
  padding: 4px 0 12px;
}

@media (max-width: 768px) {
  .je-floating-panel__header {
    padding: 12px 0 6px;
  }

  .je-floating-panel__close {
    min-width: 44px;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-floating-panel {
    transition: none;
  }
}
</style>
