<script setup lang="ts">
import { computed, ref } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import { useJeLocale } from '../je-locale'

defineOptions({ name: 'JeSearch' })

const props = withDefaults(
  defineProps<{
    /** 搜索关键字 */
    modelValue?: string
    /** 输入框占位提示 */
    placeholder?: string
    /** 外形：胶囊 / 圆角方形 */
    shape?: 'round' | 'square'
    /** 输入框背景，传任意 CSS 颜色；不传则用主题表面色 */
    background?: string
    disabled?: boolean
    readonly?: boolean
    maxlength?: number
    /** 右侧显示「取消」按钮（移动端常见） */
    showCancel?: boolean
    /** 取消按钮文案，未传时用语言包的 cancel 文案 */
    cancelText?: string
    /** 有内容时显示清除按钮 */
    clearable?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: '',
    placeholder: '请输入关键字',
    shape: 'round',
    background: '',
    disabled: false,
    readonly: false,
    maxlength: undefined,
    showCancel: false,
    cancelText: undefined,
    clearable: true,
    size: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** 键盘回车或点击右侧搜索区时触发 */
  search: [value: string]
  /** 点击取消按钮 */
  cancel: []
  /** 点击清除按钮 */
  clear: []
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const { t } = useJeLocale()

/** 取消按钮文案：外部优先，未传时回退语言包的通用取消 */
const cancelText = computed(() => props.cancelText ?? t('cancel'))

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-search--${size.value}`))

/** 右侧箭头随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

const focused = ref(false)
/** 仅 H5 用来在「清除」后把焦点还回输入框，小程序端不持有 DOM 引用 */
const inputRef = ref<{ focus?: () => void } | null>(null)

const showClear = computed(
  () => props.clearable && !props.disabled && !props.readonly && props.modelValue.length > 0,
)

/** 只在传了自定义背景时才注入变量，否则走 CSS 里的默认值 */
const rootStyle = computed(() =>
  props.background ? { '--je-search-bg': props.background } : undefined,
)

/**
 * uni 的 input 把值放在 `event.detail.value`（H5 与小程序一致），
 * 所以不能像原生 DOM 那样读 `event.target.value`。
 */
const onInput = (event: Event) => {
  const detail = (event as unknown as { detail?: { value?: string } }).detail
  emit('update:modelValue', detail?.value ?? '')
}

/** 键盘回车 / 软键盘的「搜索」键都会走 confirm */
const onSearch = () => {
  if (props.disabled) return
  emit('search', props.modelValue)
}

const onClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  // #ifdef H5
  inputRef.value?.focus?.()
  // #endif
}

const onCancel = () => {
  emit('cancel')
}

const onFocus = (event: FocusEvent) => {
  focused.value = true
  emit('focus', event)
}

const onBlur = (event: FocusEvent) => {
  focused.value = false
  emit('blur', event)
}
</script>

<template>
  <div
    class="je-search"
    :class="[sizeClass, `je-search--${shape}`, { 'is-focused': focused, 'is-disabled': disabled }]"
    :style="rootStyle"
  >
    <div class="je-search__field">
      <JeIcon class="je-search__icon" name="search" :size="iconSize" />

      <input
        ref="inputRef"
        class="je-search__input"
        type="text"
        confirm-type="search"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength ?? -1"
        @input="onInput"
        @confirm="onSearch"
        @focus="onFocus"
        @blur="onBlur"
      >

      <button
        v-if="showClear"
        type="button"
        class="je-search__clear"
        aria-label="清除"
        @click="onClear"
      >
        <JeIcon name="close" :size="12" />
      </button>
    </div>

    <button
      v-if="showCancel"
      type="button"
      class="je-search__cancel"
      :disabled="disabled"
      @click="onCancel"
    >
      {{ cancelText }}
    </button>
  </div>
</template>

<style scoped>
.je-search {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  /* 输入框底色，可被 background 属性覆盖 */
  --je-search-bg: var(--je-surface);
}

.je-search__field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-width: 0;
  height: 42px;
  padding: 0 14px;
  color: var(--je-text-faint);
  background: var(--je-search-bg);
  border: 1.5px solid transparent;
  transition: border-color var(--je-duration) ease, box-shadow var(--je-duration) ease;
}

/* 尺寸三档：只覆盖高度 / 左右内边距 / 字号，配色、圆角、交互状态都沿用基础样式。
   三档与 je-input 同口径，同一表单行里的控件能对齐。
   高度承载元素是 .je-search__field（外层输入容器），取消按钮同步跟齐 */
.je-search--small .je-search__field,
.je-search--small .je-search__cancel {
  height: var(--je-touch-h-sm);
}

.je-search--small .je-search__field {
  padding: 0 10px;
}

/* H5 下 uni 会把 <input> 包成 uni-input，真实输入框与自绘占位符有独立字号，需一并覆盖 */
.je-search--small .je-search__input,
.je-search--small .je-search__cancel,
.je-search--small :deep(.uni-input-input),
.je-search--small :deep(.uni-input-placeholder) {
  font-size: 14px;
}

.je-search--large .je-search__field,
.je-search--large .je-search__cancel {
  height: var(--je-touch-h-lg);
}

.je-search--large .je-search__field {
  padding: 0 18px;
}

.je-search--large .je-search__input,
.je-search--large .je-search__cancel,
.je-search--large :deep(.uni-input-input),
.je-search--large :deep(.uni-input-placeholder) {
  font-size: 17px;
}

.je-search--round .je-search__field {
  border-radius: 999px;
}

.je-search--square .je-search__field {
  border-radius: var(--je-radius);
}

/* 聚焦态只提亮描边与光晕，保留 background 属性给的底色 */
.je-search.is-focused .je-search__field {
  border-color: var(--je-primary);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-search__input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  color: var(--je-text);
  background: none;
  border: none;
  outline: none;
}

.je-search__input::placeholder {
  color: var(--je-text-faint);
}

/* 关掉 Safari/Chrome 自带的一键清空水印，统一用自绘清除按钮 */
.je-search__input::-webkit-search-cancel-button {
  display: none;
}

/* H5 下 uni 会把 <input> 包成 uni-input，真实输入框与自绘占位符要 :deep 才命中；
   小程序端 <input> 是原生组件，这两条选择器不会匹配到任何元素 */
:deep(.uni-input-input) {
  height: 100%;
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  color: var(--je-text);
  background: none;
  border: none;
  outline: none;
}

:deep(.uni-input-placeholder) {
  font-size: 15px;
  color: var(--je-text-faint);
}

.je-search__clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: var(--je-text);
  cursor: pointer;
  background: var(--je-border-color);
  border: none;
  border-radius: 50%;
  transition: opacity var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边与内边距，这里压掉，避免多出一圈细边 */
.je-search__clear::after,
.je-search__cancel::after {
  border: none;
}

.je-search__clear:hover {
  opacity: 0.7;
}

.je-search__cancel {
  flex-shrink: 0;
  height: 42px;
  padding: 0 2px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1;
  color: var(--je-primary);
  cursor: pointer;
  background: none;
  border: none;
}

.je-search__cancel:disabled {
  cursor: not-allowed;
  background: none;
  opacity: 0.5;
}

.je-search.is-disabled .je-search__field {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-search.is-disabled .je-search__input {
  cursor: not-allowed;
}

@media (max-width: 768px) {
  /* 触屏上把输入框与取消按钮热区兜到 44px 以上 */
  .je-search__field,
  .je-search__cancel {
    height: 44px;
  }
}
</style>
