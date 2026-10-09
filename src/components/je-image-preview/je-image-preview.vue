<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'

defineOptions({ name: 'JeImagePreview' })

const props = withDefaults(
  defineProps<{
    /** 是否显示 */
    modelValue?: boolean
    /** 图片地址列表 */
    images?: string[]
    /** 初始显示第几张 */
    startPosition?: number
    /** 顶部索引指示 */
    showIndex?: boolean
    /** 底部小圆点指示 */
    showIndicators?: boolean
    /** 首尾循环切换 */
    infinite?: boolean
    /** infinite 的别名，二者取或 */
    loop?: boolean
    /** 切图动画时长 */
    swipeDuration?: number
    /** 最大缩放倍数 */
    maxZoom?: number
    /** 最小缩放倍数 */
    minZoom?: number
    /** 显示关闭按钮 */
    closeable?: boolean
    /** 关闭按钮图标 */
    closeIcon?: JeIconName
    /** 点击图片外的空白区域关闭 */
    closeOnClickOverlay?: boolean
  }>(),
  {
    modelValue: false,
    images: () => [],
    startPosition: 0,
    showIndex: true,
    showIndicators: false,
    infinite: false,
    loop: false,
    swipeDuration: 300,
    maxZoom: 3,
    minZoom: 1,
    closeable: true,
    closeIcon: 'close',
    closeOnClickOverlay: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 当前图片下标变化 */
  change: [index: number]
  /** 关闭 */
  close: []
  /** 缩放倍数变化 */
  scale: [scale: number]
}>()

/* 主库文案走语言包，uni 侧没有 i18n，用中文兜底 */
const CLOSE_LABEL = '关闭'

const trackRef = ref<HTMLElement | null>(null)
const zIndex = ref(nextZIndex())

const index = ref(0)
const offset = ref(0)
const dragging = ref(false)
/** 循环切换跨多张时直接跳，避免长距离滑动 */
const instant = ref(false)

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

/** 加载失败的图片，用来显示占位 */
const failed = ref<boolean[]>([])

const active = computed(() => props.modelValue)

/*
 * 主库的浮层挂在 body 上，这里就地渲染：小程序端没有 Teleport，
 * 浮层本身是 position: fixed 铺满视口，效果一致。
 * 小程序端没有 body，锁屏交给遮罩层的 touchmove 阻断（全屏层自然吃掉滚动）。
 */
// #ifdef H5
let previousOverflow = ''

const setBodyScrollLock = (locked: boolean) => {
  if (locked) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousOverflow
}

watch(active, (value) => setBodyScrollLock(value))
// #endif

const looping = computed(() => props.infinite || props.loop)
const count = computed(() => props.images.length)
const safeIndex = computed(() => clamp(index.value, 0, Math.max(0, count.value - 1)))

const indexText = computed(() => `${safeIndex.value + 1} / ${count.value}`)

const rootStyle = computed(() => ({
  zIndex: zIndex.value,
  '--je-image-preview-safe-top': 'env(safe-area-inset-top, 0px)',
  '--je-image-preview-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
}))

const EASE = 'cubic-bezier(0.25, 0.8, 0.35, 1)'

const trackStyle = computed(() => ({
  transform: `translate3d(calc(${-index.value * 100}% + ${offset.value}px), 0, 0)`,
  transition:
    dragging.value || instant.value ? 'none' : `transform ${props.swipeDuration}ms ${EASE}`,
}))

const imgStyle = computed(() => ({
  transform: `translate3d(${translateX.value}px, ${translateY.value}px, 0) scale(${scale.value})`,
  transition: dragging.value ? 'none' : `transform ${props.swipeDuration}ms ${EASE}`,
}))

/* ---------------- 缩放 / 平移 ---------------- */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** 浮层铺满视口，容器尺寸即视口尺寸 */
const trackSize = () => {
  // #ifdef H5
  return {
    width: trackRef.value?.clientWidth || window.innerWidth,
    height: trackRef.value?.clientHeight || window.innerHeight,
  }
  // #endif
  // #ifndef H5
  const info = uni.getSystemInfoSync()
  return { width: info.windowWidth, height: info.windowHeight }
  // #endif
}

const panLimit = () => {
  const { width, height } = trackSize()
  return {
    x: Math.max(0, (width * (scale.value - 1)) / 2),
    y: Math.max(0, (height * (scale.value - 1)) / 2),
  }
}

const setScale = (next: number) => {
  const value = clamp(next, props.minZoom, props.maxZoom)
  scale.value = value
  if (value <= props.minZoom) {
    // 缩到最小处即为原图，平移量失去意义
    translateX.value = 0
    translateY.value = 0
  } else {
    const limit = panLimit()
    translateX.value = clamp(translateX.value, -limit.x, limit.x)
    translateY.value = clamp(translateY.value, -limit.y, limit.y)
  }
  emit('scale', value)
}

const resetTransform = () => {
  scale.value = props.minZoom
  translateX.value = 0
  translateY.value = 0
}

/** 小程序端没有 rAF，用定时器兜底等一次渲染 */
const releaseInstant = () => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      instant.value = false
    })
    return
  }
  setTimeout(() => {
    instant.value = false
  }, 50)
}

