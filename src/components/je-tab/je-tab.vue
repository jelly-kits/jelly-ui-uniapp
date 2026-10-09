<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
} from 'vue'
import { jeTabKey, type JeTabContext, type JeTabItemState, type JeTabName } from './types'

defineOptions({ name: 'JeTab' })

const props = withDefaults(
  defineProps<{
    /** 当前激活项的 name */
    modelValue?: JeTabName
    /** 内容区可左右滑动切页 */
    swipeable?: boolean
    /** 切页有位移过渡 */
    animated?: boolean
    /** 头部吸顶 */
    sticky?: boolean
    /** 吸顶时距容器顶部的距离 */
    offsetTop?: number | string
    /** 切页过渡时长（毫秒） */
    duration?: number
    /** 触发切页的最小横向滑动距离（px） */
    swipeThreshold?: number
    /** 激活下划线宽度，数字按 px，字符串支持百分比；缺省取激活项宽度 */
    lineWidth?: number | string
    /** 激活下划线高度 */
    lineHeight?: number | string
    /** 激活态颜色 */
    activeColor?: string
    /** 未激活态颜色 */
    inactiveColor?: string
    /** 头部背景色 */
    background?: string
    /** 标题放不下时省略并平分宽度 */
    ellipsis?: boolean
  }>(),
  {
    modelValue: undefined,
    swipeable: true,
    animated: true,
    sticky: false,
    offsetTop: 0,
    duration: 300,
    swipeThreshold: 60,
    lineWidth: undefined,
    lineHeight: 3,
    activeColor: '',
    inactiveColor: '',
    background: '',
    ellipsis: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [name: JeTabName]
  /** 激活项变化 */
  change: [name: JeTabName, index: number]
  /** 点击标题（含点击已激活项） */
  click: [name: JeTabName, index: number]
}>()

const instance = getCurrentInstance()

/* ---------------- 子项注册 ---------------- */

/** 未受控时的内部激活 name */
const innerValue = ref<JeTabName | undefined>(undefined)
const activeName = computed<JeTabName | undefined>(() => props.modelValue ?? innerValue.value)

/**
 * 标题由父级统一渲染，所以子项要把标题数据注册上来。
 * 存的是 getState 而不是快照：每次读取都会跟踪子项 props，标题 / 角标变了能立刻反映出来。
 */
const registry = ref<{ uid: string; getState: () => JeTabItemState }[]>([])
const items = computed(() => registry.value.map((entry) => entry.getState()))

let seed = 0
const genName = () => {
  seed += 1
  return seed
}

const register: JeTabContext['register'] = (id, getState) => {
  if (registry.value.some((entry) => entry.uid === id)) return
  registry.value = [...registry.value, { uid: id, getState }]
  // 未受控且尚无激活项时默认选中第一个注册的标签
  if (props.modelValue === undefined && innerValue.value === undefined) {
    innerValue.value = getState().name
  }
}

const unregister: JeTabContext['unregister'] = (id) => {
  registry.value = registry.value.filter((entry) => entry.uid !== id)
}

const getIndex = (name: JeTabName) => items.value.findIndex((item) => item.name === name)

const isActive = (name: JeTabName) => activeName.value !== undefined && name === activeName.value

const activeIndex = computed(() =>
  activeName.value === undefined ? -1 : getIndex(activeName.value),
)

const changeTo = (name: JeTabName) => {
  const index = getIndex(name)
  if (index < 0) return
  if (props.modelValue === undefined) innerValue.value = name
  emit('update:modelValue', name)
  emit('change', name, index)
}

const activate = (name: JeTabName) => {
  const index = getIndex(name)
  if (index < 0) return
  if (items.value[index]?.disabled) return
  emit('click', name, index)
  if (name === activeName.value) return
  changeTo(name)
}

/** 沿 step 方向找下一个可用项并激活 */
const switchBy = (step: number) => {
  const list = items.value
  const len = list.length
  if (len === 0) return
  const current = activeIndex.value < 0 ? 0 : activeIndex.value
  for (let offset = 1; offset <= len; offset += 1) {
    const next = (((current + step * offset) % len) + len) % len
    const entry = list[next]
    if (entry && !entry.disabled) {
      changeTo(entry.name)
      return
    }
  }
}

/* ---------------- 上下文 ---------------- */

const activeColor = computed(() => props.activeColor || 'var(--je-primary)')
const inactiveColor = computed(() => props.inactiveColor || 'var(--je-text-muted)')
const ellipsis = computed(() => props.ellipsis)

const context: JeTabContext = {
  activeName,
  genName,
  register,
  unregister,
  activate,
  isActive,
  getIndex,
  activeColor,
  inactiveColor,
  ellipsis,
}
provide(jeTabKey, context)

/* ---------------- 激活下划线 ---------------- */

const navRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)
const ink = ref({ left: 0, width: 0 })
const lineVisible = ref(false)

