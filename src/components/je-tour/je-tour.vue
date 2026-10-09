<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import { useUid } from '../../core/useUid'
import JeButton from '../je-button/je-button.vue'
import type { JeTourStep } from './types'

defineOptions({ name: 'JeTour' })

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    steps: JeTourStep[]
    current?: number
  }>(),
  {
    modelValue: false,
    current: 0,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:current': [value: number]
  change: [current: number]
  finish: []
}>()

const uid = useUid('je-tour')
const bubbleRef = ref<HTMLElement | null>(null)
const isOpen = ref(props.modelValue)
const index = ref(props.current)
const zIndex = ref(nextZIndex())

/** 高亮框跟随的目标矩形（视口坐标）；拿不到目标时为 null，退化成整屏遮罩 + 居中气泡 */
const rect = ref<{ top: number; left: number; width: number; height: number } | null>(null)

const total = computed(() => props.steps.length)
const step = computed(() => props.steps[index.value])
/** 目标元素拿不到（未提供 / 测量失败）时的居中兜底 */
const centered = computed(() => !rect.value)

/** 方位的那条边与对齐方式，与 JePopover 同构，落位交给 CSS */
const fallbackPlacement = computed(() => step.value?.placement ?? 'bottom')
const side = computed(() => fallbackPlacement.value.split('-')[0])
const align = computed(() => fallbackPlacement.value.split('-')[1] ?? '')

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/**
 * 窄屏气泡横向铺满、垂直居中（移动端拿不到精确的纵向定位）。
 * 小程序端没有 window，恒按窄屏处理；H5 在挂载时按视口宽判一次
 * （口径与主库的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

/** 收口测量结果的写入：两端分支共用，避免条件编译里出现同名声明 */
const applyRect = (
  box: { top?: number; left?: number; width?: number; height?: number } | null | undefined,
) => {
  if (
    box &&
    typeof box.top === 'number' &&
    typeof box.left === 'number' &&
    typeof box.width === 'number' &&
    typeof box.height === 'number'
  ) {
    rect.value = { top: box.top, left: box.left, width: box.width, height: box.height }
    return
  }
  rect.value = null
}

/**
 * 测量目标元素矩形（视口坐标）。
 *
 * H5 直接读 DOM；小程序端没有 DOM，走**页面级** SelectorQuery —— 目标通常在页面模板里，
 * 不在 JeTour 自己的组件树内，套 `.in(proxy)` 会选不到（与 je-anchor 同款口径）。
 * 任何一端拿不到都置 null，退化成整屏遮罩 + 居中气泡，绝不伪造几何。
 */
const measureTarget = () => {
  const selector = step.value?.target
  if (!selector) {
    rect.value = null
    return
  }
  // #ifdef H5
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) {
    rect.value = null
    return
  }
  const box = el.getBoundingClientRect()
  applyRect({ top: box.top, left: box.left, width: box.width, height: box.height })
  // #endif
  // #ifndef H5
  uni
    .createSelectorQuery()
    .select(selector)
    .boundingClientRect((result) => {
      const info = (Array.isArray(result) ? result[0] : result) as unknown as
        | { top?: number; left?: number; width?: number; height?: number }
        | null
      applyRect(info)
    })
    .exec()
  // #endif
}

// #ifndef H5
let pollTimer: ReturnType<typeof setInterval> | null = null
// #endif

/** 打开期间让高亮框跟住目标：H5 监听滚动 / 缩放，小程序端没有滚动事件只能轮询 */
const startFollow = () => {
  // #ifdef H5
  window.addEventListener('resize', measureTarget)
  // 捕获阶段才能跟住任意滚动容器
  window.addEventListener('scroll', measureTarget, true)
  // #endif
  // #ifndef H5
  if (pollTimer === null) pollTimer = setInterval(measureTarget, 250)
  // #endif
}

const stopFollow = () => {
  // #ifdef H5
  window.removeEventListener('resize', measureTarget)
  window.removeEventListener('scroll', measureTarget, true)
  // #endif
  // #ifndef H5
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  // #endif
}

const wrapStyle = computed(() => ({ zIndex: zIndex.value }))

