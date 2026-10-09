<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeButton 常常是 JeButtonGroup 或页面 flex 行里的子项，靠自身根节点承担尺寸，相邻按钮还用
   * -1px 负边距互相叠边。小程序自定义组件默认多包一层宿主节点，flex 子项变成宿主，根节点的
   * inline-flex 与负边距都落不到实处。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, onBeforeUnmount, ref } from 'vue'
import { jePresets } from '../../core/presets'
import { useSpring } from '../../core/useSpring'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import { jeButtonGroupKey, type JeButtonSize, type JeButtonType, type JeButtonVariant } from './types'

defineOptions({ name: 'JeButton' })

const props = withDefaults(
  defineProps<{
    /**
     * 语义类型，默认 primary。default 是中性底色，其余与 JeText 的语义色一一对应；
     * 放在按钮组里可省略，由组统一下发。
     */
    type?: JeButtonType
    /**
     * 皮肤，type 的别名，额外支持 ghost（半透明的次级按钮）。
     * 与 type 同时传入时以 variant 为准。
     */
    variant?: JeButtonVariant
    /** 透传给原生 button，默认 button 以免误触发表单提交 */
    nativeType?: 'button' | 'submit' | 'reset'
    /** 尺寸，默认 default；放在按钮组里可省略、由组统一下发 */
    size?: JeButtonSize
    /** 素色按钮：主题色描边与文字，底色是主题色的半透明 */
    plain?: boolean
    /** 虚线描边按钮 */
    dashed?: boolean
    /** 文字按钮：无边框无底色 */
    text?: boolean
    /** 链接按钮：形如超链接，hover 出现下划线 */
    link?: boolean
    /** 圆角胶囊按钮 */
    round?: boolean
    /** 正圆按钮，通常只放一个图标 */
    circle?: boolean
    /** 加载中：禁止点击并在文字前显示转圈图标 */
    loading?: boolean
    /** 文字前（circle 时是唯一内容）的图标 */
    icon?: JeIconName
    /** 撑满父容器宽度，移动端的主操作按钮用它 */
    block?: boolean
    disabled?: boolean
  }>(),
  {
    nativeType: 'button',
    plain: false,
    dashed: false,
    text: false,
    link: false,
    round: false,
    circle: false,
    loading: false,
    block: false,
    disabled: false,
  },
)

/**
 * 点击按钮。小程序端自定义组件的事件只能靠 emit 冒出去（原生 tap 不会变成 click），
 * 所以这里必须显式声明并派发，否则 H5 能点、小程序点了没反应。
 */
const emit = defineEmits<{
  /** 点击按钮；disabled / loading 时不派发 */
  click: [event: MouseEvent]
}>()

const group = inject(jeButtonGroupKey, null)

/** 登记用的序号：实例 uid 全局唯一，且按创建顺序递增（即 DOM 顺序） */
const buttonUid = getCurrentInstance()?.uid ?? 0

if (group) {
  group.register(buttonUid)
  onBeforeUnmount(() => group.unregister(buttonUid))
}

/** 皮肤：variant 优先，其次是 type，再退回按钮组的默认类型 */
const skin = computed<JeButtonVariant>(
  () => props.variant ?? props.type ?? group?.getType() ?? 'primary',
)

/** 尺寸：组件自身优先，其次是按钮组；default 不产生类名，避免和 default 皮肤撞名 */
const sizeClass = computed(() => {
  const size = props.size ?? group?.getSize() ?? 'default'
  return size === 'default' ? '' : `je-button--${size}`
})

/**
 * 组内位置：首尾圆角与 -1px 叠边由子按钮自己落地。小程序端样式隔离，
 * 父组件 wxss 里的 `.je-button-group > .je-button:first-child` 匹配不到这里。
 */
const groupClass = computed(() => {
  if (!group) return ''
  const position = group.getPosition(buttonUid)
  if (position === 'only') return ''
  // 样式里按 h / v 缩写（horizontal / vertical），保持类名短一些
  const axis = group.getDirection() === 'vertical' ? 'v' : 'h'
  return `je-button--group-${axis}-${position}`
})

