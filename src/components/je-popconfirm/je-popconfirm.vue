<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import { useUid } from '../../core/useUid'
import JeButton from '../je-button/je-button.vue'
import { useJeLocale } from '../je-locale'
import type { JePopconfirmType } from './types'
import type { JePlacementValue } from '../../core/placement'

defineOptions({ name: 'JePopconfirm' })

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    title?: string
    content?: string
    /** 确认按钮文字，未传时用语言包的 confirm 文案 */
    confirmText?: string
    /** 取消按钮文字，未传时用语言包的 cancel 文案 */
    cancelText?: string
    placement?: JePlacementValue
    /** 确认按钮语义色 */
    type?: JePopconfirmType
    /** 数字按 px 处理；窄屏固定为底部弹出层的整宽 */
    width?: string | number
  }>(),
  {
    modelValue: false,
    title: '',
    content: '',
    confirmText: undefined,
    cancelText: undefined,
    placement: 'top',
    type: 'primary',
    width: 220,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const { t } = useJeLocale()

/** 确认按钮文案：外部优先，未传时回退语言包的通用确定 */
const confirmText = computed(() => props.confirmText ?? t('confirm'))
/** 取消按钮文案：外部优先，未传时回退语言包的通用取消 */
const cancelText = computed(() => props.cancelText ?? t('cancel'))

const uid = useUid('je-popconfirm')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(props.modelValue)
const zIndex = ref(nextZIndex())

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/**
 * 与 JePopover 保持一致：所有宽度都用气泡形态，窄屏不改成贴底弹层，
 * 只在 CSS 里把面板宽度收敛到视口内、动作按钮放大到触屏热区尺寸。
 */

/** 方位的那条边，决定面板朝哪边长 */
const side = computed(() => props.placement.split('-')[0])
/** 对齐方式：start 贴起始边、end 贴结束边，缺省居中 */
const align = computed(() => props.placement.split('-')[1] ?? '')

const panelStyle = computed(() => ({
  zIndex: zIndex.value,
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

const open = () => {
  if (isOpen.value) return
  zIndex.value = nextZIndex()
  isOpen.value = true
  emit('update:modelValue', true)
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
  emit('update:modelValue', false)
}

const toggle = () => {
  if (isOpen.value) close()
  else open()
}

const onConfirm = () => {
  emit('confirm')
  close()
}

const onCancel = () => {
  emit('cancel')
  close()
}

/* 点外部关闭与页面级 Esc 只在 H5 成立；小程序端没有 document，再点一次触发元素即可收起 */
// #ifdef H5
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.stopPropagation()
  close()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  // 面板不再传送出去，触发区与面板都在同一个组件根下，一起做「点外部」判定
  if (pick(rootRef.value)?.contains(target)) return
  if (pick(panelRef.value)?.contains(target)) return
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
// #endif

watch(isOpen, async (value) => {
  // #ifdef H5
  if (value) {
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    // 打开后把焦点移进面板，键盘用户可以直接 Tab / Esc
    pick(panelRef.value)?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
  // #endif
})

watch(
  () => props.modelValue,
  (value) => {
    if (value === isOpen.value) return
    if (value) open()
    else close()
  },
)

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  // #endif
})
</script>

<template>
  <view ref="rootRef" class="je-popconfirm">
    <view
      ref="triggerRef"
      class="je-popconfirm__trigger"
      :aria-expanded="isOpen"
      :aria-controls="uid"
      @tap="toggle"
    >
      <slot name="reference">
        <slot />
      </slot>
    </view>

    <!-- 面板就地渲染（无 Teleport）：absolute 按 placement 的方位落位，两端形态一致 -->
    <view
      :id="uid"
      ref="panelRef"
      class="je-popconfirm__panel"
      :class="[
        `is-${side}`,
        align ? `is-align-${align}` : '',
        `je-popconfirm--${type}`,
        { 'is-open': isOpen },
      ]"
      :style="panelStyle"
      role="dialog"
      :aria-labelledby="title ? `${uid}-title` : undefined"
      tabindex="-1"
      :aria-hidden="!isOpen"
    >
      <view class="je-popconfirm__body">
        <text v-if="title" :id="`${uid}-title`" class="je-popconfirm__title">{{ title }}</text>
        <view class="je-popconfirm__content">
          <slot name="content">{{ content }}</slot>
        </view>
      </view>

      <view class="je-popconfirm__actions">
        <JeButton variant="ghost" @click="onCancel">{{ cancelText }}</JeButton>
        <JeButton @click="onConfirm">{{ confirmText }}</JeButton>
      </view>

      <view class="je-popconfirm__arrow" aria-hidden="true" />
    </view>
  </view>
</template>

<style scoped>
.je-popconfirm {
  position: relative;
  display: inline-flex;
  font-family: inherit;
  /* 面板与触发元素的间距，落位与箭头共用 */
  --je-popconfirm-offset: 12px;
}

.je-popconfirm__trigger {
  display: inline-flex;
  align-items: center;
  font-family: inherit;
}

/* 收起态用 visibility 常驻 DOM，切 display 会让过渡失效 */
.je-popconfirm__panel {
  position: absolute;
  z-index: 2000;
  box-sizing: border-box;
  max-width: calc(100vw - 24px);
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  outline: none;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: transform, opacity;
  transition: transform 0.24s ease-in, opacity 0.18s ease-in, visibility 0s linear 0.24s;
}

.je-popconfirm__panel.is-open {
  opacity: 1;
  visibility: visible;
  /* 面板内容可交互（确认 / 取消按钮） */
  pointer-events: auto;
  transition: transform 0.32s var(--je-ease-out-back), opacity 0.2s ease-out;
}

/*
 * 方位全部交给 CSS（不再用 useFloating 量尺寸 + 内联定位），只按 placement 指定的边与
 * 对齐方式落位，不做碰撞检测与翻转。宽屏与窄屏同为一套气泡落位。
 */
.je-popconfirm__panel.is-top {
  bottom: calc(100% + var(--je-popconfirm-offset, 12px));
  left: 50%;
  transform-origin: bottom center;
  transform: translateX(-50%) scale(0.92);
}

.je-popconfirm__panel.is-top.is-open {
  transform: translateX(-50%) scale(1);
}

.je-popconfirm__panel.is-top.is-align-start {
  left: 0;
  transform-origin: bottom left;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-top.is-align-start.is-open {
  transform: scale(1);
}

.je-popconfirm__panel.is-top.is-align-end {
  right: 0;
  left: auto;
  transform-origin: bottom right;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-top.is-align-end.is-open {
  transform: scale(1);
}

.je-popconfirm__panel.is-bottom {
  top: calc(100% + var(--je-popconfirm-offset, 12px));
  left: 50%;
  transform-origin: top center;
  transform: translateX(-50%) scale(0.92);
}

.je-popconfirm__panel.is-bottom.is-open {
  transform: translateX(-50%) scale(1);
}

.je-popconfirm__panel.is-bottom.is-align-start {
  left: 0;
  transform-origin: top left;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-bottom.is-align-start.is-open {
  transform: scale(1);
}

.je-popconfirm__panel.is-bottom.is-align-end {
  right: 0;
  left: auto;
  transform-origin: top right;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-bottom.is-align-end.is-open {
  transform: scale(1);
}

.je-popconfirm__panel.is-left {
  top: 50%;
  right: calc(100% + var(--je-popconfirm-offset, 12px));
  transform-origin: right center;
  transform: translateY(-50%) scale(0.92);
}

.je-popconfirm__panel.is-left.is-open {
  transform: translateY(-50%) scale(1);
}

.je-popconfirm__panel.is-left.is-align-start {
  top: 0;
  transform-origin: right top;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-left.is-align-start.is-open {
  transform: scale(1);
}

.je-popconfirm__panel.is-left.is-align-end {
  top: auto;
  bottom: 0;
  transform-origin: right bottom;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-left.is-align-end.is-open {
  transform: scale(1);
}

.je-popconfirm__panel.is-right {
  top: 50%;
  left: calc(100% + var(--je-popconfirm-offset, 12px));
  transform-origin: left center;
  transform: translateY(-50%) scale(0.92);
}

.je-popconfirm__panel.is-right.is-open {
  transform: translateY(-50%) scale(1);
}

.je-popconfirm__panel.is-right.is-align-start {
  top: 0;
  transform-origin: left top;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-right.is-align-start.is-open {
  transform: scale(1);
}

.je-popconfirm__panel.is-right.is-align-end {
  top: auto;
  bottom: 0;
  transform-origin: left bottom;
  transform: scale(0.92);
}

.je-popconfirm__panel.is-right.is-align-end.is-open {
  transform: scale(1);
}

/* 箭头按边与对齐方式落位 */
.je-popconfirm__panel.is-top .je-popconfirm__arrow {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-top: none;
  border-left: none;
}

.je-popconfirm__panel.is-top.is-align-start .je-popconfirm__arrow {
  left: 14px;
}

.je-popconfirm__panel.is-top.is-align-end .je-popconfirm__arrow {
  right: 14px;
  left: auto;
}

.je-popconfirm__panel.is-bottom .je-popconfirm__arrow {
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-right: none;
  border-bottom: none;
}

.je-popconfirm__panel.is-bottom.is-align-start .je-popconfirm__arrow {
  left: 14px;
}

.je-popconfirm__panel.is-bottom.is-align-end .je-popconfirm__arrow {
  right: 14px;
  left: auto;
}

.je-popconfirm__panel.is-left .je-popconfirm__arrow {
  top: 50%;
  right: -6px;
  transform: translateY(-50%) rotate(45deg);
  border-bottom: none;
  border-left: none;
}

.je-popconfirm__panel.is-left.is-align-start .je-popconfirm__arrow {
  top: 14px;
}

.je-popconfirm__panel.is-left.is-align-end .je-popconfirm__arrow {
  top: auto;
  bottom: 14px;
}

.je-popconfirm__panel.is-right .je-popconfirm__arrow {
  top: 50%;
  left: -6px;
  transform: translateY(-50%) rotate(45deg);
  border-top: none;
  border-right: none;
}

.je-popconfirm__panel.is-right.is-align-start .je-popconfirm__arrow {
  top: 14px;
}

.je-popconfirm__panel.is-right.is-align-end .je-popconfirm__arrow {
  top: auto;
  bottom: 14px;
}

.je-popconfirm__body {
  padding: 14px 16px 10px;
}

.je-popconfirm__title {
  /* 映射成 <text> 后两端都是行内元素，行内元素的上下 margin 不生效，这里显式转块 */
  display: block;
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
}

.je-popconfirm__content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--je-text-muted);
  word-break: break-word;
}

.je-popconfirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px 12px;
}

/* 气泡里空间有限，把 JeButton 收窄一档 */
.je-popconfirm__actions :deep(.je-button) {
  padding: 8px 14px;
  font-size: 13px;
  border-radius: var(--je-radius-sm);
}

/* 语义色：主色按钮换成对应语义色的渐变与光晕 */
.je-popconfirm--danger .je-popconfirm__actions :deep(.je-button--primary) {
  background: linear-gradient(
    135deg,
    var(--je-danger),
    color-mix(in srgb, var(--je-danger) 65%, #000)
  );
  box-shadow:
    0 8px 22px color-mix(in srgb, var(--je-danger) 40%, transparent),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
}

.je-popconfirm--warning .je-popconfirm__actions :deep(.je-button--primary) {
  color: #1f1300;
  background: linear-gradient(
    135deg,
    var(--je-warning),
    color-mix(in srgb, var(--je-warning) 70%, #000)
  );
  box-shadow:
    0 8px 22px color-mix(in srgb, var(--je-warning) 40%, transparent),
    inset 0 2px 4px rgba(255, 255, 255, 0.35);
}

.je-popconfirm__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--je-popup);
  border: 1px solid var(--je-border-color);
}

/* 窄屏：气泡形态不变，只把面板宽度收敛到视口内、动作按钮放大到触屏热区尺寸 */
@media (max-width: 768px) {
  .je-popconfirm__body {
    padding: 16px 16px 12px;
  }

  .je-popconfirm__title {
    font-size: 15px;
  }

  .je-popconfirm__content {
    font-size: 14px;
  }

  .je-popconfirm__actions {
    gap: 10px;
    padding: 0 14px 14px;
  }

  /* 触屏热区不小于 40px */
  .je-popconfirm__actions :deep(.je-button) {
    flex: 1;
    min-height: 40px;
    padding: 10px 16px;
    font-size: 14px;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-popconfirm__panel,
  .je-popconfirm__panel.is-open {
    transition: none;
  }
}
</style>
