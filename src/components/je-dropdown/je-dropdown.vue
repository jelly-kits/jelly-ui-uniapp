<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import JeIcon from '../je-icon/je-icon.vue'
import { jeDropdownKey, type JeDropdownContext } from './types'
import type { JePlacementValue } from '../../core/placement'

defineOptions({ name: 'JeDropdown' })

const props = withDefaults(
  defineProps<{
    /** 桌面端触发方式；窄屏一律点击切换 */
    trigger?: 'hover' | 'click'
    placement?: JePlacementValue
    disabled?: boolean
    /** 选中某一项后是否自动收起 */
    closeOnClick?: boolean
    /** 触发区拆成「主按钮 + 箭头」两段，主按钮内容同样来自 trigger 插槽 */
    splitButton?: boolean
    /** 菜单最大高度（px），超出可滚动 */
    maxHeight?: number
  }>(),
  {
    trigger: 'click',
    placement: 'bottom-start',
    disabled: false,
    closeOnClick: true,
    splitButton: false,
    maxHeight: 280,
  },
)

const emit = defineEmits<{
  command: [value: string | number]
  'visible-change': [visible: boolean]
}>()

const uid = useUid('je-dropdown')
const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const zIndex = ref(nextZIndex())

/**
 * 窄屏没有 hover，改成点一下切换，同时改成贴底弹出层。
 * 小程序端没有 window，恒按窄屏处理；H5 在挂载时按视口宽判一次
 * （口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
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

/** 方位的那条边，决定面板朝哪边长 */
const side = computed(() => props.placement.split('-')[0])
/** 对齐方式：start 贴起始边、end 贴结束边，缺省居中 */
const align = computed(() => props.placement.split('-')[1] ?? '')

const panelStyle = computed(() => {
  const style: Record<string, string | number> = { zIndex: zIndex.value }
  // 窄屏是贴底弹层，方位交给 CSS，只用内联 transform 跟手拖拽
  if (isMobile.value && isOpen.value) {
    style.transform = `translateY(${sheet.offset.value}px)`
    if (sheet.dragging.value) style.transition = 'none'
  }
  return style
})

const listStyle = computed(() =>
  isMobile.value ? undefined : { maxHeight: `${props.maxHeight}px` },
)

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const focusTrigger = () => {
  pick(rootRef.value)?.querySelector<HTMLElement>('[data-je-dropdown-trigger]')?.focus()
}

const getItems = () => {
  const menu = pick(menuRef.value)
  if (!menu || typeof menu.querySelectorAll !== 'function') return [] as HTMLElement[]
  return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
    (el) => el.getAttribute('aria-disabled') !== 'true',
  )
}

/**
 * 键盘高亮（roving focus）：方向键在可用项之间移动。
 * 当前项直接取事件目标，不碰 document；小程序端 keydown 永不触发，这条路径不会走到。
 */
const moveFocus = (step: number, current: EventTarget | null) => {
  const items = getItems()
  if (items.length === 0) return
  const index = current ? items.indexOf(current as HTMLElement) : -1
  const next =
    index < 0 ? (step > 0 ? 0 : items.length - 1) : (index + step + items.length) % items.length
  items[next]?.focus()
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
  emit('visible-change', false)
}

const closeAndRestore = () => {
  if (!isOpen.value) return
  close()
  focusTrigger()
}

const open = () => {
  if (props.disabled || isOpen.value) return
  sheet.reset()
  zIndex.value = nextZIndex()
  isOpen.value = true
  emit('visible-change', true)
}

const handleSelect = (command: string | number) => {
  emit('command', command)
  if (props.closeOnClick) closeAndRestore()
}

provide<JeDropdownContext>(jeDropdownKey, { handleSelect, close })

const onTriggerClick = () => {
  if (props.disabled) return
  if (isOpen.value) close()
  else open()
}

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) open()
    nextTick(() => moveFocus(event.key === 'ArrowDown' ? 1 : -1, null))
  } else if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    close()
  }
}

const onMenuKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveFocus(1, event.target)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveFocus(-1, event.target)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      // 交给子项自己的点击逻辑，选中 / 关闭只有一条路径
      ;(event.target as HTMLElement | null)?.click()
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      closeAndRestore()
      break
    case 'Tab':
      close()
      break
  }
}

/* 点外部关闭与页面级 Esc 只在 H5（桌面浮层形态）成立；小程序端没有 document，靠遮罩点击 */
// #ifdef H5
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.stopPropagation()
  closeAndRestore()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  // 面板不再传送出去，两者都在同一个组件根下，一起做「点外部」判定
  if (pick(rootRef.value)?.contains(target) || pick(panelRef.value)?.contains(target)) return
  close()
}
// #endif

