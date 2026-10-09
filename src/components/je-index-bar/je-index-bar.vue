<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { jeIndexBarKey, type JeIndexAnchorItem } from './types'

defineOptions({ name: 'JeIndexBar' })

const props = withDefaults(
  defineProps<{
    /** 右侧索引列表 */
    indexList?: (string | number)[]
    /** 锚点头部是否吸顶 */
    sticky?: boolean
    /** 吸顶时距离容器顶部的距离 */
    stickyOffsetTop?: number
    /** 高亮项的背景色，传任意 CSS 颜色 */
    highlightColor?: string
  }>(),
  {
    indexList: () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    sticky: true,
    stickyOffsetTop: 0,
    highlightColor: undefined,
  },
)

const emit = defineEmits<{
  /** 点击某个索引 */
  select: [index: string | number]
  /** 当前高亮索引发生变化 */
  change: [index: string | number]
}>()

const instance = getCurrentInstance()

const contentRef = ref<HTMLElement | null>(null)
const active = ref<string | number | ''>('')

/** 锚点按挂载顺序入列，与 DOM 顺序一致，滚动判定才能提前 break */
let anchorList: JeIndexAnchorItem[] = []
let scrollerEl: HTMLElement | null = null

const sticky = computed(() => props.sticky)
const stickyOffsetTop = computed(() => props.stickyOffsetTop)

const rootStyle = computed(() =>
  props.highlightColor ? { '--je-index-bar-highlight': props.highlightColor } : undefined,
)

const register = (item: JeIndexAnchorItem) => {
  anchorList = anchorList.filter((anchor) => anchor.index !== item.index)
  anchorList.push(item)
  // #ifndef H5
  scheduleMeasure()
  // #endif
}

const unregister = (index: string | number) => {
  anchorList = anchorList.filter((anchor) => anchor.index !== index)
  // #ifndef H5
  scheduleMeasure()
  // #endif
}

/* ---------------------------------- H5：真实 DOM ---------------------------------- */
// #ifdef H5
const scrollerTop = () => (scrollerEl ? scrollerEl.getBoundingClientRect().top : 0)

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/** 向上找最近的可滚动祖先，找不到就回退到 window */
const getScroller = (): HTMLElement | null => {
  let el = pick(contentRef.value)?.parentElement ?? null
  while (el) {
    const overflowY = window.getComputedStyle(el).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return el
    el = el.parentElement
  }
  return null
}

/** 把 data 属性里的字符串还原成 indexList 中的原始值（可能是数字） */
const resolveIndex = (raw: string | null | undefined): string | number | '' => {
  if (!raw) return ''
  const found = props.indexList.find((item) => String(item) === raw)
  return found === undefined ? '' : found
}

const pickFromPoint = (clientX: number, clientY: number) => {
  const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  return resolveIndex(el?.closest('[data-je-index]')?.getAttribute('data-je-index'))
}
// #endif

/* -------------------------------- 小程序：折算下标 + 轮询 -------------------------------- */
// #ifndef H5
/**
 * 小程序端没有 elementFromPoint，父级也跨组件查不到锚点节点：
 * - 索引条本身等高排列，触点 y 坐标除以单项高度即可折算出下标；
 * - 锚点位置由锚点自查（measureTop）回报，父级只负责轮询视口滚动量。
 */
let anchorTops: number[] = []
let viewportScrollTop = 0
let barRect: { top: number; height: number } | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let measureScheduled = false

const readScrollTop = (done?: (top: number) => void) => {
  uni
    .createSelectorQuery()
    .selectViewport()
    .scrollOffset((result) => {
      viewportScrollTop = Number(
        (result as unknown as { scrollTop?: number } | null)?.scrollTop ?? 0,
      )
      done?.(viewportScrollTop)
    })
    .exec()
}

/** 索引条自身的位置与高度，用于把触点折算成下标 */
const measureBar = () => {
  if (!instance?.proxy) return
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-index-bar__index')
    .boundingClientRect((result) => {
      const rect = result as unknown as { top?: number; height?: number } | null
      barRect =
        rect && typeof rect.top === 'number' && typeof rect.height === 'number'
          ? { top: rect.top, height: rect.height }
          : null
    })
    .exec()
}

const pickIndex = (clientY: number): string | number | '' => {
  const total = props.indexList.length
  if (!barRect || total === 0 || barRect.height <= 0) return ''
  const step = barRect.height / total
  const offset = Math.floor((clientY - barRect.top) / step)
  const clamped = Math.min(total - 1, Math.max(0, offset))
  return props.indexList[clamped] ?? ''
}

/** 让每个锚点量出自己的页面绝对位置，全部回报后再刷新高亮 */
const measureTops = (done?: () => void) => {
  readScrollTop((scrollTop) => {
    const total = anchorList.length
    if (total === 0) {
      anchorTops = []
      done?.()
      return
    }
    const next = new Array<number>(total).fill(Number.POSITIVE_INFINITY)
    let left = total
    const finish = () => {
      left -= 1
      if (left > 0) return
      anchorTops = next
      done?.()
    }
    anchorList.forEach((item, index) => {
      if (!item.measureTop) {
        finish()
        return
      }
      item.measureTop(scrollTop, (top) => {
        next[index] = top
        finish()
      })
    })
  })
}

/** 锚点增删时合并到同一帧重新测量，避免逐个锚点各查一轮 */
const scheduleMeasure = () => {
  if (measureScheduled) return
  measureScheduled = true
  nextTick(() => {
    measureScheduled = false
    measureTops(updateActive)
  })
}

const poll = () => {
  readScrollTop(() => {
    if (anchorTops.length !== anchorList.length) return
    updateActive()
  })
}
// #endif

