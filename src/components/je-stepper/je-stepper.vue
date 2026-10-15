<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'

defineOptions({ name: 'JeStepper' })

const props = withDefaults(
  defineProps<{
    /** 当前值 */
    modelValue?: number
    /** 允许的最小值 */
    min?: number
    /** 允许的最大值 */
    max?: number
    /** 每次加减的步长 */
    step?: number
    /** 只允许整数 */
    integer?: boolean
    /** 固定小数位数；不传则按 step 推导 */
    decimalLength?: number
    disabled?: boolean
    /** 禁用中间的输入框，只能点按钮 */
    disableInput?: boolean
    /** 输入框宽度；不传时由 size 档位决定 */
    inputWidth?: number | string
    /** 加减按钮的尺寸；不传时由 size 档位决定 */
    buttonSize?: number
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
    /**
     * 变更前的拦截钩子，返回 false（或 resolve false）则不更新。
     * 支持异步，便于先弹确认框再决定是否改动。
     */
    beforeChange?: (next: number, current: number) => boolean | Promise<boolean>
  }>(),
  {
    modelValue: 1,
    min: 1,
    max: Infinity,
    step: 1,
    integer: false,
    decimalLength: undefined,
    disabled: false,
    disableInput: false,
    // 两个尺寸 prop 默认留空：由 size 档位下发（default 档结果仍是按钮 32 / 输入框 48）
    inputWidth: undefined,
    buttonSize: undefined,
    size: undefined,
    beforeChange: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  /** 值真正变化后触发 */
  change: [value: number]
  /** 已到边界再继续加减、或手动输入超限时触发 */
  overlimit: [type: 'plus' | 'minus']
}>()

/** 尺寸：组件自身优先，再退回全局配置；default 档不产生额外变化（预设值即原默认值） */
const size = useJeConfigSize(() => props.size)

const decimalsOf = (value: number) => {
  const text = String(value)
  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
}

const precision = computed(() => props.decimalLength ?? (props.integer ? 0 : decimalsOf(props.step)))

const round = (value: number) => {
  const factor = 10 ** precision.value
  return Math.round(value * factor) / factor
}

const clamp = (value: number) => Math.min(props.max, Math.max(props.min, value))

const current = computed(() => props.modelValue)

/** 输入框里展示的文本，固定小数位时补零 */
const displayValue = computed(() =>
  props.decimalLength === undefined ? String(current.value) : current.value.toFixed(props.decimalLength),
)

const atMin = computed(() => current.value <= props.min)
const atMax = computed(() => current.value >= props.max)

const inputValue = ref('')

watch(displayValue, (value) => {
  inputValue.value = value
}, { immediate: true })

/**
 * 尺寸档位下发的默认值；“细粒度 prop 优先”：显式传了 buttonSize / inputWidth 就覆盖档位值。
 * default 档与改动前的默认值一致（按钮 32 / 输入框 48），行为不变。
 */
const SIZE_PRESET: Record<JeConfigSize, { buttonSize: number; inputWidth: number }> = {
  small: { buttonSize: 28, inputWidth: 44 },
  default: { buttonSize: 32, inputWidth: 48 },
  large: { buttonSize: 40, inputWidth: 56 },
}

/** 加减号图标随档位缩放，default 档保持原有 14px */
const STEP_ICON: Record<JeConfigSize, number> = { small: 12, default: 14, large: 16 }
const stepIconSize = computed(() => STEP_ICON[size.value])

const rootStyle = computed(() => {
  const preset = SIZE_PRESET[size.value]
  const buttonSize = props.buttonSize ?? preset.buttonSize
  const inputWidth = props.inputWidth ?? preset.inputWidth
  return {
    '--je-stepper-btn': `${buttonSize}px`,
    '--je-stepper-input-w': typeof inputWidth === 'number' ? `${inputWidth}px` : inputWidth,
  }
})

/** 还原输入框显示（拦截 / 无效输入时用） */
const restore = () => {
  inputValue.value = displayValue.value
}

const apply = async (next: number) => {
  const target = round(clamp(next))
  if (target === current.value) {
    restore()
    return
  }
  if (props.beforeChange) {
    const allowed = await props.beforeChange(target, current.value)
    if (!allowed) {
      restore()
      return
    }
  }
  emit('update:modelValue', target)
  emit('change', target)
}

const stepBy = (direction: 1 | -1) => {
  if (props.disabled) return
  const next = round(current.value + direction * props.step)
  if (next > props.max) {
    emit('overlimit', 'plus')
    return
  }
  if (next < props.min) {
    emit('overlimit', 'minus')
    return
  }
  void apply(next)
}

const commit = () => {
  const raw = inputValue.value.trim()
  if (raw === '') {
    restore()
    return
  }
  const parsed = Number(raw)
  if (Number.isNaN(parsed)) {
    restore()
    return
  }
  if (parsed > props.max) emit('overlimit', 'plus')
  else if (parsed < props.min) emit('overlimit', 'minus')
  void apply(parsed)
}

/** 输入值统一从 uni 的事件通道读：H5 与小程序都走 detail.value */
const onInput = (event: Event) => {
  inputValue.value = (event as unknown as { detail?: { value?: string } }).detail?.value ?? ''
}

const onKeydown = (event: KeyboardEvent) => {
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

/* 长按连续步进：500ms 后进入 100ms 一次的连发。
   小程序端没有 window，用全局计时器（两端都有） */
let delayTimer: ReturnType<typeof setTimeout> | undefined
let repeatTimer: ReturnType<typeof setInterval> | undefined

const stopRepeat = () => {
  clearTimeout(delayTimer)
  clearInterval(repeatTimer)
  delayTimer = undefined
  repeatTimer = undefined
}

const onPressStart = (direction: 1 | -1) => {
  if (props.disabled) return
  stepBy(direction)
  stopRepeat()
  delayTimer = setTimeout(() => {
    repeatTimer = setInterval(() => stepBy(direction), 100)
  }, 500)
}

onBeforeUnmount(stopRepeat)
</script>

<template>
  <view class="je-stepper" :class="{ 'is-disabled': disabled }" :style="rootStyle">
    <!-- #ifdef H5 -->
    <button
      type="button"
      class="je-stepper__btn"
      :disabled="disabled || atMin"
      aria-label="减少"
      @mousedown="onPressStart(-1)"
      @mouseup="stopRepeat"
      @mouseleave="stopRepeat"
      @contextmenu.prevent
    >
      <JeIcon name="minus" :size="stepIconSize" />
    </button>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <button
      type="button"
      class="je-stepper__btn"
      :disabled="disabled || atMin"
      @touchstart="onPressStart(-1)"
      @touchend="stopRepeat"
      @touchcancel="stopRepeat"
    >
      <JeIcon name="minus" :size="stepIconSize" />
    </button>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <input
      class="je-stepper__input"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :value="inputValue"
      :disabled="disabled || disableInput"
      role="spinbutton"
      :aria-valuenow="current"
      :aria-valuemin="min === -Infinity ? undefined : min"
      :aria-valuemax="max === Infinity ? undefined : max"
      @input="onInput"
      @blur="commit"
      @keydown="onKeydown"
    >
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <input
      class="je-stepper__input"
      type="digit"
      :value="inputValue"
      :disabled="disabled || disableInput"
      @input="onInput"
      @blur="commit"
    >
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <button
      type="button"
      class="je-stepper__btn"
      :disabled="disabled || atMax"
      aria-label="增加"
      @mousedown="onPressStart(1)"
      @mouseup="stopRepeat"
      @mouseleave="stopRepeat"
      @contextmenu.prevent
    >
      <JeIcon name="plus" :size="stepIconSize" />
    </button>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <button
      type="button"
      class="je-stepper__btn"
      :disabled="disabled || atMax"
      @touchstart="onPressStart(1)"
      @touchend="stopRepeat"
      @touchcancel="stopRepeat"
    >
      <JeIcon name="plus" :size="stepIconSize" />
    </button>
    <!-- #endif -->
  </view>
</template>

<style scoped>
.je-stepper {
  display: inline-flex;
  align-items: center;
  font-family: inherit;
  --je-stepper-btn: 32px;
  --je-stepper-input-w: 48px;
}

.je-stepper__btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--je-stepper-btn);
  height: var(--je-stepper-btn);
  color: var(--je-text);
  cursor: pointer;
  background: var(--je-surface);
  border: 1.5px solid var(--je-border-color);
  border-radius: var(--je-radius-sm);
  outline: none;
  /* 长按连发时不要让浏览器把触摸当成滚动 */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition: background var(--je-duration) ease, border-color var(--je-duration) ease,
    transform 0.12s ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-stepper__btn::after {
  border: none;
}

.je-stepper__btn:hover:not(:disabled) {
  border-color: var(--je-primary);
}

.je-stepper__btn:not(:disabled):active {
  background: color-mix(in srgb, var(--je-primary) 20%, transparent);
  transform: scale(0.94);
}

.je-stepper__btn:focus-visible {
  border-color: var(--je-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-primary) 30%, transparent);
}

.je-stepper__btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.je-stepper__input {
  width: var(--je-stepper-input-w);
  margin: 0 8px;
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: var(--je-text);
  text-align: center;
  background: none;
  border: none;
  outline: none;
}

/* H5 下 uni 会把 <input> 包一层，真实控件要 :deep 才命中；
   小程序端是原生组件，这些选择器不会匹配到任何元素 */
:deep(.uni-input-input) {
  box-sizing: border-box;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  text-align: center;
  background: none;
  border: none;
  outline: none;
}

.je-stepper__input:disabled {
  cursor: default;
  color: var(--je-text-muted);
}

.je-stepper.is-disabled {
  opacity: 0.6;
}

@media (max-width: 768px) {
  /* 触屏上把加减按钮热区兜到 44px 以上 */
  .je-stepper__btn {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