/** scroll-view 的布尔属性走 ref 下发（小程序端静态字面量 false 有丢失历史） */
const showScrollbar = ref(false)
/** 激活项滚进可视区中部时用的横向偏移 */
const scrollLeft = ref(0)

interface JeRect {
  left: number
  width: number
}

/* H5 下模板 ref 指向的是 uni-view / uni-scroll-view 实例，真实 DOM 节点挂在 $el 上 */
// #ifdef H5
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null
// #endif

/**
 * 由标题条内容层与激活标题两块矩形算出下划线的位置，两端共用同一套几何。
 * 内容层随滚动一起位移，两者相减得到的就是内容坐标，不必再补 scrollLeft。
 */
const applyInk = (navRect: JeRect, tabRect: JeRect, barRect?: JeRect) => {
  const offset = tabRect.left - navRect.left
  ink.value = { left: offset, width: tabRect.width }
  lineVisible.value = true

  // 标题条放不下（内容层比可视区宽）时，把激活项滚到中间
  if (!barRect || navRect.width <= barRect.width) return
  const centered = offset - (barRect.width - tabRect.width) / 2
  scrollLeft.value = Math.min(
    Math.max(Math.round(centered), 0),
    Math.round(navRect.width - barRect.width),
  )
}

/** 量出激活标题相对标题条的几何位置，下划线才能滑过去 */
const updateInk = () => {
  const name = activeName.value
  const item = name === undefined ? undefined : items.value.find((entry) => entry.name === name)
  if (!item) {
    lineVisible.value = false
    return
  }

  // #ifdef H5
  const nav = pick(navRef.value)
  const tab = document.getElementById(`${item.uid}-tab`)
  const bar = pick(barRef.value)
  if (!nav || !tab) {
    lineVisible.value = false
    return
  }
  applyInk(nav.getBoundingClientRect(), tab.getBoundingClientRect(), bar?.getBoundingClientRect())
  // #endif

  // #ifndef H5
  if (!instance?.proxy) return
  const query = uni.createSelectorQuery().in(instance.proxy)
  query.select('.je-tab__nav').boundingClientRect()
  query.select(`#${item.uid}-tab`).boundingClientRect()
  query.select('.je-tab__scroll').boundingClientRect()
  query.exec((result) => {
    const list = Array.isArray(result) ? result : []
    const navRect = list[0] as unknown as JeRect | null
    const tabRect = list[1] as unknown as JeRect | null
    const barRect = list[2] as unknown as JeRect | null
    if (!navRect || !tabRect) {
      lineVisible.value = false
      return
    }
    applyInk(navRect, tabRect, barRect ?? undefined)
  })
  // #endif
}

const resize = () => {
  void nextTick(updateInk)
}

watch([activeName, items, () => props.lineWidth, () => props.ellipsis], resize)

onMounted(() => {
  void nextTick(updateInk)
  // #ifdef H5
  window.addEventListener('resize', updateInk)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  window.removeEventListener('resize', updateInk)
  // #endif
})

/* ---------------- 滑动切页 ---------------- */

const dragging = ref(false)
const dragOffset = ref(0)
let startX = 0
let startY = 0
let axis: 'x' | 'y' | null = null

interface TouchPoint {
  clientX: number
  clientY: number
}