// 悬停触发时留一点延迟，鼠标从触发区移到菜单途中不会误收起
let closeTimer: ReturnType<typeof setTimeout> | null = null

const clearCloseTimer = () => {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const scheduleClose = () => {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    closeTimer = null
    close()
  }, 120)
}

const onTriggerEnter = () => {
  if (isMobile.value || props.trigger !== 'hover' || props.disabled) return
  clearCloseTimer()
  open()
}

const onRootLeave = () => {
  if (isMobile.value || props.trigger !== 'hover' || !isOpen.value) return
  scheduleClose()
}

const onPanelEnter = () => {
  if (isMobile.value || props.trigger !== 'hover') return
  clearCloseTimer()
}

const onPanelLeave = () => {
  if (isMobile.value || props.trigger !== 'hover' || !isOpen.value) return
  scheduleClose()
}

// #ifdef H5
watch(isOpen, (value) => {
  if (value) document.addEventListener('keydown', onDocumentKeydown)
  else document.removeEventListener('keydown', onDocumentKeydown)
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
// #endif

watch(
  () => props.disabled,
  (value) => {
    if (value) close()
  },
)

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  setBodyScrollLock(false)
  // #endif
  clearCloseTimer()
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-dropdown"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled, 'je-dropdown--split': splitButton }"
    @mouseleave="onRootLeave"
  >
    <!-- 分裂按钮：主区域由业务自己放按钮，右侧箭头单独负责展开 -->
    <template v-if="splitButton">
      <view class="je-dropdown__main"><slot name="trigger" /></view>
      <button
        type="button"
        class="je-dropdown__caret"
        data-je-dropdown-trigger
        :disabled="disabled"
        aria-haspopup="menu"
        :aria-expanded="isOpen"
        :aria-controls="uid"
        aria-label="展开菜单"
        @tap="onTriggerClick"
        @keydown="onTriggerKeydown"
        @mouseenter="onTriggerEnter"
      >
        <JeIcon name="chevron-down" :size="16" />
      </button>
    </template>

    <button
      v-else
      type="button"
      class="je-dropdown__trigger"
      data-je-dropdown-trigger
      :disabled="disabled"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="uid"
      @tap="onTriggerClick"
      @keydown="onTriggerKeydown"
      @mouseenter="onTriggerEnter"
    >
      <text class="je-dropdown__label"><slot name="trigger" /></text>
      <JeIcon class="je-dropdown__caret-icon" name="chevron-down" :size="16" />
    </button>

    <!-- 窄屏点遮罩关闭；小程序端没有 document，只能靠这层接这一下，并吞掉穿透的滚动 -->
    <view
      v-if="isMobile"
      class="je-dropdown__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <!-- 面板就地渲染（无 Teleport）：桌面端 absolute 按方位落位，窄屏 fixed 贴底 -->
    <view
      ref="panelRef"
      class="je-dropdown__panel"
      :class="[`is-${side}`, align ? `is-align-${align}` : '', { 'is-open': isOpen }]"
      :style="panelStyle"
      @mouseenter="onPanelEnter"
      @mouseleave="onPanelLeave"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-dropdown__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <view
        :id="uid"
        ref="menuRef"
        class="je-dropdown__menu"
        :style="listStyle"
        role="menu"
        :aria-hidden="!isOpen"
        @keydown="onMenuKeydown"
      >
        <slot />
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-dropdown {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  font-family: inherit;
}

.je-dropdown--split {
  gap: 0;
}

.je-dropdown__main {
  display: inline-flex;
}

.je-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text-muted);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  cursor: pointer;
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease,
    border-color var(--je-duration) ease;
}

