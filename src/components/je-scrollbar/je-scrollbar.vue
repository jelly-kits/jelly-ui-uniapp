<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  type CSSProperties,
} from 'vue'

defineOptions({ name: 'JeScrollbar' })

type Axis = 'vertical' | 'horizontal'

/** 滑块长度下限，太短了不好拖 */
const DEFAULT_MIN_SIZE = 20

const props = withDefaults(
  defineProps<{
    /** 滚动区高度，不传则撑满父容器 */
    height?: string | number
    /** 滚动区最大高度，内容超出才出现滚动条 */
    maxHeight?: string | number
    /** 保留浏览器原生滚动条，只当作滚动容器用，不再自绘滑块 */
    native?: boolean
    /** 滑块常驻显示（默认悬停或滚动时才浮出） */
    always?: boolean
    /** 滑块最小长度（px） */
    minSize?: number
    /** 内容外层的元素标签名（仅 H5 生效，小程序端固定为 view） */
    tag?: string
    /** 包裹层（真正滚动的元素）的自定义类名 */
    wrapClass?: string
    /** 包裹层的自定义样式 */
    wrapStyle?: CSSProperties | string
    /** 内容层的自定义类名 */
    viewClass?: string
    /** 内容层的自定义样式 */
    viewStyle?: CSSProperties | string
    /** 不监听容器尺寸变化。尺寸固定时开启可以省掉 ResizeObserver 的开销 */
    noresize?: boolean
    /**
     * 滚动视图的 id。真正滚动的是内部 wrap，外部组件（JeAffix 的 target、JeBacktop 的 target、
     * JeAnchor 的 container）都是按选择器去读 `scrollTop` 的，所以 id 必须落在这个元素上。
     */
    id?: string
  }>(),
  {
    height: undefined,
    maxHeight: undefined,
    native: false,
    always: false,
    minSize: DEFAULT_MIN_SIZE,
    tag: 'div',
    wrapClass: '',
    wrapStyle: undefined,
    viewClass: '',
    viewStyle: undefined,
    noresize: false,
    id: undefined,
  },
)

const emit = defineEmits<{
  /** 滚动时触发，回传当前滚动距离 */
  scroll: [payload: { scrollTop: number; scrollLeft: number }]
}>()

const instance = getCurrentInstance()

/**
 * 数字与「纯数字字符串」都按 px 处理（模板里 `height="320"` 传进来的是字符串，
 * 直接写进 style 就是非法 CSS 会被静默忽略）；带单位的字符串原样透传。
 */
const toUnit = (value?: string | number): string | undefined => {
  if (value === undefined) return undefined
  if (typeof value === 'number') return `${value}px`
  return /^-?\d+(\.\d+)?$/.test(value) ? `${value}px` : value
}

interface BarState {
  /** 滑块长度 */
  size: number
  /** 滑块沿轨道方向的偏移 */
  move: number
  /** 内容是否超出容器，不超出就不画滑块 */
  enabled: boolean
}

const wrapRef = ref<HTMLElement | null>(null)
const viewRef = ref<HTMLElement | null>(null)
const verticalBarRef = ref<HTMLElement | null>(null)
const horizontalBarRef = ref<HTMLElement | null>(null)

const vertical = reactive<BarState>({ size: 0, move: 0, enabled: false })
const horizontal = reactive<BarState>({ size: 0, move: 0, enabled: false })

const rootStyle = computed<CSSProperties>(() => {
  if (props.height !== undefined) return { height: toUnit(props.height) as string }
  // 只给了 max-height 时容器要随内容收缩，否则会在滚动区下方留出一段空白
  if (props.maxHeight !== undefined) return { height: 'auto' }
  return {}
})

const wrapMaxStyle = computed<CSSProperties>(() =>
  props.maxHeight !== undefined ? { maxHeight: toUnit(props.maxHeight) as string } : {},
)

/** 按量到的尺寸重算滑块的长度与偏移 */
const applyMetrics = (
  viewport: { vertical: number; horizontal: number },
  content: { vertical: number; horizontal: number },
  offset: { vertical: number; horizontal: number },
  track: { vertical: number; horizontal: number },
) => {
  for (const axis of ['vertical', 'horizontal'] as const) {
    const bar = axis === 'vertical' ? vertical : horizontal
    // 轨道长度还没量出来（刚挂载、或该轴没有轨道）时先不画
    if (content[axis] - viewport[axis] <= 1 || track[axis] <= 0) {
      bar.enabled = false
      bar.size = 0
      bar.move = 0
      continue
    }

    const size = Math.min(
      track[axis],
      Math.max(props.minSize, (viewport[axis] / content[axis]) * track[axis]),
    )
    const maxMove = track[axis] - size
    const maxScroll = content[axis] - viewport[axis]
    bar.enabled = true
    bar.size = size
    bar.move = maxScroll > 0 ? (offset[axis] / maxScroll) * maxMove : 0
  }
}

