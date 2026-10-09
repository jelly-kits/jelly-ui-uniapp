<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from 'vue'
import type { JeAffixProps } from './types'

defineOptions({ name: 'JeAffix' })

const props = withDefaults(defineProps<JeAffixProps>(), {
  offset: 0,
  target: '',
  position: 'top',
})

const emit = defineEmits<{ change: [fixed: boolean] }>()

const rootRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const instance = getCurrentInstance()

const fixed = ref(false)
/** 固定后距视口上 / 下的距离 */
const fixedOffset = ref(0)
const fixedLeft = ref(0)
const width = ref(0)
const height = ref(0)

/** 占位元素顶住原高度，元素固定后页面不会跳动 */
const rootStyle = computed<CSSProperties | undefined>(() =>
  fixed.value ? { width: `${width.value}px`, height: `${height.value}px` } : undefined,
)

const contentStyle = computed<CSSProperties | undefined>(() => {
  if (!fixed.value) return undefined
  const style: CSSProperties = {
    position: 'fixed',
    left: `${fixedLeft.value}px`,
    width: `${width.value}px`,
  }
  if (props.position === 'bottom') style.bottom = `${fixedOffset.value}px`
  else style.top = `${fixedOffset.value}px`
  if (props.zIndex !== undefined) style.zIndex = props.zIndex
  return style
})

/* ---------------------------------- H5：真实 DOM ---------------------------------- */
// #ifdef H5
let observer: ResizeObserver | null = null
let targetEl: HTMLElement | Window | null = null

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const resolveTarget = (): HTMLElement | Window => {
  if (props.target) {
    const el = document.querySelector<HTMLElement>(props.target)
    if (el) return el
  }
  return window
}

const update = () => {
  const rootEl = pick(rootRef.value)
  const contentEl = pick(contentRef.value)
  if (!rootEl || !contentEl || typeof rootEl.getBoundingClientRect !== 'function') return

  const target = resolveTarget()
  const rootRect = rootEl.getBoundingClientRect()
  const targetRect = target instanceof Window ? null : target.getBoundingClientRect()
  const targetTop = targetRect ? targetRect.top : 0
  const targetBottom = targetRect ? targetRect.bottom : window.innerHeight

  // 占位元素始终留在文档流里，量到的就是内容的原始尺寸
  width.value = rootRect.width
  height.value = contentEl.offsetHeight

  const shouldFix =
    props.position === 'bottom'
      ? rootRect.bottom >= targetBottom - props.offset
      : rootRect.top <= targetTop + props.offset

  fixedOffset.value =
    props.position === 'bottom'
      ? window.innerHeight - targetBottom + props.offset
      : targetTop + props.offset
  fixedLeft.value = rootRect.left

  if (shouldFix !== fixed.value) {
    fixed.value = shouldFix
    emit('change', shouldFix)
  }
}

const observe = () => {
  if (typeof ResizeObserver === 'undefined') return
  observer?.disconnect()
  observer = new ResizeObserver(update)
  const rootEl = pick(rootRef.value)
  if (rootEl) observer.observe(rootEl)
  if (targetEl instanceof HTMLElement) observer.observe(targetEl)
}

const bind = () => {
  targetEl = resolveTarget()
  // 捕获阶段才能听到任意滚动容器（含 target 自身）的滚动
  window.addEventListener('scroll', update, true)
  window.addEventListener('resize', update)
  observe()
  update()
}

const unbind = () => {
  window.removeEventListener('scroll', update, true)
  window.removeEventListener('resize', update)
  observer?.disconnect()
  observer = null
  targetEl = null
}
// #endif

/* ------------------------------- 小程序：视口相交观察 ------------------------------- */
// #ifndef H5
let intersection: UniApp.IntersectionObserver | null = null

/**
 * 小程序端读不到任意容器相对视口的位置，因此只按视口吸附，`target` 属性在此端不生效。
 *
 * 做法：在组件内放一个 1px 的绝对定位哨兵，位置由 offset 决定：
 *  - position='top'    → 哨兵在组件顶边上方 offset 处
 *  - position='bottom' → 哨兵在组件底边下方 offset 处
 * 用 relativeToViewport() 观察哨兵（观察区域就是整个视口），
 * 哨兵被滚出视口即说明组件已越过吸附线，该判据与 margins 的正负号语义无关。
 */
const sentinelStyle = computed<CSSProperties>(() =>
  props.position === 'bottom' ? { bottom: `-${props.offset}px` } : { top: `-${props.offset}px` },
)

/** 垂直滚动不会改变 left / width / height，量一次即可复用 */
const measure = () => {
  if (!instance?.proxy) return
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-affix')
    .boundingClientRect()
    .exec((res) => {
      const rect = res?.[0] as unknown as
        | { width?: number; height?: number; left?: number }
        | null
        | undefined
      if (!rect) return
      width.value = rect.width ?? 0
      fixedLeft.value = rect.left ?? 0
      // 未固定时根节点高度即内容高度；固定后 rootStyle 已把高度锁住，不再覆盖
      if (!fixed.value) height.value = rect.height ?? 0
    })
}

const bindObserver = () => {
  if (!instance?.proxy) return
  intersection?.disconnect()
  intersection = uni.createIntersectionObserver(instance.proxy, { thresholds: [0] })
  intersection.relativeToViewport()
  intersection.observe('.je-affix__sentinel', (result) => {
    const info = result as unknown as {
      intersectionRatio?: number
      boundingClientRect?: { top: number; bottom: number }
    }
    const rect = info?.boundingClientRect
    if (!rect) return

    const ratio = info.intersectionRatio ?? 0
    const shouldFix =
      props.position === 'bottom'
        ? ratio === 0 && rect.top >= 0
        : ratio === 0 && rect.bottom <= 0

    fixedOffset.value = props.offset
    if (shouldFix !== fixed.value) {
      fixed.value = shouldFix
      emit('change', shouldFix)
    }
  })
}

// 取消固定后重新量一次自然高度，内容变化时也能跟上
watch(fixed, (value) => {
  if (!value) nextTick(measure)
})
// #endif

// #ifdef H5
watch(() => props.target, bind)
// #endif

watch(
  () => [props.offset, props.position] as const,
  () => {
    // #ifdef H5
    update()
    // #endif
    // #ifndef H5
    nextTick(() => {
      measure()
      bindObserver()
    })
    // #endif
  },
)

onMounted(() => {
  // #ifdef H5
  bind()
  // #endif
  // #ifndef H5
  nextTick(() => {
    measure()
    bindObserver()
  })
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  unbind()
  // #endif
  // #ifndef H5
  intersection?.disconnect()
  intersection = null
  // #endif
})
</script>

<template>
  <view ref="rootRef" class="je-affix" :style="rootStyle">
    <!-- #ifndef H5 -->
    <view class="je-affix__sentinel" :style="sentinelStyle" />
    <!-- #endif -->
    <view
      ref="contentRef"
      class="je-affix__content"
      :class="{ 'is-fixed': fixed }"
      :style="contentStyle"
    >
      <slot />
    </view>
  </view>
</template>

<style scoped>
.je-affix,
.je-affix__content {
  box-sizing: border-box;
}

.je-affix__content.is-fixed {
  z-index: 100;
}

/* #ifndef H5 */
.je-affix {
  position: relative;
}

.je-affix__sentinel {
  position: absolute;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
/* #endif */
</style>