<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'

defineOptions({ name: 'JeInputNumber' })

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    min?: number
    max?: number
    step?: number
    /** 小数位数，不传则由 step 推导 */
    precision?: number
    placeholder?: string
    disabled?: boolean
    /** 是否显示加减按钮 */
    controls?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: null,
    min: -Infinity,
    max: Infinity,
    step: 1,
    placeholder: '',
    disabled: false,
    controls: true,
    size: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-number--${size.value}`))

const decimalsOf = (value: number) => {
  const text = String(value)
  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
}

const stepPrecision = computed(() => props.precision ?? decimalsOf(props.step))

const round = (value: number) => {
  const factor = 10 ** stepPrecision.value
  return Math.round(value * factor) / factor
}

const clamp = (value: number) => Math.min(props.max, Math.max(props.min, value))

/**
 * H5 用 text 型输入框（避免 <input type="number"> 丢掉中间输入态），
 * 小程序端用 digit 拉起带小数点的数字键盘。
 */
// 用「先给默认值、再按平台覆盖」而不是两段 #ifdef 各声明一次：条件编译只作用于
// 注释，vue-tsc 不会剔除它们，重复 const 会直接报 TS2451。
let inputType = 'text'
// #ifndef H5
inputType = 'digit'
// #endif

const inputValue = ref('')

watch(
  () => props.modelValue,
  (value) => {
    inputValue.value = value === null || value === undefined ? '' : String(value)
  },
  { immediate: true },
)

const assign = (value: number | null) => {
  inputValue.value = value === null ? '' : String(value)
  if (value !== props.modelValue) emit('update:modelValue', value)
}

const commit = () => {
  const raw = inputValue.value.trim()
  if (raw === '') {
    assign(null)
    return
  }
  const parsed = Number(raw)
  if (Number.isNaN(parsed)) {
    assign(props.modelValue ?? null)
    return
  }
  assign(round(clamp(parsed)))
}

/** uni 的 input 把值放在 `event.detail.value`，原生 DOM 那套读不到 */
const onInput = (event: Event) => {
  const detail = (event as unknown as { detail?: { value?: string } }).detail
  inputValue.value = detail?.value ?? ''
}

const stepBy = (direction: number) => {
  if (props.disabled) return
  const base = typeof props.modelValue === 'number' ? props.modelValue : 0
  assign(round(clamp(base + direction * props.step)))
}

/** 键盘快捷键只在 H5 生效；小程序端没有物理键盘，靠 +/- 按钮与失焦提交 */
const onKeydown = (event: KeyboardEvent) => {
  if (typeof event.preventDefault !== 'function') return
  if (event.key === 'Enter') {
    event.preventDefault()
    commit()
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    stepBy(1)
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    stepBy(-1)
  }
}

const atMin = computed(() => typeof props.modelValue === 'number' && props.modelValue <= props.min)
const atMax = computed(() => typeof props.modelValue === 'number' && props.modelValue >= props.max)
</script>

<template>
  <div class="je-number" :class="[sizeClass, { 'is-disabled': disabled, 'has-controls': controls }]">
    <button
      v-if="controls"
      type="button"
      class="je-number__btn"
      :disabled="disabled || atMin"
      aria-label="减少"
      @click="stepBy(-1)"
    >
      <JeIcon name="minus" :size="14" />
    </button>

    <input
      class="je-number__input"
      :type="inputType"
      :value="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      role="spinbutton"
      :aria-valuenow="typeof modelValue === 'number' ? modelValue : undefined"
      :aria-valuemin="min === -Infinity ? undefined : min"
      :aria-valuemax="max === Infinity ? undefined : max"
      @input="onInput"
      @blur="commit"
      @confirm="commit"
      @keydown="onKeydown"
    >

    <button
      v-if="controls"
      type="button"
      class="je-number__btn"
      :disabled="disabled || atMax"
      aria-label="增加"
      @click="stepBy(1)"
    >
      <JeIcon name="plus" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.je-number {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  /* 定高 44px，与 je-input / je-button 同一档；输入区靠 stretch 撑满 */
  height: var(--je-touch-h);
  overflow: hidden;
  background: var(--je-surface);
  border: 1.5px solid var(--je-border-color);
  border-radius: var(--je-radius);
  transition: border-color var(--je-duration) ease, background var(--je-duration) ease,
    box-shadow var(--je-duration) ease;
}

.je-number:focus-within {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

/* 尺寸三档：只覆盖高度 / 左右内边距 / 字号，配色、圆角、交互状态都沿用基础样式。
   三档与 je-input 同口径，同一表单行里的控件能对齐。
   外层定高，内部输入区与加减按钮同步收放，按钮宽度跟着档位走 */
.je-number--small {
  height: var(--je-touch-h-sm);
}

.je-number--small .je-number__input {
  padding: 0 8px;
  font-size: 14px;
}

/* H5 下 uni 会把 <input> 包成 uni-input，真实输入框与自绘占位符有独立字号，需一并覆盖 */
.je-number--small :deep(.uni-input-input),
.je-number--small :deep(.uni-input-placeholder) {
  font-size: 14px;
}

.je-number--small .je-number__btn {
  width: 36px;
  font-size: 15px;
}

.je-number--large {
  height: var(--je-touch-h-lg);
}

.je-number--large .je-number__input {
  padding: 0 16px;
  font-size: 17px;
}

.je-number--large :deep(.uni-input-input),
.je-number--large :deep(.uni-input-placeholder) {
  font-size: 17px;
}

.je-number--large .je-number__btn {
  width: 52px;
  font-size: 17px;
}

.je-number__input {
  flex: 1 1 auto;
  min-width: 0;
  /* 高度由外层定死，这里只留左右内边距 */
  padding: 0 12px;
  font-family: inherit;
  font-size: 15px;
  color: var(--je-text);
  text-align: center;
  background: none;
  border: none;
  outline: none;
}

.je-number__input::placeholder {
  color: var(--je-text-faint);
}

/* H5 下 uni 会把 <input> 包成 uni-input，真实输入框与自绘占位符要 :deep 才命中；
   小程序端 <input> 是原生组件，这两条选择器不会匹配到任何元素 */
:deep(.uni-input-input) {
  height: 100%;
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  color: var(--je-text);
  text-align: center;
  background: none;
  border: none;
  outline: none;
}

:deep(.uni-input-placeholder) {
  font-size: 15px;
  color: var(--je-text-faint);
}

.je-number__btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 44px;
  /* 小程序原生 button 自带左右内边距与居中行高，这里压掉，否则图标放不下 */
  padding: 0;
  font-family: inherit;
  font-size: 16px;
  line-height: 1;
  color: var(--je-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
  transition: background 0.2s ease, color 0.2s ease;
}

/* 同理，屏掉原生 button 的 ::after 描边 */
.je-number__btn::after {
  border: none;
}

.je-number__btn:hover:not(:disabled) {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-number__btn:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -3px;
}

.je-number__btn:disabled {
  cursor: not-allowed;
  /* 小程序原生 button[disabled] 会补一层灰底，这里显式压掉 */
  background: none;
  opacity: 0.35;
}

.je-number.is-disabled .je-number__input {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 窄屏放大热区，保证单指点击不误触 */
@media (max-width: 768px) {
  .je-number__input {
    padding: 0 10px;
  }

  .je-number__btn {
    width: 48px;
  }
}
</style>
