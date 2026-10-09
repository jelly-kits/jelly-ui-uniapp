<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import { nextZIndex } from '../../core/useZIndex'

defineOptions({ name: 'JeNumberKeyboard' })

const props = withDefaults(
  defineProps<{
    /** 显示 / 隐藏键盘，一旦传入它就是可见性的唯一来源（对齐 Vant，受控写法：@blur="show = false"） */
    show?: boolean
    /** 显示 / 隐藏键盘；没有传 show 时由它决定，保证旧的 v-model 用法不变 */
    modelValue?: boolean
    /** 面板标题，为空则不渲染标题栏文字 */
    title?: string
    /** 主题：default 带标题栏（含关闭按钮），custom 无标题栏 —— 面板内不再有独立收起按钮，收起交给 hideOnClickOutside 或调用方自己的 UI */
    theme?: 'default' | 'custom'
    /** 左下角额外按键，如 . 或 00；custom 主题下可传两个（['00', '.']）占满最后一排 */
    extraKey?: string | string[]
    /** 当前已输入内容，用于 maxlength 判断 */
    value?: string
    /** 最多可输入的长度，达到后数字键不可用（删除键与关闭键始终可用） */
    maxlength?: number
    /** 是否显示删除键 */
    showDeleteKey?: boolean
    /** 删除键图标，deleteButtonText 非空时以文字优先 */
    deleteIcon?: JeIconName
    /** 删除键文字，为空则显示删除图标 */
    deleteButtonText?: string
    /** 关闭按钮文案：default 主题用作标题栏按钮文字，custom 主题（无标题栏）用作网格左下角「完成」键的文字 */
    closeButtonText?: string
    /** 关闭按钮是否加载中：作用于标题栏的按钮与网格左下角的「完成」键 */
    closeButtonLoading?: boolean
    /** 是否随机打乱数字键顺序 */
    randomKeyOrder?: boolean
    /** 点击键盘以外区域自动关闭（hideOnClickOutside 的旧名，保留兼容；新名默认已开启，这里显式传 true 同样生效） */
    closeOnClickOutside?: boolean
    /** 点击键盘以外区域自动关闭（命名对齐 Vant），默认开启；要关掉请显式传 false */
    hideOnClickOutside?: boolean
    /** 收起时是否触发 blur；关掉后受控调用方需要自己监听 close 来收起 */
    blurOnClose?: boolean
    /** 底部预留安全区（全面屏手势条） */
    safeAreaInsetBottom?: boolean
    /** 是否开启展开 / 收起动画 */
    transition?: boolean
    /** 指定层级，不传则自动取全局递增层级 */
    zIndex?: number
  }>(),
  {
    // 默认 undefined 而不是 false：只有这样才能区分「没传」与「传了 false」，
    // 没传时继续跟随 modelValue，不破坏既有的 v-model 用法
    show: undefined,
    modelValue: false,
    title: '',
    theme: 'default',
    extraKey: '',
    value: '',
    maxlength: undefined,
    showDeleteKey: true,
    deleteIcon: 'backspace',
    deleteButtonText: '',
    closeButtonText: '完成',
    closeButtonLoading: false,
    randomKeyOrder: false,
    closeOnClickOutside: false,
    hideOnClickOutside: true,
    blurOnClose: true,
    safeAreaInsetBottom: true,
    transition: true,
    zIndex: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 点击数字或额外按键 */
  input: [key: string]
  /** 点击删除键 */
  delete: []
  /** 点击关闭按钮（键盘本身不负责改值） */
  close: []
  /** 由隐藏转为显示 */
  show: []
  /** 由显示转为隐藏，不等过场动画结束 */
  hide: []
  /** 请求收起：点击关闭按钮或键盘外部时触发，受控 show 的调用方据此把 show 置为 false */
  blur: []
}>()

/**
 * 小程序端 `$slots` 是「有没有这个插槽」的布尔标记，不是渲染函数（见 AGENTS / je-container），
 * 所以这里只做真值判断，绝不调用插槽函数。
 */
const slots = useSlots()

const BASE_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const shuffle = (list: string[]) => {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

type KeyKind = 'digit' | 'extra' | 'delete' | 'close'

interface KeyItem {
  /** 稳定的渲染 key：两个额外键可能文案相同，不能拿 text 当 key */
  id: string
  text: string
  kind: KeyKind
  /** 独占一整行（custom 主题配两个额外键时，删除键只能另起一排） */
  wider?: boolean
}

const digits = ref([...BASE_DIGITS])
const innerZIndex = ref(nextZIndex())

/** 传了 show 就说明调用方自己管可见性，此时 modelValue 不再参与判断 */
const showControlled = computed(() => props.show !== undefined)
const visible = computed(() =>
  showControlled.value ? Boolean(props.show) : props.modelValue,
)

/**
 * 两个命名都表示「点外部收起」，任一个为 true 即开启。
 * 新名 hideOnClickOutside 默认开启，旧名 closeOnClickOutside 保留兼容；
 * 要关掉只能走新名的显式 false（旧名默认 false，作为「关闭」信号已无意义）。
 */
const outsideCloses = computed(
  () => props.hideOnClickOutside || props.closeOnClickOutside,
)

/**
 * extraKey 归一化成 0~2 个键的数组。
 * 空字符串按「没配额外键」处理，这是默认值的形态，不是用户真想画一个空键。
 */
const extraKeys = computed(() => {
  const list = Array.isArray(props.extraKey) ? props.extraKey : [props.extraKey]
  return list.filter((key) => key !== '').slice(0, 2)
})

/** 默认插槽里是否真的放了按键：空插槽不该顶掉左下角的占位格 */
const hasCustomKeys = computed(() => Boolean(slots.default))

/**
 * 自定义按键是否落到左下角那个空占位格。
 * default 主题且没配 extraKey 时，左下角本来就是一个空占位格（12 个键刚好 4 排），
 * 让自定义键填进去，键盘仍是整齐的 4 排；若按「追加在末尾」处理会多顶出一整行。
 */
const customInline = computed(
  () =>
    hasCustomKeys.value &&
    props.theme === 'default' &&
    extraKeys.value.length === 0 &&
    !slots['extra-key'],
)

const keys = computed<KeyItem[]>(() => {
  const list: KeyItem[] = digits.value.map((digit) => ({
    id: `digit-${digit}`,
    text: digit,
    kind: 'digit',
  }))

  if (props.theme === 'default') {
    // 默认主题只有左下角一个额外键；数组是 custom 主题的用法，多传的直接忽略
    list.push({ id: 'extra-0', text: extraKeys.value[0] ?? '', kind: 'extra' })
    list.push({ id: 'digit-0', text: '0', kind: 'digit' })
  } else if (extraKeys.value.length === 2) {
    // 与 Vant 的排布一致：额外键分列两头，0 夹在中间。
    // 注意此时左下角被额外键占掉，custom 主题又没有标题栏，面板内就没有收起入口了 ——
    // 这一形态收起要靠 hideOnClickOutside 或调用方自己的 UI
    list.push({ id: 'extra-0', text: extraKeys.value[0], kind: 'extra' })
    list.push({ id: 'digit-0', text: '0', kind: 'digit' })
    list.push({ id: 'extra-1', text: extraKeys.value[1], kind: 'extra' })
  } else if (extraKeys.value.length === 1) {
    list.push({ id: 'extra-0', text: extraKeys.value[0], kind: 'extra' })
    list.push({ id: 'digit-0', text: '0', kind: 'digit' })
  } else {
    // custom 主题没有标题栏，也没有独立收起按钮（对齐 Vant），左下角这个「完成」键就是面板上唯一的收起入口：
    // 它必须一直是可用状态，否则输满 maxlength 之后用户手里就没有能结束输入的键了
    list.push({ id: 'close-key', text: props.closeButtonText, kind: 'close' })
    list.push({ id: 'digit-0', text: '0', kind: 'digit' })
  }

  if (props.showDeleteKey) {
    list.push({
      id: 'delete',
      text: props.deleteButtonText,
      kind: 'delete',
      // 3 列网格里最后一排已经被「额外键 + 0 + 额外键」占满，删除键再挤进去要 4 列，
      // Vant 是用右侧栏解决的；这里让删除键通栏独占一排，保持既有的三列网格
      wider: props.theme === 'custom' && extraKeys.value.length === 2,
    })
  }

  return list
})

const atLimit = computed(
  () => props.maxlength !== undefined && props.value.length >= props.maxlength,
)

/** 加载态：收起入口（标题栏按钮 / 网格里的「完成」键）转圈并禁止点击 */
const closeLoading = computed(() => props.closeButtonLoading)

/**
 * 哪些键不可点。
 * 删除键永远可用：输满之后要靠它退回去修改，禁用会把用户卡死在边界上。
 */
const isKeyDisabled = (key: KeyItem, hasExtraSlot: boolean) => {
  if (key.kind === 'delete') return false
  if (key.kind === 'close') return closeLoading.value
  // 空文案的额外键：没配 extraKey 时它只是个占位空格（禁用）；
  // 但如果调用方用 extra-key 插槽填了内容，它按 Vant 的语义当「收起」键，一直可用
  if (key.kind === 'extra' && !key.text) return !hasExtraSlot
  return atLimit.value
}

/** 每次展开都按当前开关重建数字顺序 */
const refreshDigits = () => {
  // 必须两种分支都写：关掉 randomKeyOrder 之后若不复位，上一次的乱序会留在面板上，
  // 「关闭随机」在界面上就完全看不出效果
  digits.value = props.randomKeyOrder ? shuffle(BASE_DIGITS) : [...BASE_DIGITS]
}

// 初始就处于展开状态时 watch 不会触发，这里补一次键序初始化（但不在挂载时补发 show 事件）
if (visible.value) refreshDigits()

watch(visible, (open) => {
  if (open) {
    // 每次重新打开都取一个新的层级，避免被后开的浮层压在下面
    innerZIndex.value = nextZIndex()
    refreshDigits()
    emit('show')
    return
  }

  emit('hide')
  // 旧行为是「只要隐藏就补发 blur」。受控 show 时由 requestHide 当场发，
  // 这里跳过，否则 @blur="show = false" 的写法会收到两次 blur
  if (props.blurOnClose && !showControlled.value) emit('blur')
})

/**
 * 请求收起。
 * 受控 show 的调用方通常只监听 blur（Vant 文档写法），而 update:modelValue 改不动 visible，
 * 所以这里必须当场补一次 blur；v-model 场景交给上面的 watch 发，避免重复。
 */
const requestHide = () => {
  emit('update:modelValue', false)
  emit('close')
  if (props.blurOnClose && showControlled.value) emit('blur')
}

/** 点键盘以外区域收起：小程序端没有 document，这一下由常驻的透明遮罩承担 */
const onOverlayTap = () => {
  if (!visible.value || !outsideCloses.value) return
  requestHide()
}

/** 按下中的按键 id：H5 的 mousedown 被阻止默认行为后 :active 不再触发，按下反馈改由它维护 */
const pressedId = ref('')

const onKeyPressStart = (key: KeyItem, hasExtraSlot: boolean) => {
  if (isKeyDisabled(key, hasExtraSlot)) return
  pressedId.value = key.id
}

/**
 * 阻止 mousedown 的默认行为，也就是不让按键把焦点从输入框搬走。
 * 数字键盘通常配合某个输入框使用：按键一旦抢走焦点，输入框会先 blur，
 * 受控的 focused / v-model 随即把键盘关掉 —— 表现就是「点任意键都关掉键盘」。
 * 焦点被拦下后 :active 不再命中，按下反馈由 pressedId 兜底（见 onKeyPressStart）。
 */
const onKeyMouseDown = (key: KeyItem, event: MouseEvent, hasExtraSlot: boolean) => {
  event.preventDefault()
  onKeyPressStart(key, hasExtraSlot)
}

const clearPressed = () => {
  pressedId.value = ''
}

const onKey = (key: KeyItem) => {
  if (key.kind === 'close') {
    requestHide()
    return
  }
  if (key.kind === 'delete') {
    // 删除不受 maxlength 限制，连击时每一次点击都独立计数
    emit('delete')
    return
  }
  // 文案为空的额外键在 Vant 里就是「收起」语义，插槽填了内容时同样按收起处理
  if (key.kind === 'extra' && !key.text) {
    requestHide()
    return
  }
  // disabled 之外再挡一道：程序触发或键盘回车不会走按钮的禁用属性
  if (atLimit.value) return
  emit('input', key.text)
}

const rootStyle = computed(() => ({
  zIndex: props.zIndex ?? innerZIndex.value,
  '--je-number-keyboard-safe-bottom': props.safeAreaInsetBottom
    ? 'env(safe-area-inset-bottom, 0px)'
    : '0px',
  // 关掉动画时把时长收成 0，滑入与 visibility 的延迟一起失效，不必再写一套无动画样式
  '--je-number-keyboard-duration': props.transition ? 'var(--je-duration)' : '0s',
}))
</script>

<template>
  <view
    class="je-number-keyboard"
    :class="[`je-number-keyboard--${theme}`, { 'is-open': visible }]"
    :style="rootStyle"
  >
    <!-- 遮罩常驻：既接「点键盘以外收起」，又吞掉穿透的滚动（小程序端没有 body，锁页只能靠它） -->
    <view
      class="je-number-keyboard__overlay"
      aria-hidden="true"
      @tap="onOverlayTap"
      @touchmove.stop.prevent
    />

    <view class="je-number-keyboard__panel" role="dialog" :aria-hidden="!visible">
      <view
        v-if="theme === 'default' && (title || closeButtonText || $slots['title-left'])"
        class="je-number-keyboard__header"
      >
        <view v-if="$slots['title-left']" class="je-number-keyboard__title-left">
          <!-- 标题栏左侧内容：Vant 的收起箭头就是放在这个插槽里，组件本身不带箭头 -->
          <slot name="title-left" />
        </view>
        <text class="je-number-keyboard__title">{{ title }}</text>
        <button
          v-if="closeButtonText"
          type="button"
          class="je-number-keyboard__close"
          :aria-busy="closeLoading"
          :disabled="closeLoading"
          @tap="requestHide"
        >
          <JeIcon v-if="closeLoading" name="loading" spin :size="18" />
          <template v-else>{{ closeButtonText }}</template>
        </button>
      </view>

      <view class="je-number-keyboard__body">
        <template v-for="key in keys" :key="key.id">
          <!-- customInline 时左下角的空占位格让给默认插槽的自定义按键，避免多顶出一行 -->
          <view
            v-if="customInline && key.id === 'extra-0'"
            class="je-number-keyboard__custom"
          >
            <slot />
          </view>
          <button
            v-else
            type="button"
            class="je-number-keyboard__key"
            :class="[
              `je-number-keyboard__key--${key.kind}`,
              {
                'is-wider': key.wider,
                'is-pressed': pressedId === key.id,
                'is-blank': key.kind === 'extra' && !key.text && !$slots['extra-key'],
              },
            ]"
            :disabled="isKeyDisabled(key, !!$slots['extra-key'])"
            @touchstart="onKeyPressStart(key, !!$slots['extra-key'])"
            @touchend="clearPressed"
            @touchcancel="clearPressed"
            @mousedown="onKeyMouseDown(key, $event, !!$slots['extra-key'])"
            @mouseup="clearPressed"
            @mouseleave="clearPressed"
            @tap="onKey(key)"
          >
            <!-- 删除键内容：可替换成任意图标或文字（Vant 同名插槽） -->
            <slot v-if="key.kind === 'delete'" name="delete">
              <JeIcon v-if="!deleteButtonText" :name="deleteIcon" :size="22" />
              <text v-else>{{ deleteButtonText }}</text>
            </slot>
            <!-- 左下角额外按键内容：custom 主题配两个额外键时两个键共用这段内容 -->
            <slot v-else-if="key.kind === 'extra'" name="extra-key">{{ key.text }}</slot>
            <JeIcon
              v-else-if="key.kind === 'close' && closeLoading"
              name="loading"
              spin
              :size="20"
            />
            <template v-else>{{ key.text }}</template>
          </button>
        </template>

        <view v-if="hasCustomKeys && !customInline" class="je-number-keyboard__custom">
          <!-- 自定义按键：插槽内容直接成为网格单元。default 主题且未配 extraKey 时会填进左下角那个空位（键盘仍是 4 排），其余情况追加在固定按键之后 -->
          <slot />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-number-keyboard {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
  /* 这两个变量正常由根节点的内联样式给出，写在这里是为了不依赖 JS 也能有合理默认 */
  --je-number-keyboard-safe-bottom: env(safe-area-inset-bottom, 0px);
  --je-number-keyboard-duration: var(--je-duration);
  transition: visibility var(--je-number-keyboard-duration) ease;
}

.je-number-keyboard.is-open {
  visibility: visible;
  pointer-events: auto;
}

/* 透明遮罩：只负责接「点外部」与锁页，不改变视觉 */
.je-number-keyboard__overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: transparent;
}

