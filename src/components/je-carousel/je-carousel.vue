<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useUid } from '../../core/useUid'
import { JE_CAROUSEL_KEY, type JeCarouselItemMeta } from './types'

defineOptions({ name: 'JeCarousel' })

const props = withDefaults(
  defineProps<{
    modelValue?: number
    height?: string
    autoplay?: boolean
    /** 自动播放间隔，单位 ms */
    interval?: number
    loop?: boolean
    direction?: 'horizontal' | 'vertical'
    indicatorPosition?: 'inside' | 'outside' | 'none'
    arrow?: 'hover' | 'always' | 'never'
    trigger?: 'click' | 'hover'
  }>(),
  {
    modelValue: 0,
    height: '240px',
    autoplay: true,
    interval: 3000,
    loop: true,
    direction: 'horizontal',
    indicatorPosition: 'inside',
    arrow: 'hover',
    trigger: 'click',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [index: number]
}>()

const uid = useUid('je-carousel')
const index = ref(props.modelValue)
const items = ref<JeCarouselItemMeta[]>([])
/** 指针悬停时暂停自动播放（小程序端没有 hover，此值一直是 false） */
const paused = ref(false)
/** 触摸拖动过程中的实时位移（px） */
const dragOffset = ref(0)
const dragging = ref(false)

const count = computed(() => items.value.length)

watch(
  () => props.modelValue,
  (value) => {
    if (value !== index.value) index.value = value
  },
)

const setIndex = (next: number) => {
  const total = count.value
  if (total <= 0) return
  const target = ((next % total) + total) % total
  if (target === index.value) return
  index.value = target
  emit('update:modelValue', target)
  emit('change', target)
}

/** 相对步进：loop 时首尾相接，否则夹在两端不动 */
const step = (delta: number) => {
  const total = count.value
  if (total <= 1) return
  const raw = index.value + delta
  setIndex(props.loop ? raw : Math.min(total - 1, Math.max(0, raw)))
}

const register = (item: JeCarouselItemMeta) => {
  if (!items.value.some((existing) => existing.uid === item.uid)) items.value.push(item)
}

const unregister = (id: string) => {
  items.value = items.value.filter((item) => item.uid !== id)
  if (index.value > items.value.length - 1) index.value = Math.max(0, items.value.length - 1)
}

provide(JE_CAROUSEL_KEY, { register, unregister })

/* ---------------- 自动播放 ---------------- */

let timer: ReturnType<typeof setInterval> | undefined

const stopTimer = () => {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

const startTimer = () => {
  stopTimer()
  if (!props.autoplay) return
  timer = setInterval(() => {
    // 悬停或只剩一张时这一拍直接跳过
    if (paused.value || count.value <= 1) return
    // #ifdef H5
    // 页面被切到后台时别推进索引
    if (document.hidden) return
    // #endif
    step(1)
  }, props.interval)
}

onMounted(startTimer)
onBeforeUnmount(stopTimer)

watch([() => props.autoplay, () => props.interval], startTimer)
watch(count, startTimer)

const onMouseEnter = () => {
  paused.value = true
}

const onMouseLeave = () => {
  paused.value = false
}

/* ---------------- 触摸滑动 ---------------- */

/**
 * 主库用 PointerEvent，并且「鼠标交由箭头 / 指示点操作，拖动只服务触屏」，
 * 所以这里统一换成触摸事件，行为一致且两端都能用。
 * 小程序端没法像 touch-action 那样按方向放行，只能先锁定主轴：
 * 与轮播方向一致才跟手，否则整段忽略，把纵向滚动留给页面。
 */
let startX = 0
let startY = 0
let axisLocked: 'axis' | 'cross' | null = null

const onTouchStart = (event: TouchEvent) => {
  if (count.value <= 1) return
  const touch = event.touches[0]
  if (!touch) return
  dragging.value = true
  dragOffset.value = 0
  axisLocked = null
  startX = touch.clientX
  startY = touch.clientY
}

const onTouchMove = (event: TouchEvent) => {
  if (!dragging.value) return
  const touch = event.touches[0]
  if (!touch) return
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY

  if (axisLocked === null) {
    // 先晃过几个像素再判方向，避免竖向微动被判成横滑
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    const along = props.direction === 'vertical' ? Math.abs(dy) > Math.abs(dx) : Math.abs(dx) > Math.abs(dy)
    axisLocked = along ? 'axis' : 'cross'
  }
  if (axisLocked === 'cross') return
  dragOffset.value = props.direction === 'vertical' ? dy : dx
}

const onTouchEnd = () => {
  if (!dragging.value) return
  dragging.value = false
  axisLocked = null

  const offset = dragOffset.value
  dragOffset.value = 0
  // 超过阈值才翻页，否则轨道原地弹回
  if (Math.abs(offset) < 50) return
  step(offset < 0 ? 1 : -1)
}

const trackStyle = computed(() => {
  const base = -index.value * 100
  const offset = dragging.value ? dragOffset.value : 0
  const axis = props.direction === 'vertical' ? 'translateY' : 'translateX'
  return {
    transform: `${axis}(calc(${base}% + ${offset}px))`,
    transition: dragging.value ? 'none' : undefined,
  }
})

const rootStyle = computed(() => ({ '--je-carousel-height': props.height }))

const onIndicatorClick = (i: number) => setIndex(i)

const onIndicatorEnter = (i: number) => {
  if (props.trigger === 'hover') setIndex(i)
}

const onKeydown = (event: KeyboardEvent) => {
  const vertical = props.direction === 'vertical'
  if (vertical && event.key === 'ArrowUp') {
    event.preventDefault()
    step(-1)
  } else if (vertical && event.key === 'ArrowDown') {
    event.preventDefault()
    step(1)
  } else if (!vertical && event.key === 'ArrowLeft') {
    event.preventDefault()
    step(-1)
  } else if (!vertical && event.key === 'ArrowRight') {
    event.preventDefault()
    step(1)
  }
}
</script>

<template>
  <view
    :id="`${uid}`"
    class="je-carousel"
    :class="[
      `je-carousel--${direction}`,
      `je-carousel--indicator-${indicatorPosition}`,
      `je-carousel--arrow-${arrow}`,
    ]"
    :style="rootStyle"
    role="region"
    aria-roledescription="carousel"
    aria-label="轮播图"
    tabindex="0"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @keydown="onKeydown"
  >
    <view
      class="je-carousel__viewport"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <view class="je-carousel__track" :style="trackStyle">
        <slot />
      </view>

      <template v-if="arrow !== 'never' && count > 1">
        <button
          type="button"
          class="je-carousel__arrow je-carousel__arrow--prev"
          aria-label="上一张"
          @tap="step(-1)"
        >
          <JeIcon :name="direction === 'vertical' ? 'chevron-up' : 'chevron-left'" :size="20" />
        </button>
        <button
          type="button"
          class="je-carousel__arrow je-carousel__arrow--next"
          aria-label="下一张"
          @tap="step(1)"
        >
          <JeIcon :name="direction === 'vertical' ? 'chevron-down' : 'chevron-right'" :size="20" />
        </button>
      </template>
    </view>

    <view
      v-if="indicatorPosition !== 'none' && count > 1"
      class="je-carousel__indicators"
      role="tablist"
      aria-label="轮播导航"
    >
      <button
        v-for="(item, i) in items"
        :id="`${uid}-tab-${i}`"
        :key="item.uid"
        type="button"
        class="je-carousel__indicator"
        role="tab"
        :aria-selected="i === index"
        :aria-label="item.name === undefined ? `第 ${i + 1} 张` : String(item.name)"
        @tap="onIndicatorClick(i)"
        @mouseenter="onIndicatorEnter(i)"
      >
        <view class="je-carousel__dot" aria-hidden="true" />
      </button>
    </view>
  </view>
</template>

<style scoped>
.je-carousel {
  position: relative;
  font-family: inherit;
  outline: none;
}

.je-carousel:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
  border-radius: var(--je-radius-lg);
}

