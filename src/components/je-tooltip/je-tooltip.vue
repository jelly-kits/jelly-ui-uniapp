<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import { useUid } from '../../core/useUid'
import type { JeTooltipPlacement } from './types'

/*
 * 主库用 inheritAttrs: false + v-bind="$attrs" 把 class / 监听器透传到触发元素上；
 * 小程序端不支持对象形式的 v-bind（编译报 `v-bind="" is not supported`），
 * 这里改为默认的透传行为，属性落在根节点 .je-tooltip 上。
 */
defineOptions({ name: 'JeTooltip' })

const props = withDefaults(
  defineProps<{
    /** 文本内容，也可用 #content 插槽自定义 */
    content?: string
    placement?: JeTooltipPlacement
    disabled?: boolean
    /** 与触发元素的间距 */
    offset?: number
    /** 移入后延迟展开（毫秒） */
    openDelay?: number
    /** 移出后延迟收起（毫秒） */
    closeDelay?: number
  }>(),
  {
    content: '',
    placement: 'top',
    disabled: false,
    offset: 10,
    openDelay: 120,
    closeDelay: 80,
  },
)

const uid = useUid('je-tooltip')
const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const zIndex = ref(nextZIndex())

/**
 * 窄屏没有 hover，改成点一下切换。
 * 小程序端没有 window，恒按窄屏处理；H5 在挂载时按视口宽判一次
 * （口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

/** 方位的那条边，决定面板朝哪边长 */
const side = computed(() => props.placement.split('-')[0])
/** 对齐方式：start 贴起始边、end 贴结束边，缺省居中 */
const align = computed(() => props.placement.split('-')[1] ?? '')

const panelStyle = computed(() => ({ zIndex: zIndex.value }))

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

