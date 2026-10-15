<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeTimeSelectValue } from './types'

defineOptions({ name: 'JeTimeSelect' })

const props = withDefaults(
  defineProps<{
    modelValue?: JeTimeSelectValue
    /** 起始时间，形如 "08:00" */
    start?: string
    /** 结束时间，形如 "20:00" */
    end?: string
    /** 步长，形如 "00:30" */
    step?: string
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** 可选下限（含） */
    minTime?: string
    /** 可选上限（含） */
    maxTime?: string
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: '',
    start: '08:00',
    end: '20:00',
    step: '00:30',
    placeholder: '请选择时间',
    disabled: false,
    clearable: true,
    size: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeTimeSelectValue]
  change: [value: JeTimeSelectValue]
  clear: []
}>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-time-select--${size.value}`))

/** 右侧箭头随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

const uid = useUid('je-time-select')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
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

const pad = (value: number) => String(value).padStart(2, '0')

/** 把 "HH:mm" 换算成分钟数，非法输入返回 null */
const toMinutes = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

const toLabel = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

/** 按 step 从 start 铺到 end，再用 minTime / maxTime 夹一遍 */
const options = computed(() => {
  const startMinutes = toMinutes(props.start)
  const endMinutes = toMinutes(props.end)
  const stepMinutes = toMinutes(props.step)
  if (startMinutes === null || endMinutes === null || stepMinutes === null || stepMinutes <= 0) {
    return []
  }
  const min = props.minTime ? toMinutes(props.minTime) : null
  const max = props.maxTime ? toMinutes(props.maxTime) : null

  const list: string[] = []
  for (let value = startMinutes; value <= endMinutes; value += stepMinutes) {
    if (min !== null && value < min) continue
    if (max !== null && value > max) continue
    list.push(toLabel(value))
  }
  return list
})

const hasValue = computed(() => !!props.modelValue)

const open = () => {
  sheet.reset()
  isOpen.value = true
  activeIndex.value = options.value.indexOf(props.modelValue)
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

const select = (option: string) => {
  if (option !== props.modelValue) {
    emit('update:modelValue', option)
    emit('change', option)
  }
  close()
  triggerRef.value?.focus?.()
}

const clear = () => {
  emit('update:modelValue', '')
  emit('clear')
}

const moveActive = (step: number) => {
  const count = options.value.length
  if (count === 0) return
  // activeIndex 为 -1 时：向下从第一项开始，向上从最后一项开始
  const base = activeIndex.value < 0 ? (step > 0 ? -1 : 0) : activeIndex.value
  activeIndex.value = (base + step + count) % count
}

const commitActive = () => {
  const option = options.value[activeIndex.value]
  if (option) select(option)
}

/* 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onTriggerKeydown = (event: KeyboardEvent) => {
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

/* 点选外部关闭与页面级 Esc 只在 H5（桌面下拉形态）成立，小程序端靠遮罩点击 */
// #ifdef H5
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  close()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node
  if (rootRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  close()
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
// #endif

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  setBodyScrollLock(false)
  // #endif
})

/** 拖拽时用内联 transform 覆盖面板的滑入位移，松手后交还给 CSS 过渡 */
const panelStyle = computed(() => {
  if (!isMobile.value || !isOpen.value) return undefined
  return {
    transform: `translateY(${sheet.offset.value}px)`,
    transition: sheet.dragging.value ? 'none' : undefined,
  }
})
</script>

<template>
  <view ref="rootRef" class="je-time-select" :class="[sizeClass, { 'is-open': isOpen, 'is-disabled': disabled }]">
    <view
      ref="triggerRef"
      class="je-time-select__trigger"
      :class="{ 'has-value': hasValue }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="`${uid}-listbox`"
      :aria-activedescendant="isOpen && activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined"
      :tabindex="disabled ? -1 : 0"
      @tap="toggle"
      @keydown="onTriggerKeydown"
    >
      <text class="je-time-select__label">{{ modelValue || placeholder }}</text>
      <button
        v-if="clearable && hasValue && !disabled"
        type="button"
        class="je-time-select__clear"
        aria-label="清除"
        @tap.stop="clear"
      >
        <JeIcon name="close" :size="14" />
      </button>
      <JeIcon class="je-time-select__arrow" name="chevron-down" :size="iconSize" />
    </view>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-time-select__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="`${uid}-listbox`"
      ref="panelRef"
      class="je-time-select__list"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      role="listbox"
      :aria-label="placeholder"
      :aria-hidden="!isOpen"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-time-select__handle"
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
        :key="option"
        class="je-time-select__item"
        :class="{ 'is-active': index === activeIndex, 'is-selected': option === modelValue }"
        role="option"
        :aria-selected="option === modelValue"
        @tap="select(option)"
      >
        {{ option }}
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-time-select {
  position: relative;
  font-family: inherit;
  user-select: none;
}

.je-time-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  /* 定高 44px，与 je-input / je-select 同一档；宽度由左右内边距撑 */
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

/* 尺寸三档：只覆盖高度 / 左右内边距 / 字号，配色、圆角、交互状态都沿用基础样式。
   三档与 je-input 同口径，同一表单行里的控件能对齐 */
.je-time-select--small .je-time-select__trigger {
  height: var(--je-touch-h-sm);
  padding: 0 12px;
  font-size: 14px;
}

.je-time-select--large .je-time-select__trigger {
  height: var(--je-touch-h-lg);
  padding: 0 20px;
  font-size: 17px;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-time-select__clear::after {
  border: none;
}

.je-time-select__trigger.has-value {
  color: var(--je-text);
}

/* 聚焦与展开共用同一套高亮 */
.je-time-select__trigger:focus-visible,
.je-time-select.is-open .je-time-select__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-time-select__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-time-select__clear {
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

.je-time-select__clear:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

/* 右侧统一用 chevron-down 图标（与 je-picker / je-select 同款），展开时翻转 180°。
   颜色不写死，跟着触发器的 color 走：空态是浅灰，has-value 时自动变正文色 */
.je-time-select__arrow {
  flex-shrink: 0;
  transition: transform var(--je-duration) ease;
}

.je-time-select.is-open .je-time-select__arrow {
  transform: rotate(180deg);
}

.je-time-select.is-disabled .je-time-select__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 桌面端就地挂在触发按钮下方；小程序端没有 body，不能靠 teleport + fixed 定位 */
.je-time-select__list {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 50;
  box-sizing: border-box;
  max-height: 264px;
  padding: 6px;
  overflow-y: auto;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top center;
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.94) translateY(-6px);
  transition: transform 0.28s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.28s;
}

.je-time-select__list.is-open {
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: transform 0.38s var(--je-ease-out-back), opacity 0.24s ease-out;
}

.je-time-select__item {
  padding: 11px 14px;
  font-size: 14px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease,
    transform var(--je-duration) var(--je-ease-overshoot);
}

.je-time-select__item:hover,
.je-time-select__item.is-active {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 20%, transparent);
  transform: translateX(4px);
}

/* 选中态用 state 类：小程序端不支持属性选择器 */
.je-time-select__item.is-selected {
  color: var(--je-text);
  font-weight: 600;
  background: color-mix(in srgb, var(--je-primary) 35%, transparent);
}

.je-time-select__scrim {
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

.je-time-select__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-time-select__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-time-select__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

/* 窄屏：面板改成贴底的弹出层，并预留给安全区 */
@media (max-width: 768px) {
  .je-time-select__list {
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
    /* 这里不能设 touch-action: none，否则选项列表在触屏上没法滚动；
       拖拽手势的 touch-action 由 .je-time-select__handle 单独承担 */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-time-select__list.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-time-select__item {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 12px 16px;
    font-size: 15px;
  }

  /* 触屏没有 hover，位移高亮改由选中 / 键盘高亮承担 */
  .je-time-select__item:hover {
    transform: none;
  }

  .je-time-select__clear {
    width: 32px;
    height: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-time-select__list,
  .je-time-select__list.is-open,
  .je-time-select__scrim,
  .je-time-select__arrow {
    transition: none;
  }
}
</style>
