<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import JeIcon from '../je-icon/je-icon.vue'
import JeTree from '../je-tree/je-tree.vue'
import type { JeTreeNode } from '../je-tree/types'
import type { JeTreeSelectValue } from './types'

defineOptions({ name: 'JeTreeSelect' })

const props = withDefaults(
  defineProps<{
    modelValue?: JeTreeSelectValue
    data: JeTreeNode[]
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    accordion?: boolean
  }>(),
  {
    modelValue: null,
    placeholder: '请选择',
    disabled: false,
    clearable: true,
    accordion: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeTreeSelectValue]
  change: [value: JeTreeSelectValue]
  clear: []
}>()

const uid = useUid('je-tree-select')
const panelId = `${uid}-panel`
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
/** scroll-view 的布尔属性走 ref 下发（mp 端静态字面量 false 有丢失历史） */
const showScrollbar = ref(false)

/** 模板 ref 取 DOM 前先解包（组件实例取 $el） */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/**
 * 窄屏切底部弹出层。小程序端没有 window，恒按窄屏处理；
 * H5 在挂载时按视口宽判一次（口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

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

const locked = computed(() => isMobile.value && isOpen.value)

// #ifdef H5
watch(locked, (value) => setBodyScrollLock(value))
// #endif

/* 抓手下拉关闭：位移只做视觉反馈，松手超过阈值才真正收起 */
const sheet = useSheetDrag(() => close())

/** 拖拽时用内联 transform 覆盖面板的滑入位移，松手后交还给 CSS 过渡 */
const panelStyle = computed(() => {
  if (!isMobile.value || !isOpen.value) return undefined
  return {
    transform: `translateY(${sheet.offset.value}px)`,
    transition: sheet.dragging.value ? 'none' : undefined,
  }
})

const selectedKeys = computed<Array<string | number>>(() =>
  props.modelValue === null || props.modelValue === undefined ? [] : [props.modelValue],
)

/** 在 data 里深度查找选中节点，拿到用于展示的 label */
const findLabel = (nodes: JeTreeNode[], key: string | number): string | null => {
  for (const node of nodes) {
    if (node.key === key) return node.label
    if (node.children) {
      const found = findLabel(node.children, key)
      if (found !== null) return found
    }
  }
  return null
}

const selectedLabel = computed(() =>
  props.modelValue === null || props.modelValue === undefined
    ? ''
    : findLabel(props.data, props.modelValue) ?? '',
)
const hasValue = computed(() => selectedLabel.value !== '')

const open = () => {
  if (props.disabled) return
  sheet.reset()
  isOpen.value = true
  // 桌面端把焦点送进树里，随后方向键 / 回车才可用
  if (!isMobile.value) {
    nextTick(() => {
      pick(panelRef.value)?.querySelector<HTMLElement>('[role="treeitem"]')?.focus()
    })
  }
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

const selectNode = (node: JeTreeNode) => {
  if (node.disabled) return
  emit('update:modelValue', node.key)
  emit('change', node.key)
  close()
  pick(triggerRef.value)?.focus?.()
}

const clear = () => {
  if (props.disabled) return
  emit('update:modelValue', null)
  emit('change', null)
  emit('clear')
}

/* 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return

  if (event.key === 'Escape') {
    if (!isOpen.value) return
    event.preventDefault()
    close()
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (isOpen.value) close()
    else open()
  }
}

/**
 * 面板就地渲染（不再 Teleport），键事件会冒泡回根节点 —— 用 `.stop` 截住，
 * 只收 Escape 并交回触发按钮，方向键 / 回车仍归树自己处理（与主库 teleport 后的行为一致）。
 */
const onPanelKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.preventDefault()
  close()
  pick(triggerRef.value)?.focus?.()
}

/* 点选外部关闭只在 H5（桌面下拉形态）成立，小程序端靠遮罩点击 */
// #ifdef H5
const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node
  if (pick(rootRef.value)?.contains(target)) return
  close()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
