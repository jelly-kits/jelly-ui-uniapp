<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeCascaderOption, JeCascaderValue } from './types'

defineOptions({ name: 'JeCascader' })

const props = withDefaults(
  defineProps<{
    modelValue?: JeCascaderValue
    options: JeCascaderOption[]
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: () => [],
    placeholder: '请选择',
    disabled: false,
    clearable: true,
    size: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeCascaderValue]
  change: [value: JeCascaderValue]
  clear: []
}>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-cascader--${size.value}`))

/** 右侧箭头随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

const uid = useUid('je-cascader')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
/** 面板里当前走到的路径（可能还没选到叶子） */
const activePath = ref<JeCascaderValue>([])
/** 当前列里键盘高亮的下标，-1 表示无 */
const focusIndex = ref(-1)
/** scroll-view 的布尔属性走 ref 下发（mp 端静态字面量 false 有丢失历史） */
const showScrollbar = ref(false)

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

/** 按 activePath 一路展开出各列，最后一项就是当前操作的层级 */
const columns = computed(() => {
  const result: JeCascaderOption[][] = [props.options]
  let list = props.options
  for (const value of activePath.value) {
    const node = list.find((item) => item.value === value)
    const children = node?.children
    if (!children || children.length === 0) break
    result.push(children)
    list = children
  }
  return result
})

/** 移动端逐级选择：一屏只显示当前这一列；level 保留真实层级，方便定位 a11y id */
const visibleColumns = computed(() => {
  if (!isMobile.value) {
    return columns.value.map((list, level) => ({ level, list }))
  }
  const level = columns.value.length - 1
  return [{ level, list: columns.value[level] ?? [] }]
})

/** 当前操作层级在 columns 里的下标 */
const activeLevel = computed(() => columns.value.length - 1)

const currentOptions = computed(
  () => visibleColumns.value[visibleColumns.value.length - 1]?.list ?? [],
)

const labelsOf = (path: JeCascaderValue): string[] => {
  const labels: string[] = []
  let list = props.options
  for (const value of path) {
    const node = list.find((item) => item.value === value)
    if (!node) break
    labels.push(node.label)
    list = node.children ?? []
  }
  return labels
}

const displayText = computed(() => labelsOf(props.modelValue).join(' / '))

const crumbText = computed(() => labelsOf(activePath.value).join(' / ') || props.placeholder)

const hasValue = computed(() => labelsOf(props.modelValue).length > 0)

const activeDescendant = computed(() => {
  if (!isOpen.value || focusIndex.value < 0) return undefined
  return `${uid}-opt-${activeLevel.value}-${focusIndex.value}`
})

const isSelectedAt = (level: number, option: JeCascaderOption) =>
  activePath.value[level] === option.value

const open = () => {
  sheet.reset()
  activePath.value = [...props.modelValue]
  isOpen.value = true
  const last = activePath.value[activePath.value.length - 1]
  focusIndex.value = currentOptions.value.findIndex((item) => item.value === last)
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

/** 点 / 回车某一项：非叶子继续展开，叶子即提交并关闭 */
const selectOption = (option: JeCascaderOption, level: number) => {
  if (option.disabled) return
  const path = activePath.value.slice(0, level)
  path.push(option.value)
  activePath.value = path
  focusIndex.value = -1

  if (!option.children || option.children.length === 0) {
    emit('update:modelValue', [...path])
    emit('change', [...path])
    close()
  }
}

/** 返回上一级（窄屏逐级选择 / 方向键左） */
const goBack = () => {
  if (activePath.value.length === 0) return
  activePath.value = activePath.value.slice(0, -1)
  focusIndex.value = -1
}

const clear = () => {
  activePath.value = []
  emit('update:modelValue', [])
  emit('clear')
}

const moveFocus = (step: number) => {
  const list = currentOptions.value
  const count = list.length
  if (count === 0) return
  const base = focusIndex.value < 0 ? (step > 0 ? -1 : 0) : focusIndex.value
  let next = base
  for (let index = 0; index < count; index += 1) {
    next = (next + step + count) % count
    const option = list[next]
    if (option && !option.disabled) {
      focusIndex.value = next
      return
    }
  }
}

const currentOption = () => currentOptions.value[focusIndex.value]

const commitFocus = () => {
  const option = currentOption()
  if (option) selectOption(option, activeLevel.value)
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
      moveFocus(event.key === 'ArrowDown' ? 1 : -1)
      break

    case 'ArrowRight':
      if (!isOpen.value) return
      event.preventDefault()
      commitFocus()
      break

    case 'ArrowLeft':
      if (!isOpen.value) return
      event.preventDefault()
      goBack()
      break

    // 空格键的 event.key 是单个空格字符
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (!isOpen.value) {
        open()
        return
      }
      commitFocus()
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

watch(
  () => props.modelValue,
  (value) => {
    if (!isOpen.value) activePath.value = [...value]
  },
)

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
  <view ref="rootRef" class="je-cascader" :class="[sizeClass, { 'is-open': isOpen, 'is-disabled': disabled }]">
    <view
      ref="triggerRef"
      class="je-cascader__trigger"
      :class="{ 'has-value': hasValue }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="`${uid}-panel`"
      :aria-activedescendant="activeDescendant"
      :tabindex="disabled ? -1 : 0"
      @tap="toggle"
      @keydown="onKeydown"
    >
      <text class="je-cascader__label">{{ displayText || placeholder }}</text>
      <button
        v-if="clearable && hasValue && !disabled"
        type="button"
        class="je-cascader__clear"
        aria-label="清除"
        @tap.stop="clear"
      >
        <JeIcon name="close" :size="14" />
      </button>
      <JeIcon class="je-cascader__arrow" name="chevron-down" :size="iconSize" />
    </view>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-cascader__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="`${uid}-panel`"
      ref="panelRef"
      class="je-cascader__panel"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      :aria-hidden="!isOpen"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-cascader__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <view v-if="isMobile" class="je-cascader__head">
        <button
          v-if="activePath.length > 0"
          type="button"
          class="je-cascader__back"
          aria-label="返回上一级"
          @tap="goBack"
        >
          <JeIcon name="chevron-left" :size="16" />
        </button>
        <text class="je-cascader__crumb">{{ crumbText }}</text>
      </view>

      <view class="je-cascader__columns">
        <scroll-view
          v-for="entry in visibleColumns"
          :key="entry.level"
          class="je-cascader__column"
          scroll-y
          role="listbox"
          :aria-label="`第 ${entry.level + 1} 级`"
          :show-scrollbar="showScrollbar"
        >
          <view
            v-for="(option, index) in entry.list"
            :id="`${uid}-opt-${entry.level}-${index}`"
            :key="option.value"
            class="je-cascader__option"
            :class="{
              'is-active': entry.level === activeLevel && index === focusIndex,
              'is-path': isSelectedAt(entry.level, option),
              'is-disabled': option.disabled,
            }"
            role="option"
            :aria-selected="isSelectedAt(entry.level, option)"
            :aria-disabled="option.disabled"
            @tap="selectOption(option, entry.level)"
          >
            <text class="je-cascader__option-label">{{ option.label }}</text>
            <JeIcon
              v-if="option.children && option.children.length > 0"
              name="chevron-right"
              :size="14"
              class="je-cascader__option-arrow"
            />
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-cascader {
  position: relative;
  font-family: inherit;
  user-select: none;
}

.je-cascader__trigger {
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
.je-cascader--small .je-cascader__trigger {
  height: var(--je-touch-h-sm);
  padding: 0 12px;
  font-size: 14px;
}

.je-cascader--large .je-cascader__trigger {
  height: var(--je-touch-h-lg);
  padding: 0 20px;
  font-size: 17px;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-cascader__clear::after,
.je-cascader__back::after {
  border: none;
}

.je-cascader__trigger.has-value {
  color: var(--je-text);
}

/* 聚焦与展开共用同一套高亮 */
.je-cascader__trigger:focus-visible,
.je-cascader.is-open .je-cascader__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-cascader__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-cascader__clear {
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

.je-cascader__clear:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

/* 右侧统一用 chevron-down 图标（与 je-picker / je-select 同款），展开时翻转 180°。
   颜色不写死，跟着触发器的 color 走：空态是浅灰，has-value 时自动变正文色 */
.je-cascader__arrow {
  flex-shrink: 0;
  transition: transform var(--je-duration) ease;
}

.je-cascader.is-open .je-cascader__arrow {
  transform: rotate(180deg);
}

.je-cascader.is-disabled .je-cascader__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 桌面端就地挂在触发按钮左下；小程序端没有 body，不能靠 teleport + fixed 定位 */
.je-cascader__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  box-sizing: border-box;
  padding: 6px;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top left;
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.94) translateY(-6px);
  transition: transform 0.28s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.28s;
}

.je-cascader__panel.is-open {
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: transform 0.38s var(--je-ease-out-back), opacity 0.24s ease-out;
}

.je-cascader__columns {
  display: flex;
  gap: 4px;
}

/* 列改成 scroll-view：小程序端 overflow 不滚动，滚动交给原生滚动 */
.je-cascader__column {
  width: 168px;
  max-height: 236px;
  padding: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--je-border-color) transparent;
}

.je-cascader__column + .je-cascader__column {
  border-left: var(--je-border);
}

.je-cascader__column::-webkit-scrollbar {
  width: 4px;
}

.je-cascader__column::-webkit-scrollbar-thumb {
  background: var(--je-border-color);
  border-radius: 2px;
}

.je-cascader__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.je-cascader__option:hover,
.je-cascader__option.is-active {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 20%, transparent);
}

.je-cascader__option.is-path {
  font-weight: 600;
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 35%, transparent);
}

.je-cascader__option.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.je-cascader__option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-cascader__option-arrow {
  flex-shrink: 0;
  color: var(--je-text-faint);
}

.je-cascader__scrim {
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

.je-cascader__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-cascader__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-cascader__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

.je-cascader__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px 8px;
}

.je-cascader__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  color: var(--je-text-muted);
  background: none;
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
}

.je-cascader__back:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-cascader__crumb {
  overflow: hidden;
  font-size: 13px;
  color: var(--je-text-faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 窄屏：面板改成贴底的弹出层，逐级选择一屏一列 */
@media (max-width: 768px) {
  .je-cascader__panel {
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
    /* 这里不能设 touch-action: none，否则列在触屏上没法滚动；
       拖拽手势的 touch-action 由 .je-cascader__handle 单独承担 */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-cascader__panel.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-cascader__columns {
    display: block;
  }

  .je-cascader__column {
    width: 100%;
    max-height: 52vh;
    padding: 0;
  }

  .je-cascader__column + .je-cascader__column {
    border-left: none;
  }

  .je-cascader__option {
    min-height: 48px;
    padding: 12px 16px;
    font-size: 15px;
  }

  .je-cascader__clear {
    width: 32px;
    height: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-cascader__panel,
  .je-cascader__panel.is-open,
  .je-cascader__scrim,
  .je-cascader__arrow {
    transition: none;
  }
}
</style>