/** 目标缺失时让 `.is-centered` 的整屏遮罩生效，所以不挂内联矩形 */
const rectStyle = computed(() =>
  rect.value
    ? {
        top: `${rect.value.top}px`,
        left: `${rect.value.left}px`,
        width: `${rect.value.width}px`,
        height: `${rect.value.height}px`,
      }
    : undefined,
)

/** 目标矩形变化后重新量一次（等目标 DOM 布局完成） */
const syncTarget = () => {
  if (!isOpen.value) return
  void nextTick(measureTarget)
}

const setCurrent = (next: number) => {
  const clamped = Math.max(0, Math.min(next, total.value - 1))
  if (clamped === index.value) return
  index.value = clamped
  emit('update:current', clamped)
  emit('change', clamped)
}

const prev = () => setCurrent(index.value - 1)

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
  emit('update:modelValue', false)
}

const next = () => {
  if (index.value >= total.value - 1) {
    close()
    emit('finish')
    return
  }
  setCurrent(index.value + 1)
}

/* Esc 关闭与焦点管理只在 H5（桌面形态）成立；小程序端没有键盘事件 */
// #ifdef H5
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.stopPropagation()
  close()
}
// #endif

watch([isOpen, index], syncTarget)

watch(isOpen, (value) => {
  if (value) {
    zIndex.value = nextZIndex()
    startFollow()
    // #ifdef H5
    document.addEventListener('keydown', onKeydown)
    void nextTick(() => pick(bubbleRef.value)?.focus())
    // #endif
  } else {
    stopFollow()
    rect.value = null
    // #ifdef H5
    document.removeEventListener('keydown', onKeydown)
    // #endif
  }
})

watch(
  () => props.modelValue,
  (value) => {
    if (value !== isOpen.value) isOpen.value = value
  },
)

watch(
  () => props.current,
  (value) => {
    if (value !== index.value) index.value = value
  },
)

onMounted(() => {
  if (!isOpen.value) return
  startFollow()
  syncTarget()
})

onBeforeUnmount(() => {
  stopFollow()
  // #ifdef H5
  document.removeEventListener('keydown', onKeydown)
  // #endif
})
</script>

<template>
  <view
    class="je-tour"
    :class="{ 'is-open': isOpen, 'is-mobile': isMobile }"
    :style="wrapStyle"
    :aria-hidden="!isOpen"
  >
    <!-- 挖孔：目标矩形本身透明，靠超大 box-shadow 铺满四周形成遮罩（跨端可行，小程序端不支持 SVG mask） -->
    <view
      class="je-tour__hole"
      :class="{ 'is-centered': centered }"
      :style="rectStyle"
      aria-hidden="true"
    />

    <!-- 锚点壳体：定位到目标矩形，气泡在其内部按方位走纯 CSS 落位 -->
    <view class="je-tour__anchor" :style="rectStyle">
      <view
        ref="bubbleRef"
        class="je-tour__bubble"
        :class="[
          centered ? '' : `is-${side}`,
          !centered && align ? `is-align-${align}` : '',
          { 'is-centered': centered },
        ]"
        role="dialog"
        :aria-labelledby="step?.title ? `${uid}-title` : undefined"
        tabindex="-1"
      >
        <view class="je-tour__card">
          <text v-if="step?.title" :id="`${uid}-title`" class="je-tour__title">{{ step.title }}</text>
          <text v-if="step?.description" class="je-tour__desc">{{ step.description }}</text>

          <view class="je-tour__footer">
            <text class="je-tour__progress">{{ index + 1 }} / {{ total }}</text>
            <view class="je-tour__actions">
              <JeButton variant="ghost" :disabled="index === 0" @click="prev">上一步</JeButton>
              <JeButton @click="next">{{ index >= total - 1 ? '完成' : '下一步' }}</JeButton>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-tour {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 遮罩与气泡都不吃事件，页面仍可滚动查看目标 */
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.24s ease, visibility 0s linear 0.24s;
  /* 气泡与目标矩形的间距 */
  --je-tour-offset: 14px;
}

.je-tour.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.24s ease;
}