/* ---------------- 滑块显隐 ---------------- */

const hovering = ref(false)
const dragging = ref<Axis | null>(null)
/** 滚动或拖动结束后让滑块多留一会儿再淡出 */
const active = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | null = null

const markActive = () => {
  active.value = true
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    active.value = false
    idleTimer = null
  }, 700)
}

const barsShown = computed(
  () => props.always || hovering.value || dragging.value !== null || active.value,
)

/* ---------------- 拖动起点（两端共用的临时量） ---------------- */

let dragStart = 0
let dragScrollStart = 0

/* ---------------------------------- H5：真实 DOM ---------------------------------- */
// #ifdef H5
let observer: ResizeObserver | null = null

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/** 轨道长度取自身的 clientHeight / clientWidth；滑块是绝对定位，不会干扰这个测量值 */
const trackLength = (axis: Axis): number => {
  const el = pick(axis === 'vertical' ? verticalBarRef.value : horizontalBarRef.value)
  if (!el) return 0
  return axis === 'vertical' ? el.clientHeight : el.clientWidth
}

const update = () => {
  const wrap = pick(wrapRef.value)
  if (!wrap) return
  applyMetrics(
    { vertical: wrap.clientHeight, horizontal: wrap.clientWidth },
    { vertical: wrap.scrollHeight, horizontal: wrap.scrollWidth },
    { vertical: wrap.scrollTop, horizontal: wrap.scrollLeft },
    { vertical: trackLength('vertical'), horizontal: trackLength('horizontal') },
  )
}