.je-carousel__viewport {
  position: relative;
  overflow: hidden;
  height: var(--je-carousel-height, 240px);
  border: var(--je-border);
  border-radius: var(--je-radius-lg);
}

/* 横向滑动交给组件，纵向滚动留给页面；反之亦然。这里不能用 touch-action: none */
.je-carousel--horizontal .je-carousel__viewport {
  touch-action: pan-y;
}

.je-carousel--vertical .je-carousel__viewport {
  touch-action: pan-x;
}

.je-carousel__track {
  display: flex;
  height: 100%;
  will-change: transform;
  transition: transform 0.5s var(--je-ease-out-back);
}

.je-carousel--vertical .je-carousel__track {
  flex-direction: column;
}

/* ---------------- 箭头 ---------------- */

.je-carousel__arrow {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0;
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-popup) 70%, transparent);
  border: var(--je-border);
  border-radius: 50%;
  cursor: pointer;
  transform: translateY(-50%);
  transition: opacity 0.25s ease, background 0.2s ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-carousel__arrow::after,
.je-carousel__indicator::after {
  border: none;
}

.je-carousel__arrow:hover {
  background: color-mix(in srgb, var(--je-primary) 60%, transparent);
}

.je-carousel__arrow--prev {
  left: 10px;
}

.je-carousel__arrow--next {
  right: 10px;
}