.je-number-keyboard__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  padding-bottom: var(--je-number-keyboard-safe-bottom);
  background: var(--je-popup);
  border-top: var(--je-border);
  transform: translateY(100%);
  transition: transform var(--je-number-keyboard-duration) ease;
}

.je-number-keyboard.is-open .je-number-keyboard__panel {
  transform: translateY(0);
}

.je-number-keyboard__header {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 48px;
  padding: 0 16px;
  border-bottom: var(--je-border);
}

.je-number-keyboard__title-left {
  display: inline-flex;
  align-items: center;
  color: var(--je-text-muted);
}

.je-number-keyboard__title {
  font-size: 15px;
  color: var(--je-text-muted);
}

.je-number-keyboard__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  /* 原生 button 自带默认外边距，显式清零后用 auto 顶到右边，标题仍保持左对齐 */
  margin: 0 0 0 auto;
  padding: 6px 2px;
  font-family: inherit;
  font-size: 15px;
  color: var(--je-primary);
  cursor: pointer;
  background: none;
  border: none;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-number-keyboard__close::after,
.je-number-keyboard__key::after {
  border: none;
}

.je-number-keyboard__close:disabled {
  cursor: default;
  opacity: 0.5;
}

/* custom 主题的收起工具条已移除（对齐 Vant），面板里只剩下按键本身 */