.je-dropdown__trigger:hover,
.je-dropdown.is-open .je-dropdown__trigger {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-dropdown__trigger:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-dropdown__label {
  display: inline-flex;
  align-items: center;
}

.je-dropdown__caret-icon,
.je-dropdown__caret {
  color: var(--je-text-faint);
  transition: transform 0.32s var(--je-ease-overshoot), color var(--je-duration) ease;
}

.je-dropdown__caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  min-width: 34px;
  padding: 0 9px;
  font-family: inherit;
  background: var(--je-surface);
  border: var(--je-border);
  border-left: none;
  border-radius: 0 var(--je-radius) var(--je-radius) 0;
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-dropdown__trigger::after,
.je-dropdown__caret::after {
  border: none;
}

.je-dropdown__caret:hover {
  background: var(--je-surface-hover);
}

.je-dropdown__caret:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 展开时箭头翻个身 */
.je-dropdown.is-open .je-dropdown__caret-icon,
.je-dropdown.is-open .je-dropdown__caret {
  color: var(--je-text);
  transform: rotate(180deg);
}

.je-dropdown__main :deep(.je-button) {
  border-radius: var(--je-radius) 0 0 var(--je-radius);
}

.je-dropdown.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* 收起态用 visibility 常驻 DOM，切 display 会让过渡失效 */
.je-dropdown__panel {
  position: absolute;
  z-index: 2000;
  box-sizing: border-box;
  min-width: 140px;
  max-width: calc(100vw - 24px);
  padding: 6px;
  font-family: inherit;
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

.je-dropdown__panel.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: transform 0.32s var(--je-ease-out-back), opacity 0.2s ease-out;
}

.je-dropdown__menu {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

/*
 * 桌面端方位全部交给 CSS（不再用 useFloating 量尺寸 + 内联定位），只按 placement 指定的
 * 边与对齐方式落位，不做碰撞检测与翻转。限定在宽屏，避免与窄屏贴底弹层的定位互相打架。
 */
@media (min-width: 769px) {
  .je-dropdown__panel.is-top {
    bottom: calc(100% + 6px);
    left: 50%;
    transform-origin: bottom center;
    transform: translateX(-50%) scale(0.94);
  }

  .je-dropdown__panel.is-top.is-open {
    transform: translateX(-50%) scale(1);
  }

  .je-dropdown__panel.is-top.is-align-start {
    left: 0;
    transform-origin: bottom left;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-top.is-align-start.is-open {
    transform: scale(1);
  }

  .je-dropdown__panel.is-top.is-align-end {
    right: 0;
    left: auto;
    transform-origin: bottom right;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-top.is-align-end.is-open {
    transform: scale(1);
  }

  .je-dropdown__panel.is-bottom {
    top: calc(100% + 6px);
    left: 50%;
    transform-origin: top center;
    transform: translateX(-50%) scale(0.94);
  }

  .je-dropdown__panel.is-bottom.is-open {
    transform: translateX(-50%) scale(1);
  }

  .je-dropdown__panel.is-bottom.is-align-start {
    left: 0;
    transform-origin: top left;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-bottom.is-align-start.is-open {
    transform: scale(1);
  }

  .je-dropdown__panel.is-bottom.is-align-end {
    right: 0;
    left: auto;
    transform-origin: top right;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-bottom.is-align-end.is-open {
    transform: scale(1);
  }

  .je-dropdown__panel.is-left {
    top: 50%;
    right: calc(100% + 6px);
    transform-origin: right center;
    transform: translateY(-50%) scale(0.94);
  }

  .je-dropdown__panel.is-left.is-open {
    transform: translateY(-50%) scale(1);
  }

  .je-dropdown__panel.is-left.is-align-start {
    top: 0;
    transform-origin: right top;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-left.is-align-start.is-open {
    transform: scale(1);
  }

  .je-dropdown__panel.is-left.is-align-end {
    top: auto;
    bottom: 0;
    transform-origin: right bottom;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-left.is-align-end.is-open {
    transform: scale(1);
  }

  .je-dropdown__panel.is-right {
    top: 50%;
    left: calc(100% + 6px);
    transform-origin: left center;
    transform: translateY(-50%) scale(0.94);
  }

  .je-dropdown__panel.is-right.is-open {
    transform: translateY(-50%) scale(1);
  }

  .je-dropdown__panel.is-right.is-align-start {
    top: 0;
    transform-origin: left top;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-right.is-align-start.is-open {
    transform: scale(1);
  }

  .je-dropdown__panel.is-right.is-align-end {
    top: auto;
    bottom: 0;
    transform-origin: left bottom;
    transform: scale(0.94);
  }

  .je-dropdown__panel.is-right.is-align-end.is-open {
    transform: scale(1);
  }
}

.je-dropdown__scrim {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1999;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-dropdown__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-dropdown__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-dropdown__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

/* 窄屏：底部弹出层，锁滚动、可下拉关闭、预留安全区 */
@media (max-width: 768px) {
  .je-dropdown__panel {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    min-width: 0;
    max-width: 100%;
    padding: 4px 12px calc(14px + env(safe-area-inset-bottom, 0px));
    border-bottom: none;
    border-radius: 22px 22px 0 0;
    transform-origin: bottom center;
    /* 列表在触屏上要能滚动，所以这里不能设 touch-action: none */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-dropdown__panel.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-dropdown__menu {
    max-height: 62vh;
  }

  .je-dropdown__trigger,
  .je-dropdown__caret {
    min-height: 44px;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-dropdown__panel,
  .je-dropdown__panel.is-open,
  .je-dropdown__scrim,
  .je-dropdown__scrim.is-open,
  .je-dropdown__caret,
  .je-dropdown__caret-icon {
    transition: none;
  }
}
</style>
