<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import { useUid } from '../../core/useUid'
import type { JePlacementValue } from '../../core/placement'
import type { JePopoverTrigger } from './types'

defineOptions({ name: 'JePopover' })

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    /** 桌面端触发方式；窄屏一律改为点击切换 */
    trigger?: JePopoverTrigger
    placement?: JePlacementValue
    title?: string
    /** 数字按 px 处理 */
    width?: string | number
    disabled?: boolean
    /** 与触发元素的间距 */
    offset?: number
  }>(),
  {
    modelValue: false,
    trigger: 'hover',
    placement: 'bottom',
    title: '',
    width: 260,
    disabled: false,
    offset: 10,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  show: []
  hide: []
}>()

const uid = useUid('je-popover')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(props.modelValue)
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

const panelStyle = computed(() => ({
  zIndex: zIndex.value,
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

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

const open = () => {
  if (props.disabled || isOpen.value) return
  clearTimers()
  zIndex.value = nextZIndex()
  isOpen.value = true
  emit('update:modelValue', true)
  emit('show')
}

const close = () => {
  if (!isOpen.value) return
  clearTimers()
  isOpen.value = false
  emit('update:modelValue', false)
  emit('hide')
}

/** 悬停进出都留一点缓冲，鼠标掠过时不会反复闪 */
const scheduleOpen = () => {
  clearTimers()
  openTimer = setTimeout(() => {
    openTimer = null
    open()
  }, 80)
}

const scheduleClose = () => {
  clearTimers()
  closeTimer = setTimeout(() => {
    closeTimer = null
    close()
  }, 80)
}

watch(
  () => props.modelValue,
  (value) => {
    if (value === isOpen.value) return
    if (value) {
      zIndex.value = nextZIndex()
      isOpen.value = true
      emit('show')
    } else {
      isOpen.value = false
      emit('hide')
    }
  },
)

const onTriggerEnter = () => {
  if (isMobile.value || props.trigger !== 'hover' || props.disabled) return
  scheduleOpen()
}

const onTriggerLeave = () => {
  if (isMobile.value || props.trigger !== 'hover') return
  scheduleClose()
}

const onPanelEnter = () => {
  if (!isMobile.value) clearTimers()
}

const onPanelLeave = () => {
  if (!isMobile.value && props.trigger === 'hover') scheduleClose()
}

/** 桌面端点击触发才切换；悬停触发时点击不介入，避免干扰触发元素自身行为 */
const onTriggerClick = () => {
  if (props.disabled) return
  if (!isMobile.value && props.trigger !== 'click') return
  if (isOpen.value) close()
  else open()
}

const onFocusOut = (event: FocusEvent) => {
  if (!isOpen.value) return
  const next = event.relatedTarget as Node | null
  // relatedTarget 为 null 说明焦点落到了不可聚焦处（鼠标点击面板文本），此时不应收起
  if (!next) return
  const trigger = pick(triggerRef.value)
  const panel = pick(panelRef.value)
  if (trigger?.contains(next) || panel?.contains(next)) return
  close()
}

/** H5 下模板 ref 指向的是 uni-view 实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/* 点外部关闭与 Esc 只在 H5（桌面浮层形态）成立；小程序端没有 document，只能再点一次触发元素收起 */
// #ifdef H5
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.stopPropagation()
  close()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const root = pick(rootRef.value)
  const target = event.target as Node | null
  if (root && target && root.contains(target)) return
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onKeydown)
})
// #endif

onBeforeUnmount(() => {
  clearTimers()
  // #ifdef H5
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onKeydown)
  // #endif
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-popover"
    :class="`je-popover--${side}`"
    :style="{ '--je-popover-offset': `${offset}px` }"
  >
    <view
      ref="triggerRef"
      class="je-popover__trigger"
      :aria-expanded="isOpen"
      :aria-controls="uid"
      @mouseenter="onTriggerEnter"
      @mouseleave="onTriggerLeave"
      @focusout="onFocusOut"
      @click="onTriggerClick"
    >
      <slot />
    </view>

    <view
      :id="uid"
      ref="panelRef"
      class="je-popover__panel"
      :class="[`is-${side}`, align ? `is-align-${align}` : '', { 'is-open': isOpen }]"
      :style="panelStyle"
      role="dialog"
      :aria-labelledby="title ? `${uid}-title` : undefined"
      :aria-hidden="!isOpen"
      @mouseenter="onPanelEnter"
      @mouseleave="onPanelLeave"
      @focusout="onFocusOut"
    >
      <view v-if="title || $slots.title" :id="`${uid}-title`" class="je-popover__title">
        <slot name="title">{{ title }}</slot>
      </view>
      <view class="je-popover__content">
        <slot name="content" />
      </view>
      <view class="je-popover__arrow" aria-hidden="true" />
    </view>
  </view>
</template>

<style scoped>
.je-popover {
  position: relative;
  display: inline-flex;
  font-family: inherit;
}

.je-popover__trigger {
  display: inline-flex;
  align-items: center;
  font-family: inherit;
}

/* 收起态用 visibility 常驻 DOM，切 display 会让过渡失效 */
.je-popover__panel {
  position: absolute;
  z-index: 2000;
  box-sizing: border-box;
  max-width: calc(100vw - 24px);
  padding: 14px 16px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: transform, opacity;
  transition: transform 0.24s ease-in, opacity 0.18s ease-in, visibility 0s linear 0.24s;
}

.je-popover__panel.is-open {
  opacity: 1;
  visibility: visible;
  /* 面板内容可交互（按钮 / 输入框等） */
  pointer-events: auto;
  transition: transform 0.32s var(--je-ease-out-back), opacity 0.2s ease-out;
}

.je-popover__title {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--je-text);
}

.je-popover__content {
  color: var(--je-text-muted);
  word-break: break-word;
}

/* ---------------------------------- 方位 ---------------------------------- */

.je-popover__panel.is-top {
  bottom: calc(100% + var(--je-popover-offset, 10px));
  left: 50%;
  transform-origin: bottom center;
  transform: translateX(-50%) scale(0.92);
}

.je-popover__panel.is-top.is-open {
  transform: translateX(-50%) scale(1);
}

.je-popover__panel.is-top.is-align-start {
  left: 0;
  transform-origin: bottom left;
  transform: scale(0.92);
}

.je-popover__panel.is-top.is-align-start.is-open {
  transform: scale(1);
}

.je-popover__panel.is-top.is-align-end {
  right: 0;
  left: auto;
  transform-origin: bottom right;
  transform: scale(0.92);
}

.je-popover__panel.is-top.is-align-end.is-open {
  transform: scale(1);
}

.je-popover__panel.is-bottom {
  top: calc(100% + var(--je-popover-offset, 10px));
  left: 50%;
  transform-origin: top center;
  transform: translateX(-50%) scale(0.92);
}

.je-popover__panel.is-bottom.is-open {
  transform: translateX(-50%) scale(1);
}

.je-popover__panel.is-bottom.is-align-start {
  left: 0;
  transform-origin: top left;
  transform: scale(0.92);
}

.je-popover__panel.is-bottom.is-align-start.is-open {
  transform: scale(1);
}

.je-popover__panel.is-bottom.is-align-end {
  right: 0;
  left: auto;
  transform-origin: top right;
  transform: scale(0.92);
}

.je-popover__panel.is-bottom.is-align-end.is-open {
  transform: scale(1);
}

.je-popover__panel.is-left {
  top: 50%;
  right: calc(100% + var(--je-popover-offset, 10px));
  transform-origin: right center;
  transform: translateY(-50%) scale(0.92);
}

.je-popover__panel.is-left.is-open {
  transform: translateY(-50%) scale(1);
}

.je-popover__panel.is-left.is-align-start {
  top: 0;
  transform-origin: right top;
  transform: scale(0.92);
}

.je-popover__panel.is-left.is-align-start.is-open {
  transform: scale(1);
}

.je-popover__panel.is-left.is-align-end {
  top: auto;
  bottom: 0;
  transform-origin: right bottom;
  transform: scale(0.92);
}

.je-popover__panel.is-left.is-align-end.is-open {
  transform: scale(1);
}

.je-popover__panel.is-right {
  top: 50%;
  left: calc(100% + var(--je-popover-offset, 10px));
  transform-origin: left center;
  transform: translateY(-50%) scale(0.92);
}

.je-popover__panel.is-right.is-open {
  transform: translateY(-50%) scale(1);
}

.je-popover__panel.is-right.is-align-start {
  top: 0;
  transform-origin: left top;
  transform: scale(0.92);
}

.je-popover__panel.is-right.is-align-start.is-open {
  transform: scale(1);
}

.je-popover__panel.is-right.is-align-end {
  top: auto;
  bottom: 0;
  transform-origin: left bottom;
  transform: scale(0.92);
}

.je-popover__panel.is-right.is-align-end.is-open {
  transform: scale(1);
}

/* ------------------------------- 箭头 ------------------------------- */
/* 旋转 45° 的小方块，只留朝外的两条边 */

.je-popover__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--je-popup);
  border: 1px solid var(--je-border-color);
}

.je-popover__panel.is-top .je-popover__arrow {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-top: none;
  border-left: none;
}

.je-popover__panel.is-top.is-align-start .je-popover__arrow {
  left: 14px;
}

.je-popover__panel.is-top.is-align-end .je-popover__arrow {
  right: 14px;
  left: auto;
}

.je-popover__panel.is-bottom .je-popover__arrow {
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-right: none;
  border-bottom: none;
}

.je-popover__panel.is-bottom.is-align-start .je-popover__arrow {
  left: 14px;
}

.je-popover__panel.is-bottom.is-align-end .je-popover__arrow {
  right: 14px;
  left: auto;
}

.je-popover__panel.is-left .je-popover__arrow {
  top: 50%;
  right: -6px;
  transform: translateY(-50%) rotate(45deg);
  border-bottom: none;
  border-left: none;
}

.je-popover__panel.is-left.is-align-start .je-popover__arrow {
  top: 14px;
}

.je-popover__panel.is-left.is-align-end .je-popover__arrow {
  top: auto;
  bottom: 14px;
}

.je-popover__panel.is-right .je-popover__arrow {
  top: 50%;
  left: -6px;
  transform: translateY(-50%) rotate(45deg);
  border-top: none;
  border-right: none;
}

.je-popover__panel.is-right.is-align-start .je-popover__arrow {
  top: 14px;
}

.je-popover__panel.is-right.is-align-end .je-popover__arrow {
  top: auto;
  bottom: 14px;
}

/* 窄屏面板宽度收敛到视口内 */
@media (max-width: 768px) {
  .je-popover__panel {
    max-width: calc(100vw - 24px);
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-popover__panel,
  .je-popover__panel.is-open {
    transition: none;
  }
}
</style>