.je-number-keyboard__body {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 8px;
}

.je-number-keyboard__key {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 48px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: 22px;
  line-height: 1;
  color: var(--je-text);
  cursor: pointer;
  background: var(--je-surface);
  border: none;
  border-radius: var(--je-radius-sm);
  outline: none;
  touch-action: manipulation;
  /* 长按按键时不要选中小方块里的数字、也不要弹系统菜单：连击和长按都应该是纯粹的按键手势 */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, transform 0.12s ease, opacity 0.15s ease;
}

/* :active 在 mousedown 被阻止默认行为（为了不抢输入框焦点）后不再触发，所以按下态由 is-pressed 兜底 */
.je-number-keyboard__key:not(:disabled):active,
.je-number-keyboard__key.is-pressed:not(:disabled) {
  background: color-mix(in srgb, var(--je-primary) 40%, transparent);
  transform: scale(0.96);
}

.je-number-keyboard__key:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-primary) 35%, transparent);
}

.je-number-keyboard__key:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.je-number-keyboard__key--delete {
  font-size: 18px;
  color: var(--je-text-muted);
}

/* 「完成」用主色点一下，和数字键区分开 */
.je-number-keyboard__key--close {
  font-size: 17px;
  font-weight: 500;
  color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, var(--je-surface));
}

.je-number-keyboard__key.is-wider {
  grid-column: 1 / -1;
}

.je-number-keyboard__key.is-blank {
  visibility: hidden;
}

/* display:contents 让插槽里的按键直接成为网格单元，不额外多一层盒子 */
.je-number-keyboard__custom {
  display: contents;
}

@media (max-width: 768px) {
  .je-number-keyboard__key {
    height: 50px;
  }

  /* 触控热区 ≥44px：标题栏的文字关闭键在移动端要撑够 */
  .je-number-keyboard__close {
    min-height: 44px;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类一起列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效（AGENTS 陷阱 5）。
 */
@media (prefers-reduced-motion: reduce) {
  .je-number-keyboard,
  .je-number-keyboard__panel,
  .je-number-keyboard__key,
  .je-number-keyboard.is-open .je-number-keyboard__panel {
    transition: none;
  }
}
</style>
