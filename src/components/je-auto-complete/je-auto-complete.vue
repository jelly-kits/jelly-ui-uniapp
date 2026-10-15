<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import JeIcon from '../je-icon/je-icon.vue'
import JeInput from '../je-input/je-input.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeAutoCompleteOption } from './types'

defineOptions({ name: 'JeAutoComplete' })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    /** 根据输入关键字返回候选；支持同步或异步 */
    fetchSuggestions: (
      query: string,
    ) => JeAutoCompleteOption[] | Promise<JeAutoCompleteOption[]>
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** 聚焦时立即拉取一次候选 */
    triggerOnFocus?: boolean
    /** 输入防抖毫秒数 */
    debounce?: number
    loadingText?: string
    emptyText?: string
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: '',
    placeholder: '',
    disabled: false,
    clearable: true,
    triggerOnFocus: true,
    debounce: 300,
    loadingText: '加载中…',
    emptyText: '无匹配结果',
    size: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [option: JeAutoCompleteOption]
  change: [value: string]
}>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-autocomplete--${size.value}`))

const uid = useUid('je-autocomplete')
const listId = `${uid}-listbox`

/* H5 用它做点外关闭；小程序端拿不到 DOM 引用，也不需要点外关闭（靠遮罩） */
const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const inputValue = ref(props.modelValue)
const options = ref<JeAutoCompleteOption[]>([])
const loading = ref(false)
const isOpen = ref(false)
/** 键盘高亮项下标，-1 表示无 */
const activeIndex = ref(-1)

let fetchTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null
/** 请求序号：异步返回时用它丢弃过期结果 */
let requestSeq = 0

watch(
  () => props.modelValue,
  (value) => {
    if (value !== inputValue.value) inputValue.value = value
  },
)

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

const open = () => {
  if (props.disabled) return
  sheet.reset()
  isOpen.value = true
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
  activeIndex.value = -1
}

const clearFetchTimer = () => {
  if (fetchTimer !== null) {
    clearTimeout(fetchTimer)
    fetchTimer = null
  }
}

const runFetch = async (query: string) => {
  const seq = ++requestSeq
  loading.value = true
  open()
  try {
    const result = await Promise.resolve(props.fetchSuggestions(query))
    if (seq !== requestSeq) return
    options.value = result ?? []
  } catch {
    if (seq === requestSeq) options.value = []
  } finally {
    if (seq === requestSeq) {
      loading.value = false
      activeIndex.value = -1
    }
  }
}

const scheduleFetch = (query: string) => {
  clearFetchTimer()
  fetchTimer = setTimeout(() => {
    fetchTimer = null
    void runFetch(query)
  }, props.debounce)
}

const selectOption = (option: JeAutoCompleteOption) => {
  if (option.disabled) return
  inputValue.value = option.value
  emit('update:modelValue', option.value)
  emit('change', option.value)
  emit('select', option)
  close()
}

const onInput = (value: string) => {
  inputValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
  scheduleFetch(value)
}

const onFocus = () => {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  if (!props.triggerOnFocus) return
  clearFetchTimer()
  void runFetch(inputValue.value)
}

const onBlur = () => {
  // 延后收起，给面板内选项的点击留出时间
  if (closeTimer !== null) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    closeTimer = null
    close()
  }, 120)
}

/** 方向键在可选项之间移动，自动跳过禁用项 */
const moveActive = (step: number) => {
  const list = options.value
  if (list.length === 0) return
  let next = activeIndex.value
  for (let i = 0; i < list.length; i += 1) {
    next += step
    if (next < 0) next = list.length - 1
    if (next >= list.length) next = 0
    const option = list[next]
    if (option && !option.disabled) {
      activeIndex.value = next
      return
    }
  }
}

/* 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) open()
      else moveActive(1)
      break

    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) open()
      else moveActive(-1)
      break

    case 'Enter': {
      const option = options.value[activeIndex.value]
      if (!isOpen.value || !option) return
      event.preventDefault()
      selectOption(option)
      break
    }

    case 'Escape':
      if (!isOpen.value) return
      event.preventDefault()
      close()
      break
  }
}

const clear = () => {
  inputValue.value = ''
  options.value = []
  emit('update:modelValue', '')
  emit('change', '')
  close()
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
  clearFetchTimer()
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  // #ifdef H5
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-autocomplete"
    :class="[sizeClass, { 'is-open': isOpen, 'is-disabled': disabled }]"
  >
    <view class="je-autocomplete__field">
      <JeInput
        class="je-autocomplete__input"
        :size="size"
        :model-value="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="isOpen"
        :aria-controls="listId"
        :aria-activedescendant="isOpen && activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined"
        @update:model-value="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />

      <button
        v-if="clearable && inputValue && !disabled"
        type="button"
        class="je-autocomplete__clear"
        aria-label="清空输入"
        @tap="clear"
      >
        <JeIcon name="close" :size="14" />
      </button>
    </view>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-autocomplete__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="listId"
      ref="panelRef"
      class="je-autocomplete__panel"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      role="listbox"
      aria-label="候选项"
      :aria-hidden="!isOpen"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-autocomplete__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <view v-if="loading" class="je-autocomplete__status" role="status">
        <JeIcon name="loading" :size="14" spin />
        <text>{{ loadingText }}</text>
      </view>

      <template v-else-if="options.length > 0">
        <view
          v-for="(option, index) in options"
          :id="`${uid}-opt-${index}`"
          :key="option.value"
          class="je-autocomplete__option"
          :class="{ 'is-active': index === activeIndex, 'is-option-disabled': option.disabled }"
          role="option"
          :aria-selected="index === activeIndex"
          :aria-disabled="option.disabled || undefined"
          @tap="selectOption(option)"
        >
          {{ option.label ?? option.value }}
        </view>
      </template>

      <view v-else class="je-autocomplete__status">{{ emptyText }}</view>
    </view>
  </view>
</template>

<style scoped>
.je-autocomplete {
  position: relative;
  font-family: inherit;
}

.je-autocomplete__field {
  position: relative;
}

/* 有清空按钮时给输入框右侧留出空间（padding 由外框转交到内部控件上） */
.je-autocomplete :deep(.je-input) {
  padding-right: 40px;
}

/* 尺寸三档：高度与字号由内部 JeInput 承担（size 已透传），这里只把清空按钮的让位区按档位收放。
   三档与 je-input 同口径，同一表单行里的控件能对齐 */
.je-autocomplete--small :deep(.je-input) {
  padding-right: 36px;
}

.je-autocomplete--large :deep(.je-input) {
  padding-right: 44px;
}

.je-autocomplete__clear {
  position: absolute;
  top: 50%;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  color: var(--je-text-faint);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transform: translateY(-50%);
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-autocomplete__clear::after {
  border: none;
}

.je-autocomplete__clear:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-autocomplete__clear:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 面板常驻 DOM，收起态用 visibility，过渡才不会被 display 打断；
   桌面端就地挂在输入框下方；小程序端没有 body，不能靠 teleport + fixed 定位 */
.je-autocomplete__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 50;
  box-sizing: border-box;
  min-width: 200px;
  max-width: calc(100vw - 24px);
  max-height: 280px;
  overflow-y: auto;
  padding: 6px;
  font-family: inherit;
  font-size: 14px;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top left;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.96) translateY(-6px);
  transition: transform 0.24s ease-in, opacity 0.18s ease-in, visibility 0s linear 0.24s;
}

.je-autocomplete__panel.is-open {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: scale(1) translateY(0);
  transition: transform 0.32s var(--je-ease-out-back), opacity 0.2s ease-out;
}

.je-autocomplete__option {
  padding: 10px 12px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  transition: background var(--je-duration) ease, color var(--je-duration) ease;
}

.je-autocomplete__option:hover,
.je-autocomplete__option.is-active {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 24%, transparent);
}

.je-autocomplete__option.is-option-disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.je-autocomplete__status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 12px;
  font-size: 13px;
  color: var(--je-text-faint);
}

.je-autocomplete__status :deep(.je-icon) {
  color: var(--je-primary);
}

.je-autocomplete__scrim {
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

.je-autocomplete__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-autocomplete__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-autocomplete__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

/* 窄屏：底部弹出层；面板不设 touch-action，内部列表才能滚动 */
@media (max-width: 768px) {
  .je-autocomplete__panel {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 101;
    width: 100%;
    max-width: 100%;
    max-height: 70vh;
    padding: 4px 12px calc(14px + env(safe-area-inset-bottom, 0px));
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    transform-origin: bottom center;
    /* 这里不能设 touch-action: none，否则选项列表在触屏上没法滚动；
       拖拽手势的 touch-action 由 .je-autocomplete__handle 单独承担 */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-autocomplete__panel.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-autocomplete__option {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 12px 16px;
    font-size: 15px;
  }

  .je-autocomplete__clear {
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-autocomplete__clear,
  .je-autocomplete__panel,
  .je-autocomplete__panel.is-open,
  .je-autocomplete__scrim {
    transition: none;
  }
}
</style>
