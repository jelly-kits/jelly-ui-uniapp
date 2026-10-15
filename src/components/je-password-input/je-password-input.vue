<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'

defineOptions({ name: 'JePasswordInput' })

const props = withDefaults(
  defineProps<{
    /** 已输入的密码内容 */
    modelValue?: string
    /** 密码位数 */
    length?: number
    /** 输入后是否用圆点遮挡 */
    mask?: boolean
    /** 格子之间的间距，传数字按 px 处理 */
    gutter?: number | string
    /** 下方说明文字 */
    info?: string
    /** 传了即进入错误态：覆盖 info 文案，并抖动一次提醒 */
    errorInfo?: string
    /** 受控聚焦状态，支持 v-model:focused 双向绑定 */
    focused?: boolean
    /** 是否禁用输入，同时屏蔽点击聚焦与关闭按钮 */
    disabled?: boolean
    /** 聚焦时是否显示闪烁光标 */
    showCursor?: boolean
    /** 光标颜色，默认取主题主色 */
    cursorColor?: string
    /**
     * 允许输入的字符集：numeric 只收数字（验证码场景），text 不做过滤。
     * 这里用枚举值而不是「正则字符串」，注释理由同主库：规则只活在 JS 里，不写进 HTML 属性。
     */
    accept?: 'numeric' | 'text'
    /** 是否显示右上角关闭按钮，点击后清空内容并派发 close */
    clearable?: boolean
    /** 挂载后自动聚焦（移动端受「无用户手势不弹键盘」限制） */
    autofocus?: boolean
    /**
     * 未聚焦时也显示光标（适合配合自定义数字键盘）。
     * 它只放宽显示条件，不改变光标落点——光标始终停在下一个待填的格子上。
     */
    always?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: '',
    length: 6,
    mask: true,
    gutter: 0,
    info: '',
    errorInfo: '',
    focused: false,
    disabled: false,
    showCursor: true,
    cursorColor: '',
    accept: 'numeric',
    clearable: false,
    autofocus: false,
    always: false,
    size: undefined,
  },
)