/* --------------------------------- 两端共用：高亮与滚动 --------------------------------- */
const updateActive = () => {
  let current: string | number | '' = active.value
  // #ifdef H5
  const base = scrollerTop()
  for (const item of anchorList) {
    const el = item.getEl()
    if (!el) continue
    const top = el.getBoundingClientRect().top - base
    if (top - props.stickyOffsetTop <= 1) current = item.index
    else break
  }
  // #endif
  // #ifndef H5
  for (let index = 0; index < anchorList.length; index += 1) {
    const top = anchorTops[index]
    if (top === undefined || !Number.isFinite(top)) continue
    if (top - viewportScrollTop - props.stickyOffsetTop <= 1) current = anchorList[index].index
    else break
  }
  // #endif
  if (current !== active.value) {
    active.value = current
    if (current !== '') emit('change', current)
  }
}

const scrollToIndex = (target: string | number) => {
  const index = anchorList.findIndex((anchor) => anchor.index === target)
  if (index < 0) return
  // #ifdef H5
  const el = anchorList[index].getEl()
  if (!el) return
  const delta = el.getBoundingClientRect().top - scrollerTop() - props.stickyOffsetTop
  if (scrollerEl) scrollerEl.scrollTop += delta
  else window.scrollBy(0, delta)
  // #endif
  // #ifndef H5
  const top = anchorTops[index]
  if (top === undefined || !Number.isFinite(top)) return
  uni.pageScrollTo({ scrollTop: Math.max(0, top - props.stickyOffsetTop), duration: 0 })
  // #endif
}

const select = (index: string | number) => {
  const changed = active.value !== index
  active.value = index
  emit('select', index)
  if (changed) emit('change', index)
  scrollToIndex(index)
}

const onIndexTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  let index: string | number | '' = ''
  // #ifdef H5
  index = pickFromPoint(touch.clientX, touch.clientY)
  // #endif
  // #ifndef H5
  index = pickIndex(touch.clientY)
  // #endif
  if (index !== '') select(index)
}

const onIndexTouchMove = (event: TouchEvent) => {
  // 手指在索引条上滑动时不要带动页面滚动
  // #ifdef H5
  if (event.cancelable) event.preventDefault()
  // #endif
  const touch = event.touches[0]
  if (!touch) return
  let index: string | number | '' = ''
  // #ifdef H5
  index = pickFromPoint(touch.clientX, touch.clientY)
  // #endif
  // #ifndef H5
  index = pickIndex(touch.clientY)
  // #endif
  if (index !== '' && index !== active.value) select(index)
}

provide(jeIndexBarKey, {
  active,
  sticky,
  stickyOffsetTop,
  register,
  unregister,
  select,
})

onMounted(() => {
  // #ifdef H5
  scrollerEl = getScroller()
  const target: EventTarget = scrollerEl ?? window
  target.addEventListener('scroll', updateActive, { passive: true })
  window.addEventListener('resize', updateActive)
  nextTick(updateActive)
  // #endif
  // #ifndef H5
  measureBar()
  scheduleMeasure()
  pollTimer = setInterval(poll, 250)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  const target: EventTarget = scrollerEl ?? window
  target.removeEventListener('scroll', updateActive)
  window.removeEventListener('resize', updateActive)
  // #endif
  // #ifndef H5
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  // #endif
})
</script>

<template>
  <view class="je-index-bar" :style="rootStyle">
    <view ref="contentRef" class="je-index-bar__content">
      <slot />
    </view>

    <view
      class="je-index-bar__index"
      aria-label="索引"
      @touchstart="onIndexTouchStart"
      @touchmove.stop.prevent="onIndexTouchMove"
    >
      <view
        v-for="item in indexList"
        :key="item"
        class="je-index-bar__item"
        :class="{ 'is-active': active === item }"
        :data-je-index="item"
        @tap="select(item)"
      >
        {{ item }}
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-index-bar {
  position: relative;
  display: flex;
  font-family: inherit;
  /* 索引条固定定位后脱离文档流，这里预留出与它等宽的右侧空间，文字不会被字母压住 */
  padding-right: 38px;
  --je-index-bar-highlight: var(--je-primary);
}

.je-index-bar__content {
  flex: 1 1 auto;
  min-width: 0;
}

/*
 * 固定定位而不是随内容一起滚：内容区再长，索引条也始终贴在可视区域右侧并垂直居中。
 * 与内容同高的话（flex 等分或 sticky），字母会被 26 项撑到超出滚动区、滚动时跟着划走。
 */
.je-index-bar__index {
  position: fixed;
  top: 50%;
  right: 6px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-height: 90vh;
  margin: 0;
  padding: 8px 6px;
  list-style: none;
  transform: translateY(-50%);
  /* 圆角胶囊底：字母不再直接压在内容上，明暗主题下都看得清 */
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: 999px;
  box-shadow: var(--je-shadow-popup);
  /* 手势由本节点的 touchmove 接管，禁止浏览器把它当成滚动 */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.je-index-bar__item {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  font-size: 11px;
  line-height: 1;
  color: var(--je-text-muted);
  cursor: pointer;
  border-radius: 50%;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

.je-index-bar__item.is-active {
  color: #fff;
  background: var(--je-index-bar-highlight);
}

@media (max-width: 768px) {
  /* 索引条本身是连续的滑动热区，单点热区不小于 20px 即可 */
  .je-index-bar {
    /* 字母变大后同步加宽右侧预留，避免压到内容 */
    padding-right: 44px;
  }

  .je-index-bar__index {
    right: 4px;
    padding: 8px 5px;
  }

  .je-index-bar__item {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }
}
</style>