const clearTimers = () => {
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const show = () => {
  if (props.disabled) return
  clearTimers()
  openTimer = setTimeout(() => {
    openTimer = null
    zIndex.value = nextZIndex()
    isOpen.value = true
  }, props.openDelay)
}

const hide = () => {
  clearTimers()
  closeTimer = setTimeout(() => {
    closeTimer = null
    isOpen.value = false
  }, props.closeDelay)
}

const closeNow = () => {
  clearTimers()
  isOpen.value = false
}

/** 桌面端悬停进出，窄屏没有 hover，这两个事件不会触发 */
const onTriggerEnter = () => {
  if (isMobile.value) return
  show()
}

const onTriggerLeave = () => {
  if (isMobile.value) return
  hide()
}

/**
 * 窄屏点一下切换；桌面端点击不介入，避免干扰触发元素自身的点击行为。
 * 这也是小程序端唯一的开关通道。
 */
const onTriggerClick = () => {
  if (!isMobile.value || props.disabled) return
  clearTimers()
  if (isOpen.value) {
    isOpen.value = false
    return
  }
  zIndex.value = nextZIndex()
  isOpen.value = true
}

/* 点外部关闭：H5 走文档级 pointerdown；小程序端没有 document，只能再点一次触发元素收起 */
// #ifdef H5
/** H5 下模板 ref 指向的是 uni-view 实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const el = pick(rootRef.value)
  const target = event.target as Node | null
  if (el && target && el.contains(target)) return
  closeNow()
}

onMounted(() => {
  if (!isMobile.value) return
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
// #endif

onBeforeUnmount(() => {
  clearTimers()
  // #ifdef H5
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  // #endif
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-tooltip"
    :class="`je-tooltip--${side}`"
    :style="{ '--je-tooltip-offset': `${offset}px` }"
  >
    <view
      class="je-tooltip__trigger"
      :aria-describedby="isOpen ? uid : undefined"
      @mouseenter="onTriggerEnter"
      @mouseleave="onTriggerLeave"
      @click="onTriggerClick"
    >
      <slot />
    </view>

    <view
      :id="uid"
      class="je-tooltip__panel"
      :class="[`is-${side}`, align ? `is-align-${align}` : '', { 'is-open': isOpen }]"
      :style="panelStyle"
      role="tooltip"
      :aria-hidden="!isOpen"
    >
      <text class="je-tooltip__text">
        <slot name="content">{{ content }}</slot>
      </text>
      <view class="je-tooltip__arrow" aria-hidden="true" />
    </view>
  </view>
</template>

<style scoped>
.je-tooltip {
  position: relative;
  display: inline-flex;
  font-family: inherit;
}

.je-tooltip__trigger {
  display: inline-flex;
  align-items: center;
  font-family: inherit;
}

/* 收起态用 visibility 常驻 DOM，切 display 会让过渡失效 */
.je-tooltip__panel {
  position: absolute;
  z-index: 2000;
  box-sizing: border-box;
  /*
   * 面板相对内联触发器做绝对定位，不写 width 时可用宽度只剩触发器的一半，
   * 文案会被挤成一两个字一行。按内容撑开，超过上限再换行。
   */
  width: max-content;
  max-width: 320px;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  box-shadow: var(--je-shadow-popup);
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  visibility: hidden;
  transition: transform 0.24s ease-in, opacity 0.18s ease-in, visibility 0s linear 0.24s;
}

.je-tooltip__panel.is-open {
  opacity: 1;
  visibility: visible;
  transition: transform 0.28s var(--je-ease-out-back), opacity 0.18s ease-out;
}

.je-tooltip__text {
  display: block;
  word-break: break-word;
}

/* ---------------------------------- 方位 ---------------------------------- */
/* 从触发元素那一侧「长出来」，缩放原点要贴住箭头 */

.je-tooltip__panel.is-top {
  bottom: calc(100% + var(--je-tooltip-offset, 10px));
  left: 50%;
  transform-origin: bottom center;
  transform: translateX(-50%) scale(0.9);
}

.je-tooltip__panel.is-top.is-open {
  transform: translateX(-50%) scale(1);
}

.je-tooltip__panel.is-top.is-align-start {
  left: 0;
  transform-origin: bottom left;
  transform: scale(0.9);
}

.je-tooltip__panel.is-top.is-align-start.is-open {
  transform: scale(1);
}

.je-tooltip__panel.is-top.is-align-end {
  right: 0;
  left: auto;
  transform-origin: bottom right;
  transform: scale(0.9);
}

.je-tooltip__panel.is-top.is-align-end.is-open {
  transform: scale(1);
}

.je-tooltip__panel.is-bottom {
  top: calc(100% + var(--je-tooltip-offset, 10px));
  left: 50%;
  transform-origin: top center;
  transform: translateX(-50%) scale(0.9);
}

.je-tooltip__panel.is-bottom.is-open {
  transform: translateX(-50%) scale(1);
}

.je-tooltip__panel.is-bottom.is-align-start {
  left: 0;
  transform-origin: top left;
  transform: scale(0.9);
}

.je-tooltip__panel.is-bottom.is-align-start.is-open {
  transform: scale(1);
}

.je-tooltip__panel.is-bottom.is-align-end {
  right: 0;
  left: auto;
  transform-origin: top right;
  transform: scale(0.9);
}

.je-tooltip__panel.is-bottom.is-align-end.is-open {
  transform: scale(1);
}

.je-tooltip__panel.is-left {
  top: 50%;
  right: calc(100% + var(--je-tooltip-offset, 10px));
  transform-origin: right center;
  transform: translateY(-50%) scale(0.9);
}

.je-tooltip__panel.is-left.is-open {
  transform: translateY(-50%) scale(1);
}

.je-tooltip__panel.is-left.is-align-start {
  top: 0;
  transform-origin: right top;
  transform: scale(0.9);
}

.je-tooltip__panel.is-left.is-align-start.is-open {
  transform: scale(1);
}

.je-tooltip__panel.is-left.is-align-end {
  top: auto;
  bottom: 0;
  transform-origin: right bottom;
  transform: scale(0.9);
}

.je-tooltip__panel.is-left.is-align-end.is-open {
  transform: scale(1);
}

.je-tooltip__panel.is-right {
  top: 50%;
  left: calc(100% + var(--je-tooltip-offset, 10px));
  transform-origin: left center;
  transform: translateY(-50%) scale(0.9);
}

.je-tooltip__panel.is-right.is-open {
  transform: translateY(-50%) scale(1);
}

.je-tooltip__panel.is-right.is-align-start {
  top: 0;
  transform-origin: left top;
  transform: scale(0.9);
}

.je-tooltip__panel.is-right.is-align-start.is-open {
  transform: scale(1);
}

.je-tooltip__panel.is-right.is-align-end {
  top: auto;
  bottom: 0;
  transform-origin: left bottom;
  transform: scale(0.9);
}

.je-tooltip__panel.is-right.is-align-end.is-open {
  transform: scale(1);
}

/* ------------------------------- 箭头 ------------------------------- */
/* 旋转 45° 的小方块，只画朝外的两条边 */

.je-tooltip__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--je-popup);
  border: 1px solid var(--je-border-color);
}

.je-tooltip__panel.is-top .je-tooltip__arrow {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-top: none;
  border-left: none;
}

.je-tooltip__panel.is-top.is-align-start .je-tooltip__arrow {
  left: 14px;
}

.je-tooltip__panel.is-top.is-align-end .je-tooltip__arrow {
  right: 14px;
  left: auto;
}

.je-tooltip__panel.is-bottom .je-tooltip__arrow {
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-right: none;
  border-bottom: none;
}

.je-tooltip__panel.is-bottom.is-align-start .je-tooltip__arrow {
  left: 14px;
}

.je-tooltip__panel.is-bottom.is-align-end .je-tooltip__arrow {
  right: 14px;
  left: auto;
}

.je-tooltip__panel.is-left .je-tooltip__arrow {
  top: 50%;
  right: -6px;
  transform: translateY(-50%) rotate(45deg);
  border-bottom: none;
  border-left: none;
}

.je-tooltip__panel.is-left.is-align-start .je-tooltip__arrow {
  top: 14px;
}

.je-tooltip__panel.is-left.is-align-end .je-tooltip__arrow {
  top: auto;
  bottom: 14px;
}

.je-tooltip__panel.is-right .je-tooltip__arrow {
  top: 50%;
  left: -6px;
  transform: translateY(-50%) rotate(45deg);
  border-top: none;
  border-right: none;
}

.je-tooltip__panel.is-right.is-align-start .je-tooltip__arrow {
  top: 14px;
}

.je-tooltip__panel.is-right.is-align-end .je-tooltip__arrow {
  top: auto;
  bottom: 14px;
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-tooltip__panel,
  .je-tooltip__panel.is-open {
    transition: none;
  }
}
</style>