const emit = defineEmits<{
  /** 密码内容变化（配合 v-model 使用） */
  'update:modelValue': [value: string]
  /** 受控聚焦状态变化，与 v-model:focused 成对，供父组件同步键盘显隐 */
  'update:focused': [value: boolean]
  /** 内容发生实际变化时触发，参数为最新的完整内容 */
  change: [value: string]
  /** 输入框获得焦点 */
  focus: [event: FocusEvent]
  /** 输入框失去焦点 */
  blur: [event: FocusEvent]
  /** 点击右上角关闭按钮，内容已由组件清空 */
  close: []
  /** 输入位数达到 length 时触发，可用于自动提交 */
  complete: [value: string]
}>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-password--${size.value}`))

/** H5 下模板 ref 是 uni-input 组件实例（真实节点挂在 $el 上），暴露了 focus / blur */
interface InputHost {
  focus?: () => void
  blur?: () => void
  $el?: HTMLElement | null
}

const inputRef = ref<InputHost | null>(null)

/** 小程序端聚焦：先置 false 再翻 true，否则值没变化不会重新触发聚焦 */
const focusFlag = ref(false)

/** 受控的输入框显示值：小程序端拿不到原生 input 实例，只能靠它把过滤后的值重新推回去 */
const inputValue = ref('')

/**
 * 记录「焦点正在被组件自己搬动」的瞬间：
 * 否则用户点到旁边控件时，浏览器先给新元素焦点、再轮到我们的 blur 处理，状态回写会抢回焦点。
 */
const focusing = ref(false)

/** H5 下模板 ref 取真实 DOM 前必须解包（组件实例的真实节点在 $el 上） */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/**
 * focused 支持受控 / 非受控两种用法：
 * 父组件传了值（或接住了 update:focused）即受控，否则落到组件内部的本地状态。
 * 只在 setup 期同步读一次 —— getCurrentInstance() 在事件回调里求值会拿到 null。
 */
const vnodeProps = getCurrentInstance()?.vnode.props ?? {}
const controlled = 'focused' in vnodeProps || 'onUpdate:focused' in vnodeProps

const innerFocused = ref(false)
const focusedModel = computed<boolean>({
  get: () => (controlled ? props.focused : innerFocused.value),
  set: (value) => {
    innerFocused.value = value
    emit('update:focused', value)
  },
})

/** 错误抖动用自增的 key 触发：重复同一个错误文案时也能再抖一次 */
const shakeKey = ref(0)

const active = computed(() => focusedModel.value && !props.disabled)

const gutterValue = computed(() =>
  typeof props.gutter === 'number' ? `${props.gutter}px` : (props.gutter ?? ''),
)

/** 有间距时格子各自成块，没间距时相邻格子共用一条描边（见样式里的 border-left） */
const hasGutter = computed(
  () => gutterValue.value !== '0' && gutterValue.value !== '0px' && gutterValue.value !== '',
)

const rootStyle = computed(() => ({
  '--je-password-gutter': gutterValue.value,
  '--je-password-cursor': props.cursorColor || 'var(--je-primary)',
}))

/**
 * 渲染用的值：父组件给了超长内容时，格子里只呈现前 length 位。
 * 同时它也是「原生输入框该显示什么」的唯一依据。
 */
const displayValue = computed(() => props.modelValue.slice(0, props.length))

/** 已填满：满位后不再显示光标 */
const complete = computed(() => displayValue.value.length >= props.length)

/**
 * 光标永远画在「下一个待填的格子」上，always 只放宽显示条件（未聚焦也显示），不改变落点。
 */
const caretVisible = computed(
  () => props.showCursor && !complete.value && (active.value || props.always),
)

/** 小程序 input 没有 inputmode，收敛为 number / text 两种类型 */
const nativeType = computed(() => (props.accept === 'numeric' ? 'number' : 'text'))

/** 字符过滤：函数式而不是 pattern 属性，理由同 accept */
const filterValue = (raw: string) => {
  const limited = raw.slice(0, props.length)
  return props.accept === 'numeric' ? limited.replace(/\D/g, '') : limited
}

/**
 * 写入新值：只在内容真的变了才派发 update / change。
 * 这样父组件把 update 回写后不会触发第二次 change，也能避免重复的抖动判断。
 */
const commit = (raw: string, options: { complete?: boolean } = {}) => {
  const next = filterValue(raw)
  const changed = next !== props.modelValue
  if (changed) {
    emit('update:modelValue', next)
    emit('change', next)
  }
  if (changed && options.complete && next.length === props.length) {
    emit('complete', next)
  }
  return next
}

/** H5 直接改原生 <input> 的值：受控 :value 在「值没变化」时不会重推 DOM */
const pushNativeValue = (value: string) => {
  // #ifdef H5
  const native = pick(inputRef.value)?.querySelector('input') as HTMLInputElement | null
  if (native && native.value !== value) native.value = value
  // #endif
}

/** 把过滤后的内容写回输入框：H5 直接改原生值，小程序端靠受控 :value 重推 */
const syncInput = () => {
  const value = displayValue.value
  inputValue.value = value
  pushNativeValue(value)
}

/**
 * 把状态落到真实焦点：H5 用组件实例方法，小程序端用 focus 属性（先关再开）。
 * 收口为单一函数 + 体内条件编译分派，避免两段 #ifdef 各声明一次同名 const（vue-tsc 不剥离 #ifdef）。
 */
const syncDomFocus = (value: boolean) => {
  let handled = false
  // #ifdef H5
  focusing.value = true
  if (value) inputRef.value?.focus?.()
  else inputRef.value?.blur?.()
  focusing.value = false
  handled = true
  // #endif
  if (!handled) {
    focusFlag.value = false
    if (value) void nextTick(() => { focusFlag.value = true })
  }
}

const onInput = (event: Event) => {
  const raw = (event as unknown as { detail?: { value?: string } }).detail?.value ?? ''
  const next = commit(raw, { complete: true })
  if (raw === next) {
    inputValue.value = next
    return
  }
  // 过滤后与原始输入不一致时，受控值没变化 Vue 不会重推 DOM：
  // H5 直接把过滤结果落到原生值；小程序端靠「清空再推」逼受控值落地
  inputValue.value = next
  // #ifdef H5
  pushNativeValue(next)
  // #endif
  // #ifndef H5
  inputValue.value = ''
  void nextTick(() => { inputValue.value = next })
  // #endif
}

const onFocus = (event: FocusEvent) => {
  if (focusing.value) return
  focusedModel.value = true
  if (!controlled) emit('focus', event)
}

const onBlur = (event: FocusEvent) => {
  focusedModel.value = false
  if (!controlled) emit('blur', event)
}

/**
 * 两个方向都要对齐真实焦点：
 * ① 状态变了 → 同步 DOM 焦点；② DOM 焦点跑掉了 → 通过 @focus / @blur 把状态写回 v-model。
 */
watch(focusedModel, (value) => {
  void nextTick(() => syncDomFocus(value))
})

// 受控地清空 modelValue（父组件直接改值）时，输入框里的旧值也要跟着消失
watch(
  () => props.modelValue,
  () => syncInput(),
)

// 错误文案每次出现都重新抖一下：key 变了，CSS 动画才会从头开始
watch(
  () => props.errorInfo,
  (value) => {
    if (!value) return
    shakeKey.value += 1
  },
)

const focus = () => {
  if (props.disabled) return
  // 先写状态再点 DOM：受控父组件能从 v-model:focused 拿到 true，非受控用法也能立刻点亮光标与边框
  focusedModel.value = true
  syncDomFocus(true)
}

const blur = () => {
  focusedModel.value = false
  syncDomFocus(false)
}

const clear = () => {
  commit('')
  syncInput()
}

const onCellClick = () => {
  // 不要 stopPropagation：让父级容器也能收到点击（比如外层需要记录交互）
  focus()
}

const onClose = () => {
  clear()
  emit('close')
}

onMounted(() => {
  syncInput()
  // 初值就聚焦时 watch 不会触发（值没变），这里补一次；
  // 移动端此时没有用户手势，浏览器会静默忽略弹键盘，但光标与状态是同步的
  if (props.focused || props.autofocus) focus()
})

defineExpose({
  /** 聚焦到隐藏输入框（聚焦后才会唤起系统键盘） */
  focus,
  /** 让输入框失去焦点，并同步把聚焦状态写回 v-model:focused */
  blur,
  /** 清空已输入内容 */
  clear,
})
</script>

<template>
  <view
    class="je-password"
    :class="[sizeClass, {
      'is-focused': active,
      'is-error': !!errorInfo,
      'is-disabled': disabled,
    }]"
    :style="rootStyle"
  >
    <view class="je-password__cells" :class="{ 'has-gutter': hasGutter }" @tap="onCellClick">
      <view v-for="i in length" :key="i" class="je-password__cell">
        <view v-if="displayValue[i - 1] && mask" class="je-password__dot" />
        <text v-else-if="displayValue[i - 1]" class="je-password__char">{{ displayValue[i - 1] }}</text>
        <view
          v-else-if="caretVisible && i - 1 === displayValue.length"
          class="je-password__caret"
        />
      </view>

      <!-- H5：ref 指向 uni-input 组件实例，可程序化 focus / blur -->
      <!-- #ifdef H5 -->
      <input
        ref="inputRef"
        class="je-password__input"
        type="text"
        :inputmode="accept === 'numeric' ? 'numeric' : 'text'"
        :maxlength="length"
        :value="inputValue"
        :disabled="disabled"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        :aria-label="`密码输入框，共 ${length} 位`"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      >
      <!-- #endif -->

      <!-- 小程序：没有 DOM 引用，靠 focus 属性控制聚焦，type 收敛为 number / text -->
      <!-- #ifndef H5 -->
      <input
        class="je-password__input"
        :type="nativeType"
        :maxlength="length"
        :value="inputValue"
        :disabled="disabled"
        :focus="focusFlag"
        confirm-type="done"
        :aria-label="`密码输入框，共 ${length} 位`"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      >
      <!-- #endif -->
    </view>

    <button
      v-if="clearable && !disabled"
      type="button"
      class="je-password__close"
      aria-label="清空密码输入框"
      @tap.stop="onClose"
    >
      <!-- 关闭图标，可用 #close-icon 替换 -->
      <slot name="close-icon">
        <je-icon name="close" :size="14" />
      </slot>
    </button>

    <view v-if="errorInfo || info" class="je-password__footer">
      <text v-if="errorInfo" :key="shakeKey" class="je-password__info is-error">
        {{ errorInfo }}
      </text>
      <text v-else class="je-password__info">{{ info }}</text>
    </view>

    <view v-if="$slots.info" class="je-password__info">
      <!-- 底部说明区，传了即整体替换 info / errorInfo 文案 -->
      <slot name="info" :error="!!errorInfo" :value="displayValue" />
    </view>
  </view>
</template>

<style scoped>
.je-password {
  position: relative;
  font-family: inherit;
  --je-password-gutter: 0px;
  --je-password-cursor: var(--je-primary);
  /*
   * 组件自身贴不到屏幕底部，所以不直接吃掉这段安全区；
   * 把它提成一个可被子元素继承的变量，使用者把它用在页面底部容器上即可。
   */
  --je-password-safe-bottom: env(safe-area-inset-bottom, 0px);
}

.je-password__cells {
  position: relative;
  display: flex;
  overflow: hidden;
  cursor: text;
  background: var(--je-surface);
  border: 1px solid var(--je-border-color);
  border-radius: var(--je-radius);
  transition: border-color var(--je-duration) ease;
}

.je-password__cells.has-gutter {
  column-gap: var(--je-password-gutter);
  background: none;
  border: none;
  border-radius: 0;
}

.je-password__cell {
  position: relative;
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 0;
  height: 48px;
}

/* 尺寸三档：只覆盖格子高度与字符字号，配色、圆角、交互状态都沿用基础样式。
   三档与 je-input 同口径，同一表单行里的控件能对齐 */
.je-password--small .je-password__cell {
  height: var(--je-touch-h-sm);
}

.je-password--small .je-password__char {
  font-size: 17px;
}

.je-password--large .je-password__cell {
  height: var(--je-touch-h-lg);
}

.je-password--large .je-password__char {
  font-size: 20px;
}

/* gutter 为 0 时相邻格子共用一条描边，避免叠成 2px */
.je-password__cell + .je-password__cell {
  border-left: 1px solid var(--je-border-color);
}

.je-password__cells.has-gutter .je-password__cell {
  background: var(--je-surface);
  border: 1px solid var(--je-border-color);
  border-radius: var(--je-radius-sm);
}

.je-password.is-focused .je-password__cells {
  border-color: var(--je-primary);
}

.je-password.is-focused .je-password__cells.has-gutter .je-password__cell {
  border-color: var(--je-primary);
}

/*
 * 聚焦光晕：主色的半透明值在主色可能被局部覆盖的场景下不能预先写死，
 * 所以用 color-mix 在主色上现算（这也是主题铁律里禁止新增全局 token 的原因）。
 */
.je-password__cells::after {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  bottom: -1px;
  left: -1px;
  pointer-events: none;
  border-radius: inherit;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-primary) 22%, transparent);
  opacity: 0;
  transition: opacity var(--je-duration) ease;
}

.je-password.is-focused .je-password__cells::after {
  opacity: 1;
}

.je-password.is-error .je-password__cells {
  border-color: var(--je-danger);
}

.je-password.is-error .je-password__cells.has-gutter .je-password__cell {
  border-color: var(--je-danger);
}

.je-password.is-error .je-password__cells::after {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-danger) 22%, transparent);
  opacity: 1;
}

.je-password__dot {
  width: 7px;
  height: 7px;
  background: var(--je-text);
  border-radius: 50%;
}

.je-password__char {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--je-text);
}

.je-password__caret {
  width: 2px;
  height: 20px;
  background: var(--je-password-cursor);
  animation: je-password-blink 1s steps(1) infinite;
}

@keyframes je-password-blink {
  0%,
  50% {
    opacity: 1;
  }

  50.01%,
  100% {
    opacity: 0;
  }
}

/* 隐藏输入框铺满格子区承接键盘输入；H5 的 uni-input 也得铺满才点得到 */
.je-password__input {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0;
  font-family: inherit;
  /* 小于 16px 时 iOS 会在聚焦瞬间自动放大页面 */
  font-size: 16px;
  color: transparent;
  cursor: text;
  background: none;
  border: none;
  outline: none;
  opacity: 0;
}

/* H5 下 uni 会把 <input> 包成 uni-input，真实输入框要 :deep 才命中；
   小程序端是原生组件，这些选择器不会匹配到任何元素 */
:deep(.uni-input-wrapper),
:deep(.uni-input-input) {
  height: 100%;
  padding: 0;
  font-family: inherit;
  font-size: 16px;
  color: transparent;
  background: none;
  border: none;
  outline: none;
}

/*
 * 关闭按钮落在被输入框铺满的格子上方，必须显式抬层级，
 * 否则 input 盖住它，点击会变成聚焦而不是关闭。
 */
.je-password__close {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  /* 小程序原生 button 自带外边距与内边距，这里显式压掉，否则会顶偏 */
  margin: 0;
  padding: 0;
  font-family: inherit;
  line-height: 1;
  color: var(--je-text-muted);
  cursor: pointer;
  background: var(--je-popup);
  border: 1px solid var(--je-border-color);
  border-radius: 50%;
  transition: color 0.2s ease, background 0.2s ease;
}

/* 屏掉小程序原生 button 的 ::after 描边 */
.je-password__close::after {
  border: none;
}

.je-password__close:hover {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 30%, var(--je-popup));
}

/* 键盘走查时也能看见落点：隐藏输入框的 outline 被关掉了，这里不能省 */
.je-password__close:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-password__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.je-password__info {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--je-text-faint);
}

.je-password__info.is-error {
  color: var(--je-danger);
  animation: je-password-shake 0.4s ease;
}

@keyframes je-password-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-6px);
  }

  40% {
    transform: translateX(5px);
  }

  60% {
    transform: translateX(-3px);
  }

  80% {
    transform: translateX(2px);
  }
}

.je-password.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-password.is-disabled .je-password__cells {
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .je-password__cell {
    height: 50px;
  }

  /*
   * 关闭按钮的可见图形保持小巧（否则会压住第一个格子），
   * 但用 ::before 把真正的触控热区撑到 44×44，手指点空白处也能命中。
   */
  .je-password__close::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 44px;
    height: 44px;
    transform: translate(-50%, -50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-password__caret,
  .je-password.is-focused .je-password__cells,
  .je-password.is-error .je-password__cells,
  .je-password__info.is-error {
    animation: none;
    transition: none;
  }

  /* 状态类特异性高于基础类，必须一并列出，否则过渡照样跑 */
  .je-password__cells::after,
  .je-password.is-focused .je-password__cells::after,
  .je-password.is-error .je-password__cells::after,
  .je-password__close {
    transition: none;
  }
}
</style>