/* 挖孔：高亮框本身透明，用超大 box-shadow 铺满四周形成遮罩 */
.je-tour__hole {
  position: fixed;
  border-radius: var(--je-radius-sm);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
}

/* 目标缺失时退化成整屏遮罩 */
.je-tour__hole.is-centered {
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 0;
  box-shadow: none;
}

/* 锚点壳体：只把气泡的定位基准挪到目标矩形上，自身不可见、不吃事件 */
.je-tour__anchor {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
}

.je-tour__bubble {
  position: absolute;
  /* 气泡内容可交互，同级元素保持放行 */
  pointer-events: auto;
  outline: none;
}

/* 目标缺失：气泡在视口居中 */
.je-tour__bubble.is-centered {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* ---------------------------------- 方位 ---------------------------------- */

.je-tour__bubble.is-top {
  bottom: calc(100% + var(--je-tour-offset, 14px));
  left: 50%;
  transform: translateX(-50%);
}

.je-tour__bubble.is-top.is-align-start {
  left: 0;
  transform: none;
}

.je-tour__bubble.is-top.is-align-end {
  right: 0;
  left: auto;
  transform: none;
}

.je-tour__bubble.is-bottom {
  top: calc(100% + var(--je-tour-offset, 14px));
  left: 50%;
  transform: translateX(-50%);
}

.je-tour__bubble.is-bottom.is-align-start {
  left: 0;
  transform: none;
}

.je-tour__bubble.is-bottom.is-align-end {
  right: 0;
  left: auto;
  transform: none;
}

.je-tour__bubble.is-left {
  top: 50%;
  right: calc(100% + var(--je-tour-offset, 14px));
  transform: translateY(-50%);
}

.je-tour__bubble.is-left.is-align-start {
  top: 0;
  transform: none;
}

.je-tour__bubble.is-left.is-align-end {
  top: auto;
  bottom: 0;
  transform: none;
}

.je-tour__bubble.is-right {
  top: 50%;
  left: calc(100% + var(--je-tour-offset, 14px));
  transform: translateY(-50%);
}

.je-tour__bubble.is-right.is-align-start {
  top: 0;
  transform: none;
}

.je-tour__bubble.is-right.is-align-end {
  top: auto;
  bottom: 0;
  transform: none;
}

/* ---------------------------------- 卡片 ---------------------------------- */

.je-tour__card {
  box-sizing: border-box;
  width: 300px;
  max-width: calc(100vw - 24px);
  padding: 16px 18px;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--je-border);
  border-radius: var(--je-radius-lg);
  box-shadow: var(--je-shadow-popup);
  transform: scale(0.94);
  transition: transform 0.32s var(--je-ease-out-back);
}

.je-tour.is-open .je-tour__card {
  transform: scale(1);
}

/* 映射成 <text> 后是行内元素，行内元素上下 margin 不生效，显式转块 */
.je-tour__title {
  display: block;
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
}

.je-tour__desc {
  display: block;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--je-text-muted);
}

.je-tour__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.je-tour__progress {
  font-size: 12px;
  color: var(--je-text-faint);
  white-space: nowrap;
}

.je-tour__actions {
  display: flex;
  gap: 8px;
}

/* 气泡里空间有限，按钮收窄一档 */
.je-tour__actions :deep(.je-button) {
  padding: 9px 16px;
  font-size: 13px;
  border-radius: var(--je-radius-sm);
}

/* 窄屏：气泡横向铺满、垂直居中；按钮热区不小于 44px */
.je-tour.is-mobile .je-tour__bubble,
.je-tour.is-mobile .je-tour__bubble.is-centered {
  position: fixed;
  top: 50%;
  right: 12px;
  bottom: auto;
  left: 12px;
  transform: translateY(-50%);
}

.je-tour.is-mobile .je-tour__card {
  width: 100%;
  max-width: none;
}

.je-tour.is-mobile .je-tour__actions :deep(.je-button) {
  flex: 1;
  min-height: 44px;
  padding: 12px 18px;
  font-size: 15px;
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-tour,
  .je-tour.is-open,
  .je-tour__card {
    transition: none;
  }
}
</style>
