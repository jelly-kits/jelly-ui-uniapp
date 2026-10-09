<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type CSSProperties,
} from 'vue'
import { useUid } from '../../core/useUid'
import type { JeLazyloadFit, JeLazyloadProps } from './types'

defineOptions({ name: 'JeLazyload' })

const props = withDefaults(defineProps<JeLazyloadProps>(), {
  src: '',
  alt: '',
  rootMargin: '0px',
  loading: 'lazy',
  placeholder: '',
  error: '',
  objectFit: 'cover',
})

const emit = defineEmits<{
  /** 图片加载完成 */
  load: [event: Event]
  /** 图片加载失败（有兜底图时会触发两次：原图失败一次、兜底图再失败一次） */
  error: [event: Event]
}>()

const rootRef = ref<HTMLElement | null>(null)
const instance = getCurrentInstance()
/** 小程序端按选择器观察节点，各实例必须唯一 */
const uid = useUid('je-lazyload')

const inView = ref(false)
const failed = ref(false)
const usingFallback = ref(false)

/** eager 或已经进入视口才渲染真实图片，其余时间展示占位内容 */
const shouldRender = computed(() => props.loading === 'eager' || inView.value)

const currentSrc = computed(() => (usingFallback.value && props.error ? props.error : props.src))

const toPx = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}
  if (props.width !== undefined) style.width = toPx(props.width)
  if (props.height !== undefined) style.height = toPx(props.height)
  return style
})

/** <image> 用 mode 代替 CSS 的 object-fit（H5 上 uni 会把它还原成 object-fit） */
const IMAGE_MODE: Record<JeLazyloadFit, 'scaleToFill' | 'aspectFit' | 'aspectFill' | 'center'> = {
  fill: 'scaleToFill',
  contain: 'aspectFit',
  cover: 'aspectFill',
  none: 'center',
  'scale-down': 'aspectFit',
}

const imageMode = computed(() => IMAGE_MODE[props.objectFit] ?? 'aspectFill')

const onLoad = (event: Event) => {
  failed.value = false
  emit('load', event)
}

const onError = (event: Event) => {
  if (props.error && !usingFallback.value) {
    usingFallback.value = true
    emit('error', event)
    return
  }
  failed.value = true
  emit('error', event)
}

/* ------------------------------ 跨端视口相交检测 ------------------------------ */

/*
 * 主库用的是 H5 的 window 级 IntersectionObserver，小程序端没有这套 API。
 * 两端的「创建 → 命中即标记 → 卸载时断开」流程完全一致，只是建造方式不同，
 * 所以收口成一对共享函数，分派只发生在函数体内，靠条件编译实现。
 */
type LazyloadObserver = { disconnect: () => void }

let observer: LazyloadObserver | null = null

const unobserve = () => {
  observer?.disconnect()
  observer = null
}

const markInView = () => {
  inView.value = true
  unobserve()
}

// #ifdef H5
/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null
// #endif

/** rootMargin 的 CSS 简写（1~4 个值）摊平成四边像素值，小程序端的 relativeToViewport 只吃数字 */
const resolveViewportMargins = () => {
  const values = props.rootMargin
    .trim()
    .split(/\s+/)
    .map((token) => Number.parseFloat(token) || 0)
  const top = values[0] ?? 0
  const right = values[1] ?? top
  const bottom = values[2] ?? top
  const left = values[3] ?? right
  return { top, right, bottom, left }
}

const observe = () => {
  unobserve()

  // #ifdef H5
  // 浏览器不支持时退回「直接加载」，与主库一致
  if (typeof IntersectionObserver === 'undefined') {
    markInView()
    return
  }
  const target = pick(rootRef.value)
  const htmlObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) markInView()
    },
    { rootMargin: props.rootMargin },
  )
  if (target) htmlObserver.observe(target)
  observer = htmlObserver
  // #endif

  // #ifndef H5
  /*
   * 小程序端改用 uni 的相交观察器：以当前组件实例为作用域、按选择器命中根节点，
   * relativeToViewport 的 margins 就是 rootMargin 的等价物（正数同样是把视口往外扩）。
   */
  if (!instance?.proxy) {
    markInView()
    return
  }
  const scopedObserver = uni.createIntersectionObserver(instance.proxy, { thresholds: [0] })
  scopedObserver.relativeToViewport(resolveViewportMargins())
  scopedObserver.observe(`#${uid}`, (result) => {
    const info = result as unknown as { intersectionRatio?: number } | undefined
    if (info && (info.intersectionRatio ?? 0) > 0) markInView()
  })
  observer = scopedObserver
  // #endif
}

onMounted(() => {
  if (props.loading === 'eager') {
    inView.value = true
    return
  }
  // 小程序端要等节点进渲染树才查得到选择器
  nextTick(observe)
})

onBeforeUnmount(unobserve)
</script>

<template>
  <view
    :id="uid"
    ref="rootRef"
    class="je-lazyload"
    :class="{ 'is-error': failed }"
    :style="rootStyle"
  >
    <image
      v-if="shouldRender"
      class="je-lazyload__img"
      :src="currentSrc"
      :alt="alt"
      :mode="imageMode"
      @load="onLoad"
      @error="onError"
    />

    <slot v-else name="placeholder">
      <image
        v-if="placeholder"
        class="je-lazyload__img"
        :src="placeholder"
        :alt="alt"
        :mode="imageMode"
      />
      <view v-else class="je-lazyload__skeleton" aria-hidden="true" />
    </slot>

    <text v-if="failed && !error" class="je-lazyload__error">加载失败</text>
  </view>
</template>

<style scoped>
.je-lazyload {
  position: relative;
  display: block;
  overflow: hidden;
  box-sizing: border-box;
  font-family: inherit;
  background: var(--je-surface);
  border-radius: var(--je-radius-sm);
}

/* 填充方式交给 <image> 的 mode，H5 上 uni 会还原成 object-fit */
.je-lazyload__img {
  display: block;
  width: 100%;
  height: 100%;
}

.je-lazyload__skeleton {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 80px;
  background: linear-gradient(
    100deg,
    var(--je-surface) 30%,
    var(--je-surface-hover) 50%,
    var(--je-surface) 70%
  );
  background-size: 300% 100%;
  animation: je-lazyload-shimmer 1.4s ease-in-out infinite;
}

.je-lazyload__error {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--je-text-faint);
  text-align: center;
  background: rgba(0, 0, 0, 0.45);
}

@keyframes je-lazyload-shimmer {
  from {
    background-position: 150% 0;
  }

  to {
    background-position: -50% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-lazyload__skeleton {
    animation: none;
  }
}
</style>