/** 加载中同样不可点，视觉上比 disabled 收敛一些 */
const isDisabled = computed(() => props.disabled || props.loading)

const { value: scaleX, set: setScaleX } = useSpring(1, jePresets.release)
const { value: scaleY, set: setScaleY } = useSpring(1, jePresets.release)
const { value: skewX, set: setSkewX } = useSpring(0, jePresets.release)

/** 防止 pointerleave / blur 在未按下时反复触归位动画 */
const pressed = ref(false)

const style = computed(() => ({
  transform: `scaleX(${scaleX.value}) scaleY(${scaleY.value}) skewX(${skewX.value}deg)`,
}))

/** 左右撑开 + 上下压扁 + 轻微倾斜，果冻手感就来自这三个量的叠加 */
const squish = () => {
  if (isDisabled.value) return
  pressed.value = true
  setScaleX(1.18, jePresets.press)
  setScaleY(0.78, jePresets.press)
  setSkewX(-4, jePresets.press)
}

const release = () => {
  if (!pressed.value) return
  pressed.value = false
  setScaleX(1, jePresets.release)
  setScaleY(1, jePresets.release)
  setSkewX(0, jePresets.release)
}

/** 原生 button 在两端对 disabled 的拦截并不一致，这里统一兜一层，与 squish 的判定保持一致 */
const onClick = (event: MouseEvent) => {
  if (isDisabled.value) return
  emit('click', event)
}
</script>

<template>
  <!--
    按下 / 抬起的挤压动画要按平台绑不同的事件：H5 走指针事件（还能覆盖键盘操作），
    小程序端没有指针事件、只有触摸事件。条件编译只支持按「整块元素」取舍，所以这里
    把按钮整体写两遍，两端的编译产物各只剩一个根节点。
  -->
  <!-- #ifdef H5 -->
  <button
    class="je-button"
    :class="[
      `je-button--${skin}`,
      sizeClass,
      groupClass,
      {
        'je-button--in-group': group,
        'je-button--plain': plain,
        'je-button--dashed': dashed,
        'je-button--text': text,
        'je-button--link': link,
        'je-button--round': round,
        'je-button--circle': circle,
        'je-button--block': block,
        'je-button--loading': loading,
      },
    ]"
    :type="nativeType"
    :disabled="isDisabled"
    :style="style"
    @click="onClick"
    @pointerdown="squish"
    @pointerup="release"
    @pointerleave="release"
    @pointercancel="release"
    @blur="release"
    @keydown.space="squish"
    @keyup.space="release"
    @keydown.enter="squish"
    @keyup.enter="release"
  >
    <JeIcon v-if="loading" class="je-button__icon" name="loading" spin />
    <JeIcon v-else-if="icon" class="je-button__icon" :name="icon" />
    <span v-if="$slots.default" class="je-button__label"><slot /></span>
  </button>
  <!-- #endif -->

  <!-- #ifndef H5 -->
  <button
    class="je-button"
    :class="[
      `je-button--${skin}`,
      sizeClass,
      groupClass,
      {
        'je-button--in-group': group,
        'je-button--plain': plain,
        'je-button--dashed': dashed,
        'je-button--text': text,
        'je-button--link': link,
        'je-button--round': round,
        'je-button--circle': circle,
        'je-button--block': block,
        'je-button--loading': loading,
      },
    ]"
    :type="nativeType"
    :disabled="isDisabled"
    :style="style"
    @click="onClick"
    @touchstart="squish"
    @touchend="release"
    @touchcancel="release"
  >
    <JeIcon v-if="loading" class="je-button__icon" name="loading" spin />
    <JeIcon v-else-if="icon" class="je-button__icon" :name="icon" />
    <span v-if="$slots.default" class="je-button__label"><slot /></span>
  </button>
  <!-- #endif -->
</template>

