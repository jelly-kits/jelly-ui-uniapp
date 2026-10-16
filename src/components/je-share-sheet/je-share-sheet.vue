<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeLocale } from '../je-locale'
import type { JeShareOption } from './types'

defineOptions({ name: 'JeShareSheet' })

const props = withDefaults(
  defineProps<{
    /** 显示 / 隐藏 */
    modelValue?: boolean
    /** 分享目标列表 */
    options?: JeShareOption[]
    /** 面板标题 */
    title?: string
    /** 标题下方的说明文字 */
    description?: string
    /** 取消按钮文字，传空字符串则不显示取消按钮 */
    cancelText?: string
    /** 点击遮罩关闭 */
    closeOnClickOverlay?: boolean
    /** 底部预留安全区 */
    safeAreaInsetBottom?: boolean
    /** 展开 / 收起过渡时长，单位毫秒 */
    duration?: number
  }>(),
  {
    modelValue: false,
    options: () => [],
    title: undefined,
    description: undefined,
    cancelText: undefined,
    closeOnClickOverlay: true,
    safeAreaInsetBottom: true,
    duration: 300,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 选中某个分享目标 */
  select: [option: JeShareOption, index: number]
  /** 点了取消或遮罩 */
  cancel: []
  /** 面板开始展开 */
  open: []
  /** 面板开始收起 */
  close: []
}>()

const { t } = useJeLocale()

/* 标题与取消按钮走语言包，外部传了值优先 */
const titleText = computed(() => props.title ?? t('shareSheet.title'))
const cancelLabel = computed(() => props.cancelText ?? t('shareSheet.cancel'))

const zIndex = ref(nextZIndex())

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
  if (props.closeOnClickOverlay) onCancel()
}

const onDismiss = () => {
  drag.reset()
  onCancel()
}

/* 抓手下拉关闭：位移只做视觉反馈，松手超过阈值才真正收起 */
const drag = useSheetDrag(onDismiss, 96)

/** 拖拽时用内联 transform 覆盖面板的滑入位移，松手后交还给 CSS 过渡 */
const panelStyle = computed(() => ({
  zIndex: zIndex.value,
  '--je-share-sheet-duration': `${props.duration}ms`,
  '--je-share-sheet-safe-bottom': props.safeAreaInsetBottom
    ? 'env(safe-area-inset-bottom, 0px)'
    : '0px',
  transform:
    drag.dragging.value || drag.offset.value
      ? `translateY(${drag.offset.value}px)`
      : undefined,
}))

/** 内置色组：未指定 color 的目标按索引取用 */
const FALLBACK_COLORS = [
  'var(--je-primary)',
  'var(--je-success)',
  'var(--je-warning)',
  'var(--je-info)',
  'var(--je-danger)',
  'var(--je-primary-end)',
]

const colorOf = (option: JeShareOption, index: number) =>
  option.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? 'var(--je-primary)'

/** 图标底色由底色现算，图标颜色缺省与底色一致 */
const iconStyle = (option: JeShareOption, index: number) => {
  const color = colorOf(option, index)
  return {
    '--je-share-sheet-color': color,
    '--je-share-sheet-icon-color': option.iconColor ?? color,
  }
}

const onSelect = (option: JeShareOption, index: number) => {
  if (option.disabled) return
  emit('select', option, index)
  close()
}

/* H5 锁 body 滚动；小程序端没有 body，锁屏交给遮罩层的 catchtouchmove 阻断 */
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

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // 每次由隐藏转可见都重新取层级，保证后开的浮层压在上面
      zIndex.value = nextZIndex()
      emit('open')
    }
    // #ifdef H5
    setBodyScrollLock(open)
    // #endif
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  // #ifdef H5
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view class="je-share-sheet" :class="{ 'is-open': modelValue }">
    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view class="je-share-sheet__scrim" aria-hidden="true" @tap="onScrimClick" @touchmove.stop.prevent />

    <view
      class="je-share-sheet__panel"
      :style="panelStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="titleText || undefined"
      :aria-hidden="!modelValue"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        class="je-share-sheet__grabber-area"
        @touchstart="drag.onTouchStart"
        @touchmove.stop.prevent="drag.onTouchMove"
        @touchend="drag.onTouchEnd"
        @touchcancel="drag.onTouchCancel"
        @mousedown="drag.onMouseDown"
      >
        <text class="je-share-sheet__grabber" aria-hidden="true" />
      </view>

      <view v-if="titleText || description || $slots.header" class="je-share-sheet__header">
        <slot name="header">
          <text v-if="titleText" class="je-share-sheet__title">{{ titleText }}</text>
          <text v-if="description" class="je-share-sheet__description">{{ description }}</text>
        </slot>
      </view>

      <view class="je-share-sheet__content">
        <slot>
          <view class="je-share-sheet__grid" role="menu">
            <button
              v-for="(option, index) in options"
              :key="option.name"
              type="button"
              role="menuitem"
              class="je-share-sheet__option"
              :class="{ 'is-disabled': option.disabled }"
              :disabled="option.disabled"
              @tap="onSelect(option, index)"
            >
              <view class="je-share-sheet__icon" :style="iconStyle(option, index)">
                <JeIcon :name="option.icon ?? 'share'" :size="22" />
              </view>
              <text class="je-share-sheet__name">{{ option.name }}</text>
            </button>
          </view>
        </slot>
      </view>

      <button v-if="cancelLabel" type="button" class="je-share-sheet__cancel" @tap="onCancel">
        {{ cancelLabel }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.je-share-sheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 容器常驻 DOM 且铺满视口，收起时必须放行点击，否则会盖死整页 */
  pointer-events: none;
  --je-share-sheet-duration: 300ms;
}