// #endif

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-tree-select"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled }"
    @keydown="onKeydown"
  >
    <view
      ref="triggerRef"
      class="je-tree-select__trigger"
      :class="{ 'has-value': hasValue }"
      role="combobox"
      aria-haspopup="tree"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      :tabindex="disabled ? -1 : 0"
      @tap="toggle"
    >
      <text class="je-tree-select__label">{{ hasValue ? selectedLabel : placeholder }}</text>

      <button
        v-if="clearable && hasValue && !disabled"
        type="button"
        class="je-tree-select__clear"
        aria-label="清除选择"
        @tap.stop="clear"
      >
        <JeIcon name="close" :size="14" />
      </button>

      <text class="je-tree-select__arrow" aria-hidden="true" />
    </view>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-tree-select__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="panelId"
      ref="panelRef"
      class="je-tree-select__panel"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      :aria-hidden="!isOpen"
      @keydown.stop="onPanelKeydown"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-tree-select__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <scroll-view class="je-tree-select__body" scroll-y :show-scrollbar="showScrollbar">
        <JeTree
          :data="data"
          :model-value="selectedKeys"
          :accordion="accordion"
          :expand-on-click-node="false"
          @node-click="selectNode"
        />
      </scroll-view>
    </view>
  </view>
</template>

<style scoped>
.je-tree-select {
  position: relative;
  font-family: inherit;
  user-select: none;
}

.je-tree-select__trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  font-size: 15px;
  color: var(--je-text-faint);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  cursor: pointer;
  outline: none;
  transition: border-color var(--je-duration) ease, background var(--je-duration) ease,
    box-shadow var(--je-duration) ease;
}

.je-tree-select__trigger.has-value {
  color: var(--je-text);
}

/* 聚焦与展开共用高亮，键盘用户也看得见 */
.je-tree-select__trigger:focus-visible,
.je-tree-select.is-open .je-tree-select__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-tree-select__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-tree-select__clear::after {
  border: none;
}

.je-tree-select__clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  color: var(--je-text-faint);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.je-tree-select__clear:hover,
.je-tree-select__clear:focus-visible {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

/* 箭头是 CSS 画的小折角，展开时翻转 */
.je-tree-select__arrow {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-top: -4px;
  border-right: 2px solid var(--je-text-faint);
  border-bottom: 2px solid var(--je-text-faint);
  transform: rotate(45deg);
  transition: transform 0.4s var(--je-ease-overshoot), margin-top 0.4s var(--je-ease-overshoot),
    border-color var(--je-duration) ease;
}

.je-tree-select.is-open .je-tree-select__arrow {
  margin-top: 4px;
  border-color: var(--je-text);
  transform: rotate(-135deg);
}

.je-tree-select.is-disabled .je-tree-select__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 桌面端就地挂在触发按钮下方；小程序端没有 body，不能靠 teleport + fixed 定位 */
.je-tree-select__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 50;
  box-sizing: border-box;
  max-height: 320px;
  padding: 6px;
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top left;
  /* 收起态：常驻 DOM 但不可见、不可点，保证过渡可用 */
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: transform, opacity;
  transform: scale(0.96) translateY(-6px);
  transition: transform 0.28s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.28s;
}

.je-tree-select__panel.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: scale(1) translateY(0);
  transition: transform 0.38s var(--je-ease-out-back), opacity 0.24s ease-out;
}

/* 树内容放进 scroll-view：小程序端 overflow 不滚动，滚动交给原生滚动 */
.je-tree-select__body {
  max-height: 308px;
}

.je-tree-select__scrim {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-tree-select__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-tree-select__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-tree-select__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

/* 窄屏：改成贴底弹出的抽屉，并预留给安全区；树本身照常可滚动 */
@media (max-width: 768px) {
  .je-tree-select__panel {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 101;
    max-height: 72vh;
    padding: 4px 12px calc(14px + env(safe-area-inset-bottom, 0px));
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    transform-origin: bottom center;
    /* 这里不能设 touch-action: none，否则树在触屏上没法滚动；
       拖拽手势的 touch-action 由 .je-tree-select__handle 单独承担 */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-tree-select__panel.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-tree-select__body {
    max-height: 60vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 展开 / 收起都直接切到位，不做过渡 */
  .je-tree-select__panel,
  .je-tree-select__panel.is-open,
  .je-tree-select__scrim,
  .je-tree-select__arrow {
    transition: none;
  }
}
</style>