<style scoped>
.je-button {
  position: relative;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* 两端原生 button 都自带 margin-left/right: auto（H5 的 uni-button、小程序的 button），
     在 flex 行里会变成自动外边距把按钮顶到中间，压掉页脚/工具栏的 justify-content。
     这里显式清零；需要居中的场景由父级的 text-align / justify-content 负责 */
  margin: 0;
  padding: var(--jb-py, 15px) var(--jb-px, 28px);
  font-family: inherit;
  font-size: var(--jb-fs, 16px);
  font-weight: 700;
  line-height: 1.2;
  border: 1px solid transparent;
  border-radius: var(--je-radius-lg);
  cursor: pointer;
  outline: none;
  /* 皮肤默认取品牌色；具体 type 会覆盖这四个变量 */
  --jb-from: var(--je-primary);
  --jb-to: var(--je-primary-end);
  --jb-color: var(--je-primary);
  /* 实体按钮上的文字：彩色渐变上一律浅色，不随明暗翻转 */
  --jb-solid: var(--je-text-on-color);
  /* 实体果冻按钮：胶囊渐变 + 同色光晕 + 上下内阴影；扁平修饰符会逐条覆盖 */
  color: var(--jb-solid);
  background: linear-gradient(135deg, var(--jb-from), var(--jb-to));
  box-shadow:
    0 10px 30px color-mix(in srgb, var(--jb-from) 40%, transparent),
    inset 0 2px 4px rgba(255, 255, 255, 0.3),
    inset 0 -3px 6px rgba(0, 0, 0, 0.2);
  transform-origin: center bottom;
  will-change: transform;
  transition: box-shadow var(--je-duration) ease, background var(--je-duration) ease,
    color var(--je-duration) ease, border-color var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-button::after {
  border: none;
}

.je-button:hover:not(:disabled) {
  box-shadow:
    0 14px 40px color-mix(in srgb, var(--jb-from) 55%, transparent),
    inset 0 2px 4px rgba(255, 255, 255, 0.3),
    inset 0 -3px 6px rgba(0, 0, 0, 0.2);
}

.je-button__label,
.je-button__icon {
  position: relative;
  z-index: 1;
}

.je-button__icon {
  /* 跟字号缩放，省得为大 / 小尺寸各写一遍图标尺寸 */
  width: 1.15em;
  height: 1.15em;
}

/* 上半部的果冻高光：底部收窄成椭圆，看起来像凸起的胶体 */
.je-button::before {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  bottom: 50%;
  left: 2px;
  border-radius: var(--je-radius-lg) var(--je-radius-lg) 40% 40%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0));
  pointer-events: none;
}

/* 每个语义皮肤只声明颜色变量；实体/扁平样式各自统一走下面的共享规则。
   这些值必须在这里现算（var / color-mix），才能跟着主题 token 一起换肤 */