/** 翻页统一入口：循环取模、非循环夹紧 */
const goTo = (target: number) => {
  const total = count.value
  if (total === 0) return
  const next = looping.value ? ((target % total) + total) % total : clamp(target, 0, total - 1)
  if (next === index.value) {
    offset.value = 0
    return
  }
  instant.value = Math.abs(next - index.value) > 1
  index.value = next
  offset.value = 0
  resetTransform()
  emit('change', next)
  if (instant.value) releaseInstant()
}

/* ---------------- 手势 ---------------- */

/*
 * 主库用 PointerEvent + setPointerCapture。小程序端没有 pointer 事件，
 * 所以统一拆成「触点 id + 坐标」的公共逻辑，再由触摸 / 鼠标两套通道驱动：
 * H5 与小程序都走 touchstart/move/end（uni 两端的触摸事件字段一致），
 * 桌面 H5 另外挂一套鼠标事件；触屏浏览器在 touchend 后会补发鼠标事件，用时间戳忽略掉。
 */
type GestureMode = 'none' | 'swipe' | 'pan' | 'pinch'

const points = new Map<number, { x: number; y: number }>()
let mode: GestureMode = 'none'
let startX = 0
let startY = 0
let startTx = 0
let startTy = 0
let startScale = 1
let startDistance = 1
let moved = false
/** 本次手势是否算作一次「轻点」，交给 @tap 判定双击缩放 / 点击关闭 */
const tapEligible = ref(false)
let lastTapAt = 0
let lastTouchAt = 0

const beginPoint = (id: number, x: number, y: number) => {
  if (!props.modelValue) return
  points.set(id, { x, y })

  if (points.size === 1) {
    moved = false
    mode = scale.value > props.minZoom ? 'pan' : 'swipe'
    dragging.value = true
    startX = x
    startY = y
    startTx = translateX.value
    startTy = translateY.value
    offset.value = 0
    return
  }

  if (points.size === 2) {
    const [first, second] = [...points.values()]
    if (!first || !second) return
    mode = 'pinch'
    dragging.value = true
    startDistance = Math.hypot(first.x - second.x, first.y - second.y) || 1
    startScale = scale.value
    startTx = translateX.value
    startTy = translateY.value
    offset.value = 0
  }
}

const movePoint = (id: number, x: number, y: number) => {
  if (!points.has(id)) return
  points.set(id, { x, y })

  if (mode === 'pinch') {
    const [first, second] = [...points.values()]
    if (!first || !second) return
    const distance = Math.hypot(first.x - second.x, first.y - second.y) || 1
    setScale((startScale * distance) / startDistance)
    return
  }

  if (mode === 'pan') {
    const limit = panLimit()
    translateX.value = clamp(startTx + (x - startX), -limit.x, limit.x)
    translateY.value = clamp(startTy + (y - startY), -limit.y, limit.y)
    if (Math.abs(x - startX) > 8 || Math.abs(y - startY) > 8) moved = true
    return
  }

  if (mode === 'swipe') {
    let delta = x - startX
    // 首尾不循环时加阻尼，越界拖动更「重」
    if (
      !looping.value &&
      ((index.value === 0 && delta > 0) || (index.value === count.value - 1 && delta < 0))
    ) {
      delta *= 0.35
    }
    offset.value = delta
    if (Math.abs(delta) > 8 || Math.abs(y - startY) > 8) moved = true
  }
}