.je-share-sheet.is-open {
  pointer-events: auto;
}

.je-share-sheet__scrim {
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

.je-share-sheet.is-open .je-share-sheet__scrim {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-share-sheet__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: 80vh;
  padding-bottom: var(--je-share-sheet-safe-bottom, 0px);
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
  transition: transform var(--je-share-sheet-duration) ease-in, opacity 0.22s ease-in,
    visibility 0s linear var(--je-share-sheet-duration);
}

.je-share-sheet.is-open .je-share-sheet__panel {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition: transform var(--je-share-sheet-duration) var(--je-ease-out-back), opacity 0.24s ease-out;
}

/* 抓手是独立的手势元素，可以独占 touch-action；小程序端靠模板上的 catchtouchmove 阻断滚动 */
.je-share-sheet__grabber-area {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: grab;
  touch-action: none;
}

.je-share-sheet__grabber {
  width: 36px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

.je-share-sheet__header {
  flex-shrink: 0;
  padding: 6px 22px 10px;
  text-align: center;
}

/* 小程序端 <text> 是行内元素，margin / 居中都要先块级化 */
.je-share-sheet__title {
  display: block;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.je-share-sheet__description {
  display: block;
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--je-text-faint);
}

.je-share-sheet__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.je-share-sheet__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 8px 12px 18px;
}

.je-share-sheet__option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 44px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 10px 6px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.35;
  color: var(--je-text-muted);
  text-align: center;
  background: transparent;
  border: none;
  border-radius: var(--je-radius);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-share-sheet__option::after,
.je-share-sheet__cancel::after {
  border: none;
}

.je-share-sheet__option:not(.is-disabled):hover {
  background: var(--je-surface-hover);
}

.je-share-sheet__option:not(.is-disabled):active {
  background: color-mix(in srgb, var(--je-primary) 14%, transparent);
}

.je-share-sheet__option:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-share-sheet__option.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.je-share-sheet__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 0;
  color: var(--je-share-sheet-icon-color, var(--je-primary));
  /* 由目标底色现算的淡色圆底，换肤时会跟着变 */
  background: color-mix(in srgb, var(--je-share-sheet-color, var(--je-primary)) 20%, transparent);
  border-radius: 50%;
  transition: transform var(--je-duration) var(--je-ease-out-back);
}

.je-share-sheet__option:not(.is-disabled):active .je-share-sheet__icon {
  transform: scale(0.92);
}

/* 小程序端 <text> 块级化后才能居中与换行 */
.je-share-sheet__name {
  display: block;
  overflow-wrap: anywhere;
}

.je-share-sheet__cancel {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 100%;
  min-height: 52px;
  margin: 0;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  color: var(--je-text);
  background: var(--je-popup);
  border: none;
  border-top: var(--je-border);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

.je-share-sheet__cancel:hover {
  background: var(--je-surface-hover);
}

.je-share-sheet__cancel:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

@media (max-width: 360px) {
  .je-share-sheet__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .je-share-sheet__cancel {
    min-height: 56px;
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
   * 展开态的规则特异性更高（.je-share-sheet.is-open .je-share-sheet__panel），
   * 只写基础类会被它反压、过渡照样跑，必须把 .is-open 一起列进来（见 AGENTS 陷阱 5）。
   */
  .je-share-sheet__scrim,
  .je-share-sheet__panel,
  .je-share-sheet.is-open .je-share-sheet__scrim,
  .je-share-sheet.is-open .je-share-sheet__panel,
  .je-share-sheet__icon {
    transition: none;
  }
}
</style>
