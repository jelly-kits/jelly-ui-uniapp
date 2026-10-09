<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import JeScrollbar from '../je-scrollbar/je-scrollbar.vue'
import { jeAnchorKey, type JeAnchorContext, type JeAnchorDirection } from './types'

defineOptions({ name: 'JeAnchor' })

const props = withDefaults(
  defineProps<{
    /** 滚动容器选择器，留空表示监听窗口（小程序端只支持页面滚动，此属性不生效） */
    container?: string
    /** 判定高亮的阈值：目标顶部进入容器该偏移内即视为当前项 */
    offset?: number
    /** 点击滚动后目标停留在容器顶部的位置，默认与 offset 一致 */
    targetOffset?: number
    direction?: JeAnchorDirection
  }>(),
  { container: '', offset: 0, direction: 'vertical' },
)

const emit = defineEmits<{
  change: [href: string]
  click: [href: string]
}>()

const activeHref = ref('')
/** 已登记的 href，顺序即子项在 DOM 中的顺序 */
const links = ref<string[]>([])

const direction = computed(() => props.direction)
/** 横向锚点在窄屏会超出容器，用 JeScrollbar 承担左右滑动 */
const isHorizontal = computed(() => props.direction === 'horizontal')

/* 减弱动效偏好：小程序端读不到 media query，一律按不减弱处理 */
let prefersReduced = false
// #ifdef H5
prefersReduced =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
// #endif

const registerLink = (href: string) => {
  if (!links.value.includes(href)) links.value = [...links.value, href]
}

const unregisterLink = (href: string) => {
  links.value = links.value.filter((item) => item !== href)
}

/* ---------------------------------- H5：真实 DOM ---------------------------------- */
// #ifdef H5
const queryScroller = (): HTMLElement | null => {
  if (!props.container) return null
  return document.querySelector<HTMLElement>(props.container)
}

const queryTarget = (href: string): HTMLElement | null => {
  if (!href) return null
  try {
    return document.querySelector<HTMLElement>(href)
  } catch {
    // href 不是合法选择器时静默跳过
    return null
  }
}

/** 取最后一个已越过阈值的目标作为当前项 */
const updateActive = () => {
  const scroller = queryScroller()
  const containerTop = scroller ? scroller.getBoundingClientRect().top : 0
  let current = ''
  links.value.forEach((href) => {
    const target = queryTarget(href)
    if (!target) return
    if (target.getBoundingClientRect().top - containerTop <= props.offset) current = href
  })
  activeHref.value = current
}

let scrollerEl: HTMLElement | null = null
const onScroll = () => updateActive()

const attach = () => {
  scrollerEl = queryScroller()
  if (scrollerEl) {
    scrollerEl.addEventListener('scroll', onScroll, { passive: true })
  } else {
    window.addEventListener('scroll', onScroll, { passive: true })
  }
  window.addEventListener('resize', onScroll, { passive: true })
  updateActive()
}

const detach = () => {
  if (scrollerEl) {
    scrollerEl.removeEventListener('scroll', onScroll)
  } else {
    window.removeEventListener('scroll', onScroll)
  }
  window.removeEventListener('resize', onScroll)
  scrollerEl = null
}
// #endif

/* -------------------------------- 小程序：量位置 + 轮询 -------------------------------- */
// #ifndef H5
/**
 * 小程序端读不到别的组件的内部状态，也没有页面滚动事件：
 * - 目标位置改成「页面绝对位置」记一次（boundingClientRect.top + 当前 scrollTop），
 *   滚动时它不变，所以只需轮询一个视口滚动量；
 * - 点击滚动只能驱动页面（uni.pageScrollTo），`container` 指向 scroll-view 时不生效。
 */
let pageTops: number[] = []
let pageScrollTop = 0
let pollTimer: ReturnType<typeof setInterval> | null = null

const applyActive = () => {
  let current = ''
  links.value.forEach((href, index) => {
    const top = pageTops[index]
    if (top === undefined || !Number.isFinite(top)) return
    if (top - pageScrollTop <= props.offset) current = href
  })
  activeHref.value = current
}