const endPoint = (id: number) => {
  if (!points.has(id)) return
  points.delete(id)

  if (points.size > 0) {
    // 双指松开一根：改成以剩余手指继续平移 / 滑动
    const [rest] = [...points.values()]
    if (rest) {
      mode = scale.value > props.minZoom ? 'pan' : 'swipe'
      startX = rest.x
      startY = rest.y
      startTx = translateX.value
      startTy = translateY.value
      offset.value = 0
    }
    return
  }

  const previousMode = mode
  mode = 'none'
  dragging.value = false

  if (previousMode === 'swipe') {
    const threshold = Math.max(60, trackSize().width / 4)
    if (offset.value > threshold) goTo(index.value - 1)
    else if (offset.value < -threshold) goTo(index.value + 1)
    else offset.value = 0
  }

  if (scale.value <= props.minZoom) resetTransform()

  tapEligible.value = !moved && previousMode !== 'pinch'
  moved = false
}

/** 触摸点：uni 在 H5 与小程序两端都提供了 touches / changedTouches */
type RawTouch = { identifier?: number; clientX: number; clientY: number }

const toPoint = (touch: RawTouch, fallbackId: number) => ({
  id: touch.identifier ?? fallbackId,
  x: touch.clientX,
  y: touch.clientY,
})

const onTouchStart = (event: TouchEvent) => {
  lastTouchAt = Date.now()
  const touches = (event.touches ?? []) as unknown as RawTouch[]
  touches.forEach((touch, i) => {
    const { id, x, y } = toPoint(touch, i)
    if (!points.has(id)) beginPoint(id, x, y)
  })
}

const onTouchMove = (event: TouchEvent) => {
  const touches = (event.touches ?? []) as unknown as RawTouch[]
  touches.forEach((touch, i) => {
    const { id, x, y } = toPoint(touch, i)
    movePoint(id, x, y)
  })
}

const onTouchEnd = (event: TouchEvent) => {
  const touches = (event.changedTouches ?? []) as unknown as RawTouch[]
  touches.forEach((touch, i) => {
    const { id } = toPoint(touch, i)
    endPoint(id)
  })
}

/** 桌面端鼠标拖动：触屏补发的鼠标事件要忽略，避免重复走一遍手势 */
const MOUSE_ID = -1

const onMouseDown = (event: MouseEvent) => {
  if (Date.now() - lastTouchAt < 600) return
  beginPoint(MOUSE_ID, event.clientX, event.clientY)
}

const onMouseMove = (event: MouseEvent) => {
  movePoint(MOUSE_ID, event.clientX, event.clientY)
}

const onMouseUp = () => endPoint(MOUSE_ID)

/** 轻点空白处关闭；点在图上的轻点交给 onImageTap */
const onTrackTap = () => {
  if (!tapEligible.value) return
  tapEligible.value = false
  if (props.closeOnClickOverlay) close()
}

/** 轻点图片：双击在「原图 / 最大倍数」之间切换 */
const onImageTap = () => {
  if (!tapEligible.value) return
  tapEligible.value = false
  const at = Date.now()
  if (at - lastTapAt < 300) {
    lastTapAt = 0
    if (scale.value > props.minZoom) resetTransform()
    else setScale(props.maxZoom)
    return
  }
  lastTapAt = at
}

const onImageError = (target: number) => {
  // 小程序端按索引改数组不一定会触发更新，整只换掉更稳
  const next = [...failed.value]
  next[target] = true
  failed.value = next
}

const onWheel = (event: WheelEvent) => {
  if (!props.modelValue) return
  setScale(scale.value * (event.deltaY < 0 ? 1.12 : 1 / 1.12))
}

/* ---------------- 开关与键盘 ---------------- */

const close = () => {
  if (!props.modelValue) return
  emit('update:modelValue', false)
  emit('close')
}

const onOverlayClick = () => {
  if (props.closeOnClickOverlay) close()
}