const onThumbDown = (event: PointerEvent, axis: Axis) => {
  const wrap = pick(wrapRef.value)
  if (!wrap || event.button !== 0) return
  event.preventDefault()
  // 阻止冒泡，否则会同时触发轨道上的「跳到点击处」
  event.stopPropagation()
  dragging.value = axis
  dragStart = axis === 'vertical' ? event.clientY : event.clientX
  dragScrollStart = axis === 'vertical' ? wrap.scrollTop : wrap.scrollLeft
  // 捕获指针：拖出滚动条范围也不会丢 pointermove / pointerup
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const onThumbMove = (event: PointerEvent) => {
  const axis = dragging.value
  const wrap = pick(wrapRef.value)
  if (!axis || !wrap) return
  const bar = axis === 'vertical' ? vertical : horizontal
  const maxMove = trackLength(axis) - bar.size
  if (maxMove <= 0) return

  const maxScroll =
    axis === 'vertical' ? wrap.scrollHeight - wrap.clientHeight : wrap.scrollWidth - wrap.clientWidth
  const delta = (axis === 'vertical' ? event.clientY : event.clientX) - dragStart
  setScroll(axis, dragScrollStart + (delta / maxMove) * maxScroll)
}

const onThumbUp = (event: PointerEvent) => {
  if (!dragging.value) return
  dragging.value = null
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
}

/** 点轨道空白处：把滑块中心挪到点击的位置 */
const onTrackDown = (event: PointerEvent, axis: Axis) => {
  const wrap = pick(wrapRef.value)
  if (!wrap || event.button !== 0) return
  const track = event.currentTarget as HTMLElement
  const bar = axis === 'vertical' ? vertical : horizontal
  const maxMove = trackLength(axis) - bar.size
  if (maxMove <= 0) return

  const rect = track.getBoundingClientRect()
  const click = axis === 'vertical' ? event.clientY - rect.top : event.clientX - rect.left
  const ratio = Math.min(1, Math.max(0, (click - bar.size / 2) / maxMove))
  const maxScroll =
    axis === 'vertical' ? wrap.scrollHeight - wrap.clientHeight : wrap.scrollWidth - wrap.clientWidth
  setScroll(axis, ratio * maxScroll)
}
// #endif

/* ------------------------------ 小程序：scroll-view ------------------------------ */
// #ifndef H5
interface TouchPoint {
  clientX: number
  clientY: number
}

interface TouchCarrier {
  touches?: ArrayLike<TouchPoint>
  changedTouches?: ArrayLike<TouchPoint>
  detail?: { x?: number; y?: number; scrollTop?: number; scrollLeft?: number }
}

/** 从触摸 / 点击事件里取出第一个触点 */
const firstTouch = (event: unknown): TouchPoint | undefined => {
  const carrier = event as TouchCarrier | undefined
  return (carrier?.touches?.[0] ?? carrier?.changedTouches?.[0]) as TouchPoint | undefined
}

/**
 * 小程序端没有 DOM：滚动交给 <scroll-view>，尺寸靠 SelectorQuery 量，拖动改用触摸事件。
 * scroll-view 的 scroll 事件两轴都回传，正好当作滑块位置的来源。
 */
let metrics = { viewportV: 0, viewportH: 0, contentV: 0, contentH: 0, trackV: 0, trackH: 0 }
const offset = { vertical: 0, horizontal: 0 }

/** scroll-view 的 scroll-top / scroll-left 是「设值才滚动」，需要用响应式变量驱动 */
const scrollTopModel = ref(0)
const scrollLeftModel = ref(0)

const mpUpdate = () => {
  applyMetrics(
    { vertical: metrics.viewportV, horizontal: metrics.viewportH },
    { vertical: metrics.contentV, horizontal: metrics.contentH },
    offset,
    { vertical: metrics.trackV, horizontal: metrics.trackH },
  )
}

/** 量视口、内容、两条轨道的尺寸；滑块是绝对定位，不会干扰这几个测量值 */
const measure = () => {
  if (!instance?.proxy) return
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-scrollbar__wrap')
    .boundingClientRect()
    .select('.je-scrollbar__view')
    .boundingClientRect()
    .select('.je-scrollbar__bar.is-vertical')
    .boundingClientRect()
    .select('.je-scrollbar__bar.is-horizontal')
    .boundingClientRect()
    .exec((res) => {
      const list = Array.isArray(res) ? res : []
      const wrap = list[0] as unknown as { width?: number; height?: number } | null
      const view = list[1] as unknown as { width?: number; height?: number } | null
      const barV = list[2] as unknown as { height?: number } | null
      const barH = list[3] as unknown as { width?: number } | null
      metrics = {
        viewportV: wrap?.height ?? 0,
        viewportH: wrap?.width ?? 0,
        contentV: view?.height ?? 0,
        contentH: view?.width ?? 0,
        trackV: barV?.height ?? 0,
        trackH: barH?.width ?? 0,
      }
      mpUpdate()
    })
}

const onThumbTouchStart = (event: TouchEvent, axis: Axis) => {
  const touch = firstTouch(event)
  if (!touch) return
  dragging.value = axis
  dragStart = axis === 'vertical' ? touch.clientY : touch.clientX
  dragScrollStart = axis === 'vertical' ? offset.vertical : offset.horizontal
}

const onThumbTouchMove = (event: TouchEvent) => {
  const axis = dragging.value
  if (!axis) return
  const touch = firstTouch(event)
  if (!touch) return

  const bar = axis === 'vertical' ? vertical : horizontal
  const track = axis === 'vertical' ? metrics.trackV : metrics.trackH
  const maxMove = track - bar.size
  if (maxMove <= 0) return

  const maxScroll = Math.max(
    0,
    (axis === 'vertical' ? metrics.contentV - metrics.viewportV : metrics.contentH - metrics.viewportH),
  )
  const delta = (axis === 'vertical' ? touch.clientY : touch.clientX) - dragStart
  setScroll(axis, dragScrollStart + (delta / maxMove) * maxScroll)
}

const onThumbTouchEnd = () => {
  dragging.value = null
}

/** 点轨道空白处：把滑块中心挪到点击的位置（轨道位置要现查） */
const onTrackTap = (event: unknown, axis: Axis) => {
  if (!instance?.proxy) return
  const point = firstTouch(event)
  const detail = (event as TouchCarrier | undefined)?.detail
  const x = point?.clientX ?? detail?.x ?? 0
  const y = point?.clientY ?? detail?.y ?? 0
  const selector =
    axis === 'vertical' ? '.je-scrollbar__bar.is-vertical' : '.je-scrollbar__bar.is-horizontal'

  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select(selector)
    .boundingClientRect()
    .exec((res) => {
      const rect = (Array.isArray(res) ? res[0] : null) as unknown as
        | { top?: number; left?: number }
        | null
      if (!rect) return

      const bar = axis === 'vertical' ? vertical : horizontal
      const track = axis === 'vertical' ? metrics.trackV : metrics.trackH
      const maxMove = track - bar.size
      if (maxMove <= 0) return

      const click = axis === 'vertical' ? y - (rect.top ?? 0) : x - (rect.left ?? 0)
      const ratio = Math.min(1, Math.max(0, (click - bar.size / 2) / maxMove))
      const maxScroll = Math.max(
        0,
        axis === 'vertical' ? metrics.contentV - metrics.viewportV : metrics.contentH - metrics.viewportH,
      )
      setScroll(axis, ratio * maxScroll)
    })
}
// #endif

/* --------------------------- 两端各自的实现收口到同一组函数 --------------------------- */

const refresh = () => {
  // #ifdef H5
  update()
  // #endif
  // #ifndef H5
  measure()
  // #endif
}

const setScroll = (axis: Axis, value: number) => {
  // #ifdef H5
  const wrap = pick(wrapRef.value)
  if (!wrap) return
  if (axis === 'vertical') wrap.scrollTop = value
  else wrap.scrollLeft = value
  // 赋值后 scroll 事件是异步派发的，这里同步刷一次，拖动滑块才跟手
  update()
  // #endif
  // #ifndef H5
  const next = Math.max(0, Math.round(value))
  if (axis === 'vertical') scrollTopModel.value = next
  else scrollLeftModel.value = next
  // #endif
}

const handleScroll = (event: UIEvent) => {
  // #ifdef H5
  const wrap = pick(wrapRef.value)
  if (wrap) {
    update()
    emit('scroll', { scrollTop: wrap.scrollTop, scrollLeft: wrap.scrollLeft })
  }
  // #endif
  // #ifndef H5
  const detail = (event as unknown as TouchCarrier | undefined)?.detail
  offset.vertical = Number(detail?.scrollTop ?? 0)
  offset.horizontal = Number(detail?.scrollLeft ?? 0)
  mpUpdate()
  emit('scroll', { scrollTop: offset.vertical, scrollLeft: offset.horizontal })
  // #endif
  markActive()
}

onMounted(() => {
  // #ifdef H5
  nextTick(update)
  if (props.noresize || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(update)
  const wrap = pick(wrapRef.value)
  if (wrap) observer.observe(wrap)
  // 内容增减也要重算滑块长度，否则列表变了滑块还是旧的
  const view = pick(viewRef.value)
  if (view) observer.observe(view)
  // #endif
  // #ifndef H5
  nextTick(measure)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  observer?.disconnect()
  observer = null
  // #endif
  if (idleTimer) clearTimeout(idleTimer)
})

watch(
  () => [props.minSize, props.height, props.maxHeight] as const,
  () => {
    nextTick(refresh)
  },
)

defineExpose({
  /** 包裹层元素，可直接读取 scrollTop / scrollHeight（小程序端为 null） */
  wrapRef,
  /** 手动重算滑块，内容尺寸变化又没开 ResizeObserver 时用 */
  refresh,
  /** 设置纵向滚动距离 */
  setScrollTop: (value: number) => setScroll('vertical', value),
  /** 设置横向滚动距离 */
  setScrollLeft: (value: number) => setScroll('horizontal', value),
  /** 滚动到指定坐标（x 横向、y 纵向） */
  scrollTo: (xCoord = 0, yCoord = 0) => {
    setScroll('horizontal', xCoord)
    setScroll('vertical', yCoord)
  },
})
</script>

<template>
  <view
    class="je-scrollbar"
    :class="{ 'is-native': native }"
    :style="rootStyle"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <!-- #ifdef H5 -->
    <view
      :id="id"
      ref="wrapRef"
      class="je-scrollbar__wrap"
      :class="wrapClass"
      :style="[wrapMaxStyle, wrapStyle]"
      @scroll.passive="handleScroll"
    >
      <component :is="tag" ref="viewRef" class="je-scrollbar__view" :class="viewClass" :style="viewStyle">
        <slot />
      </component>
    </view>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <scroll-view
      :id="id"
      class="je-scrollbar__wrap"
      :class="wrapClass"
      :style="[wrapMaxStyle, wrapStyle]"
      :scroll-y="true"
      :scroll-x="true"
      :scroll-top="scrollTopModel"
      :scroll-left="scrollLeftModel"
      @scroll="handleScroll"
    >
      <view class="je-scrollbar__view" :class="viewClass" :style="viewStyle">
        <slot />
      </view>
    </scroll-view>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <!-- 轨道常驻 DOM（量长度要用），显隐和事件都交给 is-visible 控制 -->
    <view
      v-if="!native"
      ref="verticalBarRef"
      class="je-scrollbar__bar is-vertical"
      :class="{ 'is-visible': barsShown && vertical.enabled, 'is-dragging': dragging === 'vertical' }"
      @pointerdown="onTrackDown($event, 'vertical')"
    >
      <view
        class="je-scrollbar__thumb"
        :style="{ height: `${vertical.size}px`, transform: `translateY(${vertical.move}px)` }"
        @pointerdown="onThumbDown($event, 'vertical')"
        @pointermove="onThumbMove"
        @pointerup="onThumbUp"
        @pointercancel="onThumbUp"
      />
    </view>

    <view
      v-if="!native"
      ref="horizontalBarRef"
      class="je-scrollbar__bar is-horizontal"
      :class="{
        'is-visible': barsShown && horizontal.enabled,
        'is-dragging': dragging === 'horizontal',
      }"
      @pointerdown="onTrackDown($event, 'horizontal')"
    >
      <view
        class="je-scrollbar__thumb"
        :style="{ width: `${horizontal.size}px`, transform: `translateX(${horizontal.move}px)` }"
        @pointerdown="onThumbDown($event, 'horizontal')"
        @pointermove="onThumbMove"
        @pointerup="onThumbUp"
        @pointercancel="onThumbUp"
      />
    </view>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <view
      v-if="!native"
      class="je-scrollbar__bar is-vertical"
      :class="{ 'is-visible': barsShown && vertical.enabled, 'is-dragging': dragging === 'vertical' }"
      @tap="onTrackTap($event, 'vertical')"
    >
      <view
        class="je-scrollbar__thumb"
        :style="{ height: `${vertical.size}px`, transform: `translateY(${vertical.move}px)` }"
        @touchstart="onThumbTouchStart($event, 'vertical')"
        @touchmove.stop.prevent="onThumbTouchMove"
        @touchend="onThumbTouchEnd"
        @touchcancel="onThumbTouchEnd"
      />
    </view>

    <view
      v-if="!native"
      class="je-scrollbar__bar is-horizontal"
      :class="{
        'is-visible': barsShown && horizontal.enabled,
        'is-dragging': dragging === 'horizontal',
      }"
      @tap="onTrackTap($event, 'horizontal')"
    >
      <view
        class="je-scrollbar__thumb"
        :style="{ width: `${horizontal.size}px`, transform: `translateX(${horizontal.move}px)` }"
        @touchstart="onThumbTouchStart($event, 'horizontal')"
        @touchmove.stop.prevent="onThumbTouchMove"
        @touchend="onThumbTouchEnd"
        @touchcancel="onThumbTouchEnd"
      />
    </view>
    <!-- #endif -->
  </view>