/** 读一次视口滚动量（小程序端没有页面滚动事件，只能主动查） */
const readScrollTop = (done?: (top: number) => void) => {
  uni
    .createSelectorQuery()
    .selectViewport()
    .scrollOffset((result) => {
      pageScrollTop = Number((result as unknown as { scrollTop?: number } | null)?.scrollTop ?? 0)
      done?.(pageScrollTop)
    })
    .exec()
}

/**
 * 测量一律走页面级查询（不套 `.in(instance.proxy)`）：锚点目标通常在页面模板里，
 * 不在 JeAnchor 自己的组件树内，组件级查询选不到。
 */
const measureTops = (done?: () => void) => {
  readScrollTop((scrollTop) => {
    const query = uni.createSelectorQuery()
    links.value.forEach((href) => query.select(href).boundingClientRect())
    query.exec((res) => {
      const list = Array.isArray(res) ? res : []
      pageTops = links.value.map((_, index) => {
        const rect = list[index] as unknown as { top?: number } | null
        return typeof rect?.top === 'number' ? rect.top + scrollTop : Number.POSITIVE_INFINITY
      })
      done?.()
    })
  })
}

const poll = () => {
  readScrollTop(() => {
    if (pageTops.length !== links.value.length) return
    applyActive()
  })
}
// #endif

/**
 * 点击后滚动到目标。两端各有一套实现：H5 直接操作 DOM，小程序只能驱动页面滚动。
 * 放在两个平台块之后，共享同一个函数名供 handleLinkClick 调用。
 */
const scrollTo = (href: string) => {
  const offset = props.targetOffset ?? props.offset
  // #ifdef H5
  const target = queryTarget(href)
  if (!target) return
  const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth'
  const targetTop = target.getBoundingClientRect().top
  const scroller = queryScroller()

  if (scroller) {
    const containerTop = scroller.getBoundingClientRect().top
    scroller.scrollTo({
      top: scroller.scrollTop + targetTop - containerTop - offset,
      behavior,
    })
  } else {
    window.scrollTo({ top: targetTop + window.scrollY - offset, behavior })
  }
  // #endif
  // #ifndef H5
  const index = links.value.indexOf(href)
  const top = pageTops[index]
  if (top === undefined || !Number.isFinite(top)) return
  uni.pageScrollTo({
    scrollTop: Math.max(0, top - offset),
    duration: prefersReduced ? 0 : 300,
  })
  // #endif
}

/** 点击：派发事件 + 滚动 + 立即给出高亮反馈 */
const handleLinkClick = (href: string) => {
  emit('click', href)
  scrollTo(href)
  if (activeHref.value !== href) activeHref.value = href
}

const context: JeAnchorContext = {
  activeHref,
  direction,
  registerLink,
  unregisterLink,
  scrollTo: handleLinkClick,
}
provide(jeAnchorKey, context)

/** 目标位置需要重新测量（H5 直接读 DOM，小程序要重新量表） */
const refreshActive = () => {
  // #ifdef H5
  updateActive()
  // #endif
  // #ifndef H5
  measureTops(applyActive)
  // #endif
}

// #ifdef H5
watch(() => props.container, () => {
  detach()
  attach()
})
// #endif

watch(links, refreshActive)
watch(() => props.offset, refreshActive)

watch(activeHref, (href) => {
  if (href) emit('change', href)
})

onMounted(() => {
  // #ifdef H5
  attach()
  // #endif
  // #ifndef H5
  measureTops(applyActive)
  pollTimer = setInterval(poll, 250)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  detach()
  // #endif
  // #ifndef H5
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  // #endif
})
</script>

<template>
  <view class="je-anchor" :class="`je-anchor--${direction}`" aria-label="锚点导航">
    <JeScrollbar v-if="isHorizontal">
      <view class="je-anchor__list">
        <slot />
      </view>
    </JeScrollbar>
    <view v-else class="je-anchor__list">
      <slot />
    </view>
  </view>
</template>

<style scoped>
.je-anchor {
  font-family: inherit;
}

.je-anchor__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.je-anchor--horizontal .je-anchor__list {
  flex-direction: row;
  gap: 6px;
  padding-bottom: 2px;
  /* 按内容宽度铺开，超出容器时交给 JeScrollbar 横向滚动 */
  width: max-content;
}
</style>