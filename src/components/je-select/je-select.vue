<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import type { JeSelectOption } from './types'

defineOptions({ name: 'JeSelect' })

const props = withDefaults(
  defineProps<{
    /** 当前选中值 */
    modelValue?: string | number | null
    /** 选项列表 */
    options: JeSelectOption[]
    /** 未选择时的占位文字 */
    placeholder?: string
    /** 禁用 */
    disabled?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: null,
    options: () => [],
    placeholder: '请选择',
    disabled: false,
    size: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-select--${size.value}`))

/** 右侧箭头随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

const uid = useUid('je-select')
const isOpen = ref(false)
/** 键盘高亮项的下标，-1 表示无 */
const activeIndex = ref(-1)

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

const selectedIndex = computed(() => props.options.findIndex((item) => item.value === props.modelValue))
const selectedOption = computed<JeSelectOption | undefined>(() => props.options[selectedIndex.value])
const selectedLabel = computed(() => selectedOption.value?.label ?? '')

const open = () => {
  sheet.reset()
  isOpen.value = true
  activeIndex.value = props.options.findIndex((item) => item.value === props.modelValue)
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

const select = (option: JeSelectOption) => {
  if (option.value !== props.modelValue) emit('update:modelValue', option.value)
  close()
  triggerRef.value?.focus?.()
}

const moveActive = (step: number) => {
  const count = props.options.length
  if (count === 0) return
  // activeIndex 为 -1 时：向下从第一项开始，向上从最后一项开始
  const base = activeIndex.value < 0 ? (step > 0 ? -1 : 0) : activeIndex.value
  activeIndex.value = (base + step + count) % count
}

const commitActive = () => {
  const option = props.options[activeIndex.value]
  if (option) select(option)
}

/* 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return

  switch (event.key) {
    case 'Escape':
      if (!isOpen.value) return
      event.preventDefault()
      close()
      break

    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) {
        open()
        return
      }
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
      break

    // 空格键的 event.key 是单个空格字符
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (!isOpen.value) {
        open()
        return
      }
      commitActive()
      break
  }
}

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

/* 点选外部关闭只在 H5（桌面下拉形态）成立，小程序端靠遮罩点击 */
// #ifdef H5
const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node
  if (rootRef.value?.contains(target)) return
  if (menuRef.value?.contains(target)) return
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
    class="je-select"
    :class="[sizeClass, { 'is-open': isOpen, 'is-disabled': disabled }]"
    @keydown="onKeydown"
  >
    <view
      ref="triggerRef"
      class="je-select__trigger"
      :class="{ 'has-value': !!selectedLabel }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="`${uid}-listbox`"
      :aria-activedescendant="isOpen && activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined"
      :tabindex="disabled ? -1 : 0"
      @tap="toggle"
    >
      <text v-if="$slots.prefix" class="je-select__prefix">
        <slot name="prefix" />
      </text>

      <text class="je-select__label">
        <slot name="label" :index="selectedIndex" :label="selectedLabel" :value="modelValue">
          {{ selectedLabel || placeholder }}
        </slot>
      </text>

      <JeIcon class="je-select__arrow" name="chevron-down" :size="iconSize" />
    </view>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-select__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="`${uid}-listbox`"
      ref="menuRef"
      class="je-select__menu"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      role="listbox"
      :aria-hidden="!isOpen"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-select__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <view
        v-for="(option, index) in options"
        :id="`${uid}-opt-${index}`"
        :key="option.value"
        class="je-select__item"
        :class="{
          'is-selected': option.value === modelValue,
          'is-active': index === activeIndex,
        }"
        role="option"
        :aria-selected="option.value === modelValue"
        @tap="select(option)"
      >
        <slot name="option" :item="option" :index="index">{{ option.label }}</slot>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-select {
  position: relative;
  font-family: inherit;
  user-select: none;
}

.je-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
  /* 定高 44px，与 je-input / je-button 同一档；宽度由左右内边距撑 */
  height: var(--je-touch-h);
  padding: 0 16px;
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

.je-select__trigger.has-value {
  color: var(--je-text);
}

/* 尺寸三档：只覆盖高度 / 左右内边距 / 字号，配色、圆角、交互状态都沿用基础样式。
   三档与 je-input 同口径，同一表单行里的控件能对齐 */
.je-select--small .je-select__trigger {
  height: var(--je-touch-h-sm);
  padding: 0 12px;
  font-size: 14px;
}

.je-select--large .je-select__trigger {
  height: var(--je-touch-h-lg);
  padding: 0 20px;
  font-size: 17px;
}

/* 聚焦与展开共用同一套高亮，键盘用户也能看清当前焦点 */
.je-select__trigger:focus-visible,
.je-select.is-open .je-select__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-select__label {
  /* 撑满剩余宽度，把箭头推到最右（有 prefix 插槽时也不会被 space-between 挤到中间） */
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* prefix 插槽：图标 / 色块等，放在选中内容前面 */
.je-select__prefix {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}

/* 右侧统一用 chevron-down 图标（与 je-picker / je-area 同款），展开时翻转 180°。
   颜色不写死，跟着触发器的 color 走：空态是浅灰，has-value 时自动变正文色 */
.je-select__arrow {
  flex-shrink: 0;
  transition: transform var(--je-duration) ease;
}

.je-select.is-open .je-select__arrow {
  transform: rotate(180deg);
}

.je-select__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 50;
  padding: 6px;
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top center;
  /* 收起后必须屏蔽点击，否则动画期间面板是「隐形可点」的 */
  pointer-events: none;
  will-change: transform, opacity;
  /* 默认态就是收起态。展开方向用 .is-open 里的回弹过渡，收起方向用这里的 ease-in 过渡 */
  opacity: 0;
  visibility: hidden;
  transform: scale(0.94) translateY(-6px);
  /* visibility 要等收起动画跑完再切，否则面板会当场消失、看不到收起过程 */
  transition: transform 0.28s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.28s;
}

.je-select__menu.is-open {
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
  transform: scale(1, 1) translateY(0);
  /* 展开即回弹，visibility 立即生效 */
  transition: transform 0.38s var(--je-ease-out-back), opacity 0.24s ease-out;
}

.je-select__item {
  /* 选项内容由 option 插槽决定，这里用 flex 让图标 / 色块和文字对齐 */
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  font-size: 14px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease,
    transform var(--je-duration) var(--je-ease-overshoot);
}

.je-select__item:hover,
.je-select__item.is-active {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 20%, transparent);
  transform: translateX(4px);
}

.je-select__item.is-selected {
  color: var(--je-text);
  font-weight: 600;
  background: color-mix(in srgb, var(--je-primary) 35%, transparent);
}

.je-select.is-disabled .je-select__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-select__scrim {
  position: fixed;
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

.je-select__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-select__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-select__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

/* 窄屏：面板改成贴底的弹出层，并预留给安全区 */
@media (max-width: 768px) {
  .je-select__menu {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 101;
    max-height: 72vh;
    overflow-y: auto;
    padding: 4px 12px calc(14px + env(safe-area-inset-bottom, 0px));
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    transform-origin: bottom center;
    /* 这里不能设 touch-action: none，否则选项列表在触屏上没法滚动；
       拖拽手势的 touch-action 由 .je-select__handle 单独承担 */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-select__menu.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-select__item {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 12px 16px;
    font-size: 15px;
  }

  /* 触屏没有 hover，位移高亮改由选中 / 键盘高亮承担 */
  .je-select__item:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 展开 / 收起都直接切到位，不做过渡 */
  .je-select__arrow,
  .je-select__menu,
  .je-select__menu.is-open,
  .je-select__scrim {
    transition: none;
  }
}
</style>