</template>

<style scoped>
.je-scrollbar {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.je-scrollbar__wrap {
  height: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  /* 原生滚动条藏起来，滚动条由下面的轨道自绘 */
  scrollbar-width: none;
}

.je-scrollbar__wrap::-webkit-scrollbar {
  display: none;
}

/* native 模式保留原生滚动条，沿用项目里细滚动条的样式 */
.je-scrollbar.is-native .je-scrollbar__wrap {
  scrollbar-width: thin;
  scrollbar-color: var(--je-border-color) transparent;
}

.je-scrollbar.is-native .je-scrollbar__wrap::-webkit-scrollbar {
  display: block;
  width: 6px;
  height: 6px;
}

.je-scrollbar.is-native .je-scrollbar__wrap::-webkit-scrollbar-thumb {
  background: var(--je-border-color);
  border-radius: 3px;
}

.je-scrollbar__view {
  box-sizing: border-box;
}

.je-scrollbar__bar {
  position: absolute;
  border-radius: 4px;
  opacity: 0;
  /* 隐藏时不吃事件，避免这 6px 挡住内容 */
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.je-scrollbar__bar.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.je-scrollbar__bar.is-vertical {
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
}

.je-scrollbar__bar.is-horizontal {
  right: 2px;
  bottom: 2px;
  left: 2px;
  height: 6px;
}

.je-scrollbar__thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--je-border-color);
  border-radius: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}

/* 悬停或拖动时加深，滑块在深色背景上更明确 */
.je-scrollbar__bar.is-visible .je-scrollbar__thumb:hover,
.je-scrollbar__bar.is-dragging .je-scrollbar__thumb {
  background: color-mix(in srgb, var(--je-text) 35%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .je-scrollbar__bar,
  .je-scrollbar__thumb {
    transition: none;
  }
}
</style>