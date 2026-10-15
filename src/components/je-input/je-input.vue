<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, useSlots, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { jeFieldContextKey } from '../../core/form'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeIconName } from '../je-icon/icons'
import type { JeInputProps } from './types'

defineOptions({ name: 'JeInput' })

const props = withDefaults(defineProps<JeInputProps>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  showWordLimit: false,
  wordLimitPosition: 'inside',
  clearable: false,
  clearIcon: 'close',
  showPassword: false,
  disabled: false,
  readonly: false,
  size: undefined,
  rows: 2,
  autosize: false,
  autocomplete: 'off',
  autofocus: false,
  validateEvent: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: [value: string]
  change: [value: string]
  clear: []
  confirm: [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
}>()

/**
 * 原库靠 JeFormItem 在根节点上监听 focusout / change 做事件委托，
 * 小程序端的自定义组件不会把这些原生事件冒泡上来，所以改成控件拿到字段上下文后主动通知。
 */
const field = inject(jeFieldContextKey, null)

/** 通知上层字段做校验，validate-event 为 false 时沉默 */
const notifyField = (trigger: 'blur' | 'change') => {
  if (!props.validateEvent || !field) return
  void field.validate(trigger)
}

const slots = useSlots()

/** H5 拿它调 focus / blur；小程序端拿不到 DOM 引用，只能用 focus 属性 */
const inputRef = ref<{ focus?: () => void; blur?: () => void } | null>(null)
/** 小程序端聚焦：先置 false 再翻 true，否则值没变化不会重新触发聚焦 */
const focusFlag = ref(false)

const isFocused = ref(false)
const passwordVisible = ref(false)

/* ---------------------------------------------------------------- 尺寸与结构 */

/** 尺寸：组件自身优先，再退回全局配置（JeConfigProvider）；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-input--${size.value}`))

/** 前后缀 / 清空 / 密码图标随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

const isTextarea = computed(() => props.type === 'textarea')
const hasGroup = computed(() => Boolean(slots.prepend || slots.append))

const groupClasses = computed(() => ({
  'is-grouped': hasGroup.value,
  'has-prepend': Boolean(slots.prepend),
  'has-append': Boolean(slots.append),
}))

/* -------------------------------------------------------------- 值与显示同步 */

const nativeValue = computed(() =>
  props.modelValue === undefined || props.modelValue === null ? '' : String(props.modelValue),
)

/** 显示值：formatter 只作用于「看到什么」，v-model 里始终是 parser 解析后的真实值 */
const displayValue = computed(() =>
  props.formatter ? props.formatter(props.modelValue ?? '') : nativeValue.value,
)

/** 受控的显示值。小程序端拿不到原生 input 实例，只能靠它把「显示值」重新推给输入框 */
const inputValue = ref('')
watch(displayValue, (value) => { inputValue.value = value }, { immediate: true })

/* ---------------------------------------------------------------- 字形簇计数 */

interface SegmenterLike {
  segment: (input: string) => Iterable<string>
}

let segmenterCache: SegmenterLike | null | undefined

/** Intl.Segmenter 能正确切分 emoji / 组合字符，老运行时退回码点切分 */
const getSegmenter = (): SegmenterLike | null => {
  if (segmenterCache !== undefined) return segmenterCache
  segmenterCache = null
  if (typeof Intl !== 'undefined') {
    const ctor = (
      Intl as unknown as {
        Segmenter?: new (locales?: string, options?: { granularity?: string }) => SegmenterLike
      }
    ).Segmenter
    if (ctor) {
      try {
        segmenterCache = new ctor(undefined, { granularity: 'grapheme' })
      } catch {
        segmenterCache = null
      }
    }
  }
  return segmenterCache
}

const splitGraphemes = (value: string): string[] => {
  const segmenter = getSegmenter()
  return segmenter ? Array.from(segmenter.segment(value)) : Array.from(value)
}

const textLength = computed(() =>
  props.countGraphemes ? props.countGraphemes(nativeValue.value) : splitGraphemes(nativeValue.value).length,
)

/**
 * 传了 countGraphemes 时原生 maxlength 不再生效（计数口径交给调用方），
 * 上限只由下方的计数器提示，不会悄悄截断用户输入。
 */
const nativeMaxlength = computed(() => (props.countGraphemes ? undefined : props.maxlength))
const nativeMinlength = computed(() => (props.countGraphemes ? undefined : props.minlength))

/** 小程序 input 的 maxlength 默认 140，必须显式给 -1 才是「不限」；H5 同样按 -1 处理 */
const maxlengthAttr = computed(() => {
  const value = nativeMaxlength.value
  if (value === undefined || value === '') return -1
  return Number(value)
})

const isWordLimitVisible = computed(
  () =>
    props.showWordLimit &&
    (props.type === 'text' || isTextarea.value) &&
    !props.disabled &&
    !props.readonly,
)

const wordLimitText = computed(() =>
  props.maxlength === undefined ? String(textLength.value) : `${textLength.value} / ${props.maxlength}`,
)

const isOverLimit = computed(
  () => props.maxlength !== undefined && textLength.value > Number(props.maxlength),
)

/* -------------------------------------------------------------- 清空 / 密码 */

const hasValue = computed(() => nativeValue.value.length > 0)

const showClear = computed(
  () => props.clearable && !props.disabled && !props.readonly && hasValue.value,
)

const showPwdVisible = computed(
  () =>
    props.showPassword &&
    props.type === 'password' &&
    !props.disabled &&
    !props.readonly &&
    hasValue.value,
)

/** H5 的原生 type：密码框在「明文 / 密文」之间切换 */
const effectiveType = computed(() => {
  if (props.type !== 'password' || !props.showPassword) return props.type
  return passwordVisible.value ? 'text' : 'password'
})

/* -------------------------------------------------------------------- 图标 */

const asIconName = (icon: unknown): JeIconName | undefined =>
  typeof icon === 'string' ? (icon as JeIconName) : undefined

const prefixIconName = computed(() => asIconName(props.prefixIcon))
const suffixIconName = computed(() => asIconName(props.suffixIcon))
const clearIconName = computed(() => asIconName(props.clearIcon))

const showPrefix = computed(() => Boolean(prefixIconName.value || slots.prefix))
const showSuffix = computed(() => Boolean(suffixIconName.value || slots.suffix))
const showCountInside = computed(
  () => isWordLimitVisible.value && props.wordLimitPosition === 'inside',
)
const hasSuffixArea = computed(
  () => showSuffix.value || showPwdVisible.value || showClear.value || showCountInside.value,
)

/* ---------------------------------------------- 平台差异：原生属性与输入类型 */

/** 小程序 <input> 没有 email / url / search 这些 type，收敛到 text / digit / number */
const MP_INPUT_TYPES: Record<string, string> = {
  text: 'text',
  number: 'digit',
  password: 'text',
  email: 'text',
  search: 'text',
  tel: 'number',
  url: 'text',
}

const nativeType = computed(() => MP_INPUT_TYPES[props.type] ?? 'text')

/** 小程序端密码框靠 password 布尔属性，而不是 type="password" */
const passwordAttr = computed(
  () => props.type === 'password' && !(props.showPassword && passwordVisible.value),
)

/** 小程序 input 没有 readonly，用 disabled 兜住「不可编辑」，配色仍按 readonly 走 */
const nativeDisabled = computed(() => props.disabled || props.readonly)

/* ------------------------------------------------------------------ 文本域 */

/** uni / 小程序的 textarea 自带 auto-height，行数只需换算成 min / max 高度（一行按 24px 估） */
const LINE_HEIGHT = 24

const textareaStyle = computed(() => {
  const style: Record<string, string> = {}
  // #ifdef H5
  if (props.resize) style.resize = props.resize
  // #endif
  if (props.autosize) {
    const options = typeof props.autosize === 'object' ? props.autosize : {}
    if (options.minRows) style.minHeight = `${options.minRows * LINE_HEIGHT}px`
    if (options.maxRows) style.maxHeight = `${options.maxRows * LINE_HEIGHT}px`
  } else {
    style.height = `${props.rows * 1.6}em`
  }
  return style
})

const autoHeight = computed(() => Boolean(props.autosize))

/* -------------------------------------------------------------------- 事件 */

const readDetailValue = (event: Event): string => {
  const detail = (event as unknown as { detail?: { value?: string } }).detail
  return detail?.value ?? ''
}

const onInput = (event: Event) => {
  const raw = readDetailValue(event)
  const next = props.parser ? props.parser(raw) : raw

  inputValue.value = raw
  emit('update:modelValue', next)
  emit('input', next)

  // 让显示值与 v-model 收敛：formatter / parser 生效时把用户输入整理回受控值
  void nextTick(() => {
    if (inputValue.value !== displayValue.value) inputValue.value = displayValue.value
  })
}

/** 小程序没有原生 change，用「软键盘完成 / 失焦」代它做提交语义 */
const onConfirm = (event: Event) => {
  const value = readDetailValue(event) || inputValue.value
  emit('confirm', value)
  notifyField('change')
}

const onFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const onBlur = (event: FocusEvent) => {
  isFocused.value = false
  void nextTick(() => { inputValue.value = displayValue.value })
  emit('change', displayValue.value)
  notifyField('change')
  notifyField('blur')
  emit('blur', event)
}

const onKeydown = (event: KeyboardEvent) => emit('keydown', event)

/* ------------------------------------------------------------------ 实例方法 */

const focus = () => {
  let handled = false
  // #ifdef H5
  inputRef.value?.focus?.()
  handled = true
  // #endif
  if (!handled) {
    focusFlag.value = false
    void nextTick(() => { focusFlag.value = true })
  }
}

const blur = () => {
  let handled = false
  // #ifdef H5
  inputRef.value?.blur?.()
  handled = true
  // #endif
  if (!handled) focusFlag.value = false
}

const clear = () => {
  inputValue.value = ''
  emit('update:modelValue', '')
  emit('input', '')
  emit('change', '')
  emit('clear')
  // 清空不是用户敲出来的，change 不会自然触发，这里补一次校验
  notifyField('change')
  focus()
}

const togglePassword = () => {
  passwordVisible.value = !passwordVisible.value
  void nextTick(() => {
    inputValue.value = displayValue.value
    focus()
  })
}

/* ------------------------------------------------------------------ 生命周期 */

watch(
  () => props.type,
  () => {
    void nextTick(() => { inputValue.value = displayValue.value })
  },
)

onMounted(() => {
  if (props.autofocus) focus()
})

const fieldClasses = computed(() => [
  sizeClass.value,
  {
    'is-focus': isFocused.value,
    'is-disabled': props.disabled,
    'is-readonly': props.readonly,
    'is-textarea': isTextarea.value,
    'has-prefix': showPrefix.value,
    'has-suffix': hasSuffixArea.value,
    'is-limit': isOverLimit.value,
  },
])

defineExpose({ input: inputRef, textarea: inputRef, passwordVisible, focus, blur, clear })
</script>

<template>
  <div class="je-input-group" :class="groupClasses">
    <div v-if="$slots.prepend" class="je-input-group__prepend">
      <slot name="prepend" />
    </div>

    <div class="je-input" :class="fieldClasses">
      <span v-if="showPrefix" class="je-input__prefix">
        <slot name="prefix">
          <JeIcon v-if="prefixIconName" :name="prefixIconName" :size="iconSize" />
        </slot>
      </span>

      <!-- 原生控件按平台分叉：小程序端不认 minlength / autocomplete / readonly / inputmode，
           也不认 type="password"（改用 password 布尔属性），硬绑会在开发者工具里刷一屏告警 -->
      <!-- #ifdef H5 -->
      <textarea
        v-if="isTextarea"
        ref="inputRef"
        class="je-input__inner je-input__inner--textarea"
        :value="inputValue"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="nativeDisabled"
        :readonly="readonly"
        :maxlength="maxlengthAttr"
        :minlength="nativeMinlength"
        :name="name"
        :autocomplete="autocomplete"
        :auto-height="autoHeight"
        :tabindex="tabindex"
        :form="form"
        :aria-label="ariaLabel"
        :style="[inputStyle, textareaStyle]"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @confirm="onConfirm"
      />

      <input
        v-else
        ref="inputRef"
        class="je-input__inner"
        :type="effectiveType"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="nativeDisabled"
        :readonly="readonly"
        :maxlength="maxlengthAttr"
        :minlength="nativeMinlength"
        :name="name"
        :autocomplete="autocomplete"
        :tabindex="tabindex"
        :form="form"
        :max="max"
        :min="min"
        :step="step"
        :inputmode="inputmode"
        :aria-label="ariaLabel"
        :style="inputStyle"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @confirm="onConfirm"
        @keydown="onKeydown"
      >
      <!-- #endif -->

      <!-- #ifndef H5 -->
      <textarea
        v-if="isTextarea"
        class="je-input__inner je-input__inner--textarea"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="nativeDisabled"
        :maxlength="maxlengthAttr"
        :auto-height="autoHeight"
        :focus="focusFlag"
        :aria-label="ariaLabel"
        :style="[inputStyle, textareaStyle]"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @confirm="onConfirm"
      />

      <input
        v-else
        class="je-input__inner"
        :type="nativeType"
        :password="passwordAttr"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="nativeDisabled"
        :maxlength="maxlengthAttr"
        :focus="focusFlag"
        :aria-label="ariaLabel"
        :style="inputStyle"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @confirm="onConfirm"
      >
      <!-- #endif -->

      <span v-if="hasSuffixArea" class="je-input__suffix">
        <slot name="suffix">
          <JeIcon v-if="suffixIconName" :name="suffixIconName" :size="iconSize" />
        </slot>

        <button
          v-if="showPwdVisible"
          type="button"
          class="je-input__password"
          :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
          :aria-pressed="passwordVisible"
          @click="togglePassword"
        >
          <slot name="password-icon" :visible="passwordVisible">
            <JeIcon :name="passwordVisible ? 'eye-off' : 'eye'" :size="iconSize" />
          </slot>
        </button>

        <button
          v-if="showClear"
          type="button"
          class="je-input__clear"
          aria-label="清空输入"
          @click="clear"
        >
          <JeIcon v-if="clearIconName" :name="clearIconName" :size="iconSize" />
        </button>

        <span v-if="showCountInside" class="je-input__count">{{ wordLimitText }}</span>
      </span>
    </div>

    <div v-if="$slots.append" class="je-input-group__append">
      <slot name="append" />
    </div>

    <span
      v-if="isWordLimitVisible && wordLimitPosition === 'outside'"
      class="je-input__count je-input__count--outside"
    >
      {{ wordLimitText }}
    </span>
  </div>
</template>

<style scoped>
/* 没有前置 / 后置插槽时不生成盒子：H5 用 display: contents 把 wrapper 摘掉，
   小程序不认这个值，退化成等宽块级盒子（视觉一致） */
/* #ifdef H5 */
.je-input-group {
  display: contents;
}
/* #endif */
/* #ifndef H5 */
.je-input-group {
  display: block;
  width: 100%;
}
/* #endif */

.je-input-group.is-grouped {
  display: flex;
  align-items: stretch;
  width: 100%;
  gap: 0;
}

.je-input {
  /* 高度：default 直接取触屏档 token，small / large 只覆盖这几个变量。
     --ji-py 只留给文本域（它由内容撑高），单行控件的高度一律由 --ji-h 定 */
  --ji-h: var(--je-touch-h);
  --ji-py: 14px;
  --ji-px: 16px;
  --ji-fs: 15px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0 var(--ji-px);
  font-family: inherit;
  font-size: var(--ji-fs);
  color: var(--je-text);
  background: var(--je-surface);
  border: 1.5px solid var(--je-border-color);
  border-radius: var(--je-radius);
  transition: border-color var(--je-duration) ease, background var(--je-duration) ease,
    box-shadow var(--je-duration) ease;
}

/* 单行定高：与按钮 / 下拉在同一行严格对齐 */
.je-input:not(.is-textarea) {
  height: var(--ji-h);
}

/* 文本域由内容撑高，改用上下内边距 */
.je-input.is-textarea {
  padding-top: var(--ji-py);
  padding-bottom: var(--ji-py);
}

/* 聚焦态的颜色全部由主色现算，换肤时自动跟随 */
.je-input.is-focus {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-input.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-input.is-readonly {
  cursor: default;
}

.je-input--large {
  --ji-h: var(--je-touch-h-lg);
  --ji-py: 17px;
  --ji-px: 20px;
  --ji-fs: 17px;
}

.je-input--small {
  --ji-h: var(--je-touch-h-sm);
  --ji-py: 9px;
  --ji-px: 12px;
  --ji-fs: 14px;
}

/* ---------------------------------------------------------------- 内部控件 */

.je-input__inner {
  flex: 1 1 auto;
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  padding: 0;
  /* 小程序不认 font 简写，拆成两条 */
  font-family: inherit;
  font-size: inherit;
  line-height: 1.4;
  color: inherit;
  background: none;
  border: none;
  outline: none;
}

.je-input__inner--textarea {
  display: block;
  line-height: 1.6;
}

/* H5 下 uni 会把 <input> / <textarea> 包一层，真实控件要 :deep 才命中；
   小程序端是原生组件，这些选择器不会匹配到任何元素 */
:deep(.uni-input-input),
:deep(.uni-textarea-textarea) {
  box-sizing: border-box;
  min-width: 0;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.4;
  color: inherit;
  background: none;
  border: none;
  outline: none;
}

:deep(.uni-input-placeholder),
:deep(.uni-textarea-placeholder) {
  color: var(--je-text-faint);
}

/* -------------------------------------------------------------------- 图标 */

.je-input__prefix,
.je-input__suffix {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  color: var(--je-text-faint);
}

.je-input__clear,
.je-input__password {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  padding: 0;
  font-family: inherit;
  font-size: 16px;
  line-height: 1;
  color: var(--je-text-faint);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

/* 屏掉小程序原生 button 的 ::after 描边 */
.je-input__clear::after,
.je-input__password::after {
  border: none;
}

/* ---------------------------------------------------------------- 字数统计 */

.je-input__count {
  flex-shrink: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--je-text-faint);
}

.je-input__count--outside {
  display: block;
  width: 100%;
  margin-top: 6px;
  text-align: right;
}

.je-input.is-limit .je-input__count {
  color: var(--je-danger);
}

/* ------------------------------------------------------- 复合型（前置/后置） */

.je-input-group__prepend,
.je-input-group__append {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  font-size: 14px;
  color: var(--je-text-muted);
  background: var(--je-surface-hover);
  border: 1.5px solid var(--je-border-color);
}

.je-input-group__prepend {
  border-right: none;
  border-radius: var(--je-radius) 0 0 var(--je-radius);
}

.je-input-group__append {
  border-left: none;
  border-radius: 0 var(--je-radius) var(--je-radius) 0;
}

.je-input-group.is-grouped.has-prepend .je-input {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.je-input-group.is-grouped.has-append .je-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

/* ---------------------------------------------------------------- 移动端 */

@media (max-width: 768px) {
  .je-input {
    /* 字号 16px 避免 iOS 聚焦时自动放大页面；高度已由 --ji-h 钉在 44px，不用再兜 */
    --ji-py: 12px;
    --ji-px: 14px;
    --ji-fs: 16px;
  }

  /* 尺寸档位在窄屏同样生效：small / large 回到各自档位的值，不被基础档覆盖 */
  .je-input--small {
    --ji-py: 9px;
    --ji-px: 12px;
  }

  .je-input--large {
    --ji-py: 17px;
    --ji-px: 20px;
    --ji-fs: 17px;
  }

  .je-input__clear,
  .je-input__password {
    width: 32px;
    height: 32px;
  }

  .je-input-group__prepend,
  .je-input-group__append {
    padding: 0 12px;
  }
}
</style>