/** 从触摸事件里取出第一个触点，两端的事件形状不一样 */
const firstTouch = (event: unknown) => {
  const carrier = event as { touches?: ArrayLike<TouchPoint> } | undefined
  return carrier?.touches?.[0]
}

const onTouchStart = (event: unknown) => {
  if (!props.swipeable) return
  const touch = firstTouch(event)
  if (!touch) return
  startX = touch.clientX
  startY = touch.clientY
  dragOffset.value = 0
  axis = null
  dragging.value = true
}

const onTouchMove = (event: unknown) => {
  if (!dragging.value) return
  const touch = firstTouch(event)
  if (!touch) return
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY
  // 方向未定时先观察：横向位移更大才认定是切页手势，否则放行给纵向滚动
  if (axis === null) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
  }
  if (axis !== 'x') return
  const index = activeIndex.value < 0 ? 0 : activeIndex.value
  const atStart = index <= 0 && dx > 0
  const atEnd = index >= items.value.length - 1 && dx < 0
  dragOffset.value = atStart || atEnd ? dx * 0.3 : dx
}

const onTouchEnd = () => {
  if (!dragging.value) return
  dragging.value = false
  const dx = dragOffset.value
  dragOffset.value = 0
  const horizontal = axis === 'x'
  axis = null
  if (horizontal && Math.abs(dx) > props.swipeThreshold) switchBy(dx < 0 ? 1 : -1)
}

/* ---------------- 样式 ---------------- */

const lineGradient = computed(
  () =>
    `linear-gradient(90deg, color-mix(in srgb, ${activeColor.value} 55%, var(--je-primary-end)), ${activeColor.value})`,
)

const rootStyle = computed(() => ({
  '--je-tab-duration': `${props.duration}ms`,
  '--je-tab-line-height':
    typeof props.lineHeight === 'number' ? `${props.lineHeight}px` : props.lineHeight,
  '--je-tab-line': lineGradient.value,
}))

const headerStyle = computed(() => ({
  background: props.background || 'transparent',
  top: typeof props.offsetTop === 'number' ? `${props.offsetTop}px` : props.offsetTop,
}))

const lineStyle = computed(() => ({
  transform: `translateX(${ink.value.left}px)`,
  width:
    props.lineWidth === undefined
      ? `${ink.value.width}px`
      : typeof props.lineWidth === 'number'
        ? `${props.lineWidth}px`
        : props.lineWidth,
}))

/** 内容轨道：整页整页地位移；拖拽中的零头交给内层，避免小程序端拼 calc() */
const trackStyle = computed(() => {
  const index = activeIndex.value < 0 ? 0 : activeIndex.value
  return { transform: `translateX(${-index * 100}%)` }
})

const dragStyle = computed(() => ({ transform: `translateX(${dragOffset.value}px)` }))

const colorOf = (item: JeTabItemState) =>
  isActive(item.name) ? activeColor.value : inactiveColor.value

const showBadge = (item: JeTabItemState) =>
  !item.dot && item.badge !== undefined && item.badge !== ''

defineExpose({ resize })
</script>

<template>
  <view
    class="je-tab"
    :class="{ 'is-dragging': dragging, 'is-static': !animated }"
    :style="rootStyle"
  >
    <view class="je-tab__header" :class="{ 'is-sticky': sticky }" :style="headerStyle">
      <!-- 标题条放不下时整条横向滑动；小程序端 view 不滚动，滚动交给 scroll-view -->
      <scroll-view
        ref="barRef"
        class="je-tab__scroll"
        :scroll-x="true"
        :show-scrollbar="showScrollbar"
        :scroll-left="scrollLeft"
        :scroll-with-animation="true"
      >
        <view ref="navRef" class="je-tab__nav" :class="{ 'is-stretch': ellipsis }">
          <button
            v-for="item in items"
            :id="`${item.uid}-tab`"
            :key="item.uid"
            type="button"
            class="je-tab__tab"
            :class="{
              'is-stretch': ellipsis,
              'is-active': isActive(item.name),
              'is-disabled': item.disabled,
            }"
            role="tab"
            :aria-selected="isActive(item.name)"
            :disabled="item.disabled"
            :style="{ color: colorOf(item) }"
            @tap="activate(item.name)"
          >
            <text class="je-tab__title">{{ item.title }}</text>
            <view v-if="item.dot" class="je-tab__dot" aria-hidden="true" />
            <view v-else-if="showBadge(item)" class="je-tab__badge">{{ item.badge }}</view>
          </button>

          <view
            class="je-tab__line"
            :class="{ 'is-visible': lineVisible }"
            :style="lineStyle"
            aria-hidden="true"
          />
        </view>
      </scroll-view>
    </view>

    <view
      class="je-tab__content"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <view class="je-tab__track" :style="trackStyle">
        <view class="je-tab__track-drag" :style="dragStyle">
          <slot />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-tab {
  font-family: inherit;
  color: var(--je-text);
}

.je-tab__header {
  position: relative;
  height: 44px;
}

.je-tab__header.is-sticky {
  position: sticky;
  z-index: 10;
}

/*
 * 标题条容器。主库窄屏下临时把 .je-tab__nav 变成横向滚动容器；这里恒为 scroll-view
 * （小程序端 view 不能滚动），所以尺寸要显式写死：uni 的 scroll-view 宿主默认
 * width / height 都是 100%，这里正好撑满头部。
 */
.je-tab__scroll {
  width: 100%;
  height: 100%;
  scrollbar-width: none;
}

.je-tab__scroll::-webkit-scrollbar {
  display: none;
}

/* 主库 .je-tab__nav 的布局落在这层：它同时是下划线的定位父级 */
.je-tab__nav {
  position: relative;
  display: inline-flex;
}

/* 省略模式：标题平分宽度，不横向滚动 */
.je-tab__nav.is-stretch {
  display: flex;
  width: 100%;
}

.je-tab__tab {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  min-height: 44px;
  /* 两端原生 button 都自带 margin，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--je-text-muted);
  white-space: nowrap;
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  transition: color var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-tab__tab::after {
  border: none;
}

/* 省略模式：等分宽度，标题超出省略 */
.je-tab__tab.is-stretch {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 8px;
}

.je-tab__tab.is-active {
  font-weight: 700;
}

.je-tab__tab.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-tab__tab:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-tab__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-tab__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  /* 红色实底上固定浅色文字 */
  color: var(--je-text-on-color);
  background: var(--je-danger);
  border-radius: 999px;
}

.je-tab__dot {
  width: 8px;
  height: 8px;
  background: var(--je-danger);
  border-radius: 50%;
}

.je-tab__line {
  position: absolute;
  bottom: 0;
  left: 0;
  height: var(--je-tab-line-height, 3px);
  background: var(--je-tab-line, var(--je-primary));
  border-radius: 999px;
  opacity: 0;
  pointer-events: none;
  transition: transform var(--je-tab-duration, 300ms) var(--je-ease-out-back),
    width var(--je-tab-duration, 300ms) var(--je-ease-out-back), opacity 0.2s ease;
}

.je-tab__line.is-visible {
  opacity: 1;
}

.je-tab__content {
  position: relative;
  overflow: hidden;
}

.je-tab__track {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

/* 拖拽中的零头位移单独一层，两层 transform 叠加起来等价于主库的 calc() */
.je-tab__track-drag {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.je-tab__track,
.je-tab__track-drag {
  transition: transform var(--je-tab-duration, 300ms) var(--je-ease-out-back);
}

.je-tab.is-dragging .je-tab__track,
.je-tab.is-dragging .je-tab__track-drag,
.je-tab.is-static .je-tab__track,
.je-tab.is-static .je-tab__track-drag {
  transition: none;
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-visible / .is-dragging 这些状态类也列进来：它们的特异性比基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-tab__tab,
  .je-tab__line,
  .je-tab__line.is-visible,
  .je-tab__track,
  .je-tab__track-drag,
  .je-tab.is-dragging .je-tab__track,
  .je-tab.is-dragging .je-tab__track-drag {
    transition: none;
  }
}
</style>