.je-button--default {
  --jb-from: color-mix(in srgb, var(--je-popup) 85%, #fff);
  --jb-to: var(--je-popup);
  --jb-color: var(--je-text);
  /* 这个皮肤的渐变本身是中性浅/深色，文字跟着正文色走 */
  --jb-solid: var(--je-text);
  border-color: var(--je-border-color);
}

.je-button--primary {
  --jb-from: var(--je-primary);
  --jb-to: var(--je-primary-end);
  --jb-color: var(--je-primary);
}

.je-button--success {
  --jb-from: var(--je-success);
  --jb-to: color-mix(in srgb, var(--je-success) 62%, #000);
  --jb-color: var(--je-success);
}

.je-button--warning {
  --jb-from: var(--je-warning);
  --jb-to: color-mix(in srgb, var(--je-warning) 62%, #000);
  --jb-color: var(--je-warning);
}

.je-button--danger {
  --jb-from: var(--je-danger);
  --jb-to: color-mix(in srgb, var(--je-danger) 62%, #000);
  --jb-color: var(--je-danger);
}

.je-button--info {
  --jb-from: var(--je-info);
  --jb-to: color-mix(in srgb, var(--je-info) 62%, #000);
  --jb-color: var(--je-info);
}

/* ghost：半透明次级按钮，全部扁平处理 */
.je-button--ghost {
  color: var(--je-text-muted);
  background: var(--je-surface);
  border-color: var(--je-border-color);
  box-shadow: none;
}

.je-button--ghost::before {
  opacity: 0.4;
}

.je-button--ghost:hover:not(:disabled) {
  color: var(--je-text);
  background: var(--je-surface-hover);
  box-shadow: none;
}

/* 素色：主题色描边 + 同色半透明底 */
.je-button--plain,
.je-button--dashed {
  color: var(--jb-color);
  background: color-mix(in srgb, var(--jb-color) 14%, transparent);
  border-color: color-mix(in srgb, var(--jb-color) 45%, transparent);
  box-shadow: none;
}

.je-button--plain::before,
.je-button--dashed::before,
.je-button--text::before,
.je-button--link::before {
  display: none;
}

.je-button--plain:hover:not(:disabled),
.je-button--dashed:hover:not(:disabled) {
  background: color-mix(in srgb, var(--jb-color) 24%, transparent);
  border-color: color-mix(in srgb, var(--jb-color) 65%, transparent);
  box-shadow: none;
}

/* 虚线描边：底色留空，hover 才出现淡淡的一层 */
.je-button--dashed {
  background: transparent;
}

.je-button--dashed:hover:not(:disabled) {
  background: color-mix(in srgb, var(--jb-color) 12%, transparent);
}

/* 文字按钮：无边框无底色，hover 才浮出一层浅底 */
.je-button--text {
  color: var(--jb-color);
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.je-button--text:hover:not(:disabled) {
  background: color-mix(in srgb, var(--jb-color) 16%, transparent);
  box-shadow: none;
}

/* 链接按钮：形如超链接，hover 出现下划线、不铺底色 */
.je-button--link {
  color: var(--jb-color);
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.je-button--link:hover:not(:disabled) {
  text-decoration: underline;
  box-shadow: none;
}

/* 尺寸：default 不产生类名，避免和 default 皮肤撞名 */
.je-button--large {
  --jb-py: 17px;
  --jb-px: 34px;
  --jb-fs: 17px;
  --jb-size: 56px;
}

.je-button--small {
  --jb-py: 9px;
  --jb-px: 16px;
  --jb-fs: 14px;
  --jb-size: 38px;
}

.je-button--round {
  border-radius: 999px;
}

.je-button--round::before {
  border-radius: 999px 999px 40% 40%;
}

/* 正圆：内容只有图标，尺寸靠 --jb-size 定死 */
.je-button--circle {
  width: var(--jb-size, 50px);
  height: var(--jb-size, 50px);
  padding: 0;
  border-radius: 50%;
}

.je-button--circle::before {
  border-radius: 50% 50% 42% 42%;
}

.je-button--block {
  display: flex;
  width: 100%;
}

/*
 * 按钮组内首尾相扣：内侧圆角压平，相邻描边用 -1px 负边距重合而不是叠成 2px。
 * 这些规则必须排在 --round / --circle 之后：同为 (0,1,0) 的类选择器，靠源码顺序取胜。
 */
.je-button--group-h-first {
  border-radius: var(--je-radius-lg) 0 0 var(--je-radius-lg);
}

.je-button--group-h-middle {
  margin-left: -1px;
  border-radius: 0;
}

.je-button--group-h-last {
  margin-left: -1px;
  border-radius: 0 var(--je-radius-lg) var(--je-radius-lg) 0;
}

.je-button--group-v-first {
  border-radius: var(--je-radius-lg) var(--je-radius-lg) 0 0;
}

.je-button--group-v-middle {
  margin-top: -1px;
  border-radius: 0;
}

.je-button--group-v-last {
  margin-top: -1px;
  border-radius: 0 0 var(--je-radius-lg) var(--je-radius-lg);
}

/* hover / 聚焦的按钮提到最上层，否则重合的那条边会盖住它 */
.je-button--in-group:hover:not(:disabled),
.je-button--in-group:focus-visible {
  z-index: 2;
}

.je-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 加载态：仍然可读，所以只轻微降透明度 */
.je-button--loading,
.je-button--loading:disabled {
  opacity: 0.8;
  cursor: default;
}

/* 键盘用户需要看得见的焦点环，鼠标点击不会触发 */
.je-button:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 3px;
}

/* 触屏上把热区兜到 44px，与项目内其它控件的可达性约定一致 */
@media (max-width: 768px) {
  .je-button {
    min-height: 44px;
  }
}

/* 「减弱动效」不在这里处理：内核检测到该偏好时会直接跳到目标值，不做插值 */
</style>