/* 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key === 'ArrowLeft') goTo(index.value - 1)
  else if (event.key === 'ArrowRight') goTo(index.value + 1)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // 每次显示都重新取层级，保证压住先前打开的浮层
      zIndex.value = nextZIndex()
      index.value = count.value > 0 ? clamp(props.startPosition, 0, count.value - 1) : 0
      offset.value = 0
      dragging.value = false
      tapEligible.value = false
      resetTransform()
      // #ifdef H5
      document.addEventListener('keydown', onKeydown)
      // #endif
    } else {
      // #ifdef H5
      document.removeEventListener('keydown', onKeydown)
      // #endif
    }
  },
  { immediate: true },
)

// #ifdef H5
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  setBodyScrollLock(false)
})
// #endif
</script>

<template>
  <view
    class="je-image-preview"
    :class="{ 'is-open': modelValue }"
    :style="rootStyle"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    :aria-hidden="!modelValue"
  >
    <view class="je-image-preview__overlay" aria-hidden="true" @tap="onOverlayClick" />

    <view
      ref="trackRef"
      class="je-image-preview__track"
      :style="trackStyle"
      @touchstart="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @tap="onTrackTap"
      @wheel.prevent="onWheel"
    >
      <view v-for="(image, i) in images" :key="i" class="je-image-preview__item">
        <image
          v-if="!failed[i]"
          class="je-image-preview__img"
          :src="image"
          :alt="`第 ${i + 1} 张图片`"
          mode="aspectFit"
          :style="i === index ? imgStyle : undefined"
          @tap.stop="onImageTap"
          @error="onImageError(i)"
        />
        <text v-else class="je-image-preview__error">
          <JeIcon name="image" :size="40" />
        </text>
      </view>
    </view>

    <view v-if="showIndex && count > 0" class="je-image-preview__index">{{ indexText }}</view>

    <button
      v-if="closeable"
      type="button"
      class="je-image-preview__close"
      :aria-label="CLOSE_LABEL"
      @tap="close"
    >
      <JeIcon :name="closeIcon" :size="20" />
    </button>

    <view v-if="showIndicators && count > 1" class="je-image-preview__indicators">
      <text
        v-for="dot in count"
        :key="dot"
        class="je-image-preview__indicator"
        :class="{ 'is-active': dot - 1 === index }"
        @tap="goTo(dot - 1)"
      />
    </view>
  </view>
</template>

<style scoped>
.je-image-preview {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  font-family: inherit;
  /* 就地渲染会继承宿主节点的 line-height，这里复位 */
  line-height: 1.4;
  /* 整块压在深色遮罩上，文字与图标一律浅色 */
  color: var(--je-text-on-color);
  /* 常驻 DOM 且铺满视口，收起时必须放行点击 */
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--je-duration) ease, visibility 0s linear var(--je-duration);
}

.je-image-preview.is-open {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transition: opacity var(--je-duration) ease;
}

.je-image-preview__overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.je-image-preview__track {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  /* 只对横向手势做拦截，纵向滚动交还浏览器（浮层下页面本身已锁滚动） */
  touch-action: pan-y;
  cursor: grab;
  will-change: transform;
}

.je-image-preview__item {
  position: relative;
  display: flex;
  flex: 0 0 100%;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: calc(var(--je-image-preview-safe-top) + 56px) 12px
    calc(var(--je-image-preview-safe-bottom) + 56px);
}

.je-image-preview__img {
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
  will-change: transform;
}

.je-image-preview__error {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  color: var(--je-text-faint);
  background: var(--je-surface);
  border-radius: var(--je-radius);
}

.je-image-preview__index {
  position: absolute;
  top: calc(var(--je-image-preview-safe-top) + 16px);
  left: 50%;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  /* 压在深色遮罩上，固定浅色 */
  color: var(--je-text-on-color);
  pointer-events: none;
  transform: translateX(-50%);
}

.je-image-preview__close {
  position: absolute;
  top: calc(var(--je-image-preview-safe-top) + 8px);
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  /* 压在深色遮罩上，固定浅色 */
  color: var(--je-text-on-color);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 50%;
  outline: none;
  transition: background var(--je-duration) ease;
}

/* 小程序端的 button 默认带一条伪元素描边，这里自己控制边框 */
.je-image-preview__close::after {
  border: none;
}

.je-image-preview__close:hover {
  background: var(--je-surface-hover);
}

.je-image-preview__close:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-image-preview__indicators {
  position: absolute;
  bottom: calc(var(--je-image-preview-safe-bottom) + 20px);
  left: 50%;
  display: flex;
  gap: 8px;
  transform: translateX(-50%);
}

.je-image-preview__indicator {
  width: 8px;
  height: 8px;
  cursor: pointer;
  /* 指示点也在深色遮罩上，固定由浅色派生 */
  background: color-mix(in srgb, var(--je-text-on-color) 35%, transparent);
  border-radius: 50%;
  transition: background var(--je-duration) ease, transform var(--je-duration) ease;
}

.je-image-preview__indicator.is-active {
  background: var(--je-primary);
  transform: scale(1.25);
}

@media (max-width: 768px) {
  .je-image-preview__index {
    font-size: 13px;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-image-preview,
  .je-image-preview.is-open,
  .je-image-preview__indicator {
    transition: none;
  }
}
</style>