.je-carousel--vertical .je-carousel__arrow {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}

.je-carousel--vertical .je-carousel__arrow--prev {
  top: 10px;
}

.je-carousel--vertical .je-carousel__arrow--next {
  top: auto;
  bottom: 10px;
}

.je-carousel--arrow-always .je-carousel__arrow {
  opacity: 1;
}

.je-carousel--arrow-hover .je-carousel__arrow {
  opacity: 0;
  pointer-events: none;
}

.je-carousel--arrow-hover:hover .je-carousel__arrow,
.je-carousel--arrow-hover:focus-within .je-carousel__arrow {
  opacity: 1;
  pointer-events: auto;
}

/* ---------------- 指示点 ---------------- */

.je-carousel__indicators {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.je-carousel--indicator-inside .je-carousel__indicators {
  position: absolute;
  right: 0;
  bottom: 4px;
  left: 0;
  z-index: 2;
}

.je-carousel--indicator-outside .je-carousel__indicators {
  padding: 8px 0 0;
}

/* 纵向：指示点竖排（横向时靠 inline 排成一行，这里必须显式改方向） */
.je-carousel--vertical .je-carousel__indicators {
  flex-direction: column;
}

/* 纵向 + inside：贴右侧、上下居中 */
.je-carousel--vertical.je-carousel--indicator-inside .je-carousel__indicators {
  top: 50%;
  right: 4px;
  bottom: auto;
  left: auto;
  transform: translateY(-50%);
}

/* 纵向 + outside：整体改成一行，指示点单独占右侧一列 */
.je-carousel--vertical.je-carousel--indicator-outside {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.je-carousel--vertical.je-carousel--indicator-outside .je-carousel__viewport {
  flex: 1 1 auto;
  min-width: 0;
}

.je-carousel--vertical.je-carousel--indicator-outside .je-carousel__indicators {
  padding: 0 0 0 8px;
}

/* 热区固定 44px，视觉上的圆点由内层节点承担 */
.je-carousel__indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零才能被 justify-content 居中 */
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.je-carousel__indicator:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -8px;
}

.je-carousel__dot {
  width: 8px;
  height: 8px;
  background: color-mix(in srgb, var(--je-text) 45%, transparent);
  border-radius: 999px;
  transition: width var(--je-duration) var(--je-ease-overshoot),
    height var(--je-duration) var(--je-ease-overshoot), background var(--je-duration) ease;
}

/* 用属性选择器而不是 :class，避免 Vue 覆写命令式挂上的 class */
.je-carousel__indicator[aria-selected='true'] .je-carousel__dot {
  width: 22px;
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

/* 竖排时选中态是「拉高」而不是「拉宽」 */
.je-carousel--vertical .je-carousel__indicator[aria-selected='true'] .je-carousel__dot {
  width: 8px;
  height: 22px;
}

/* 窄屏没有 hover，hover 模式的箭头退化为常显 */
@media (max-width: 768px) {
  .je-carousel--arrow-hover .je-carousel__arrow {
    opacity: 1;
    pointer-events: auto;
  }

  .je-carousel--indicator-outside .je-carousel__indicators {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-carousel__track,
  .je-carousel__arrow,
  .je-carousel__dot {
    transition: none;
  }
}
</style>