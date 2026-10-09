<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeActionSheetAction } from './types'

defineOptions({ name: 'JeActionSheet' })

const props = withDefaults(
  defineProps<{
    /** 显示 / 隐藏 */
    modelValue?: boolean
    /** 操作项列表 */
    actions?: JeActionSheetAction[]
    /** 面板标题 */
    title?: string
    /** 标题下方的说明文字 */
    description?: string
    /** 取消按钮文字，传空字符串则不显示取消按钮 */
    cancelText?: string
    /** 点击操作项后自动关闭 */
    closeOnClickAction?: boolean
    /** 点击遮罩关闭 */
    closeOnClickModal?: boolean
    /** 按 Esc 关闭（仅 H5 有键盘） */
    closeOnEscape?: boolean
  }>(),
  {
    modelValue: false,
    actions: () => [],
    cancelText: '取消',
    closeOnClickAction: true,
    closeOnClickModal: true,
    closeOnEscape: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 选中某个操作项 */
  select: [action: JeActionSheetAction, index: number]
  /** 点了取消或遮罩 */
  cancel: []
  /** 开始展开 */
  open: []
  /** 开始收起 */
  close: []
}>()

const zIndex = ref(nextZIndex())

/* H5 锁 body 滚动；小程序端没有 body，锁屏交给遮罩层的 touchmove 阻断 */
// #ifdef H5
let previousOverflow = ''

const setBodyScrollLock = (locked: boolean) => {
  if (locked) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousOverflow
}
// #endif

const close = () => {
  if (!props.modelValue) return
  emit('update:modelValue', false)
  emit('close')
}

const onCancel = () => {
  emit('cancel')
  close()
}

const onScrimClick = () => {
  if (props.closeOnClickModal) onCancel()
}

const onDismiss = () => {
  drag.reset()
  onCancel()
}

/* 抓手下拉关闭：位移只做视觉反馈，松手超过阈值才真正收起 */
const drag = useSheetDrag(onDismiss, 96)

/* 拖拽时用内联 transform 覆盖面板的滑入位移，松手后交还给 CSS 过渡 */
const panelStyle = computed(() => {
  const base = { zIndex: zIndex.value }
  if (!drag.dragging.value && !drag.offset.value) return base
  return { ...base, transform: `translateY(${drag.offset.value}px)` }
})

const onSelect = (action: JeActionSheetAction, index: number) => {
  if (action.disabled || action.loading) return
  emit('select', action, index)
  if (props.closeOnClickAction) close()
}

/* Esc 关闭：小程序端没有键盘事件，整块只在 H5 编译 */
// #ifdef H5
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !props.closeOnEscape) return
  event.stopPropagation()
  onCancel()
}
// #endif

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // 每次打开都重新取层级，保证后开的浮层压在上面
      zIndex.value = nextZIndex()
      emit('open')
    }
    // #ifdef H5
    setBodyScrollLock(open)
    if (open) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
    // #endif
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('keydown', onKeydown)
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view class="je-action-sheet" :class="{ 'is-open': modelValue }">
    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      class="je-action-sheet__scrim"
      aria-hidden="true"
      @tap="onScrimClick"
      @touchmove.stop.prevent
    />

    <view
      class="je-action-sheet__panel"
      :style="panelStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="title || undefined"
      :aria-hidden="!modelValue"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        class="je-action-sheet__grabber-area"
        @touchstart="drag.onTouchStart"
        @touchmove.stop.prevent="drag.onTouchMove"
        @touchend="drag.onTouchEnd"
        @touchcancel="drag.onTouchCancel"
        @mousedown="drag.onMouseDown"
      >
        <text class="je-action-sheet__grabber" aria-hidden="true" />
      </view>

      <view v-if="title || description || $slots.header" class="je-action-sheet__header">
        <slot name="header">
          <text v-if="title" class="je-action-sheet__title">{{ title }}</text>
          <text v-if="description" class="je-action-sheet__description">{{ description }}</text>
        </slot>
      </view>

      <view class="je-action-sheet__content" role="menu">
        <slot>
          <button
            v-for="(action, index) in actions"
            :key="action.name"
            type="button"
            class="je-action-sheet__item"
            :class="{ 'is-disabled': action.disabled || action.loading }"
            :style="action.color ? { color: action.color } : undefined"
            :disabled="action.disabled || action.loading"
            @tap="onSelect(action, index)"
          >
            <JeIcon v-if="action.loading" class="je-action-sheet__spinner" name="loading" spin :size="18" />
            <JeIcon v-else-if="action.icon" :name="action.icon" :size="18" />
            <view class="je-action-sheet__item-main">
              <text class="je-action-sheet__item-text">{{ action.text ?? action.name }}</text>
              <text v-if="action.subText" class="je-action-sheet__item-sub">{{ action.subText }}</text>
            </view>
          </button>
        </slot>
      </view>

      <view v-if="cancelText" class="je-action-sheet__cancel-wrap">
        <button type="button" class="je-action-sheet__cancel" @tap="onCancel">
          {{ cancelText }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-action-sheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 容器常驻 DOM 且铺满视口，收起时必须放行点击，否则会盖死整页 */
  pointer-events: none;
}

.je-action-sheet.is-open {
  pointer-events: auto;
}

.je-action-sheet__scrim {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.5);
  /* 小程序端不支持 backdrop-filter，退化成纯半透明遮罩 */
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-action-sheet.is-open .je-action-sheet__scrim {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-action-sheet__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: 80vh;
  padding-bottom: env(safe-area-inset-bottom);
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: var(--je-border);
  border-radius: var(--je-radius-lg) var(--je-radius-lg) 0 0;
  box-shadow: var(--je-shadow-popup);
  outline: none;
  /* 收起后必须屏蔽点击，否则过渡期间面板是「隐形可点」的 */
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(100%);
  transition: transform 0.3s ease-in, opacity 0.22s ease-in, visibility 0s linear 0.3s;
}

.je-action-sheet.is-open .je-action-sheet__panel {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
}

/* 抓手是独立的手势元素，可以独占 touch-action；小程序端靠模板上的 catchtouchmove 阻断滚动 */
.je-action-sheet__grabber-area {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: grab;
  touch-action: none;
}

.je-action-sheet__grabber {
  width: 36px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

.je-action-sheet__header {
  flex-shrink: 0;
  padding: 6px 22px 16px;
  text-align: center;
}

/* 小程序端 <text> 是行内元素，margin / 居中都要先块级化 */
.je-action-sheet__title {
  display: block;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.je-action-sheet__description {
  display: block;
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--je-text-faint);
}

.je-action-sheet__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.je-action-sheet__item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-height: 52px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 12px 22px;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4;
  color: var(--je-text);
  text-align: center;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-action-sheet__item::after,
.je-action-sheet__cancel::after {
  border: none;
}

.je-action-sheet__item + .je-action-sheet__item {
  border-top: var(--je-border);
}

.je-action-sheet__item:not(.is-disabled):hover {
  background: var(--je-surface-hover);
}

.je-action-sheet__item:not(.is-disabled):active {
  background: color-mix(in srgb, var(--je-primary) 14%, transparent);
}

.je-action-sheet__item:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-action-sheet__item.is-disabled {
  color: var(--je-text-faint);
  cursor: not-allowed;
}

.je-action-sheet__spinner {
  color: var(--je-primary);
}

.je-action-sheet__item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.je-action-sheet__item-text {
  overflow-wrap: break-word;
}

.je-action-sheet__item-sub {
  font-size: 13px;
  line-height: 1.4;
  color: var(--je-text-faint);
}

/* 取消按钮与操作项之间留一条底色空档；左右不再内缩，宽度与上方操作项保持一致 */
.je-action-sheet__cancel-wrap {
  flex-shrink: 0;
  padding: 8px 0 0;
  background: var(--je-surface);
}

.je-action-sheet__cancel {
  box-sizing: border-box;
  width: 100%;
  min-height: 52px;
  margin: 0;
  padding: 12px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--je-text);
  background: var(--je-popup);
  border: none;
  /* 整宽按钮不再做圆角，否则四角会露出面板底色 */
  border-radius: 0;
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

.je-action-sheet__cancel:hover {
  background: var(--je-surface-hover);
}

.je-action-sheet__cancel:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-action-sheet__scrim,
  .je-action-sheet__panel,
  .je-action-sheet.is-open .je-action-sheet__scrim,
  .je-action-sheet.is-open .je-action-sheet__panel {
    transition: none;
  }
}
</style>
