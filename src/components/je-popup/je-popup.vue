<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeLocale } from '../je-locale'
import type { JeIconName } from '../je-icon/icons'

defineOptions({ name: 'JePopup' })

const props = withDefaults(
  defineProps<{
    /** 显示 / 隐藏 */
    modelValue?: boolean
    /** 弹出位置 */
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
    /** 圆角 */
    round?: boolean
    /** 右上角等位置的关闭按钮 */
    closeable?: boolean
    /** 关闭按钮图标 */
    closeIcon?: JeIconName
    /** 关闭按钮位置 */
    closeIconPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    /** 是否显示遮罩 */
    overlay?: boolean
    /** 点击遮罩关闭 */
    closeOnClickOverlay?: boolean
    /** 打开时锁定页面滚动（H5 锁 body；小程序端由遮罩层的 catchtouchmove 兜住） */
    lockScroll?: boolean
    /** 底部预留安全区 */
    safeAreaInsetBottom?: boolean
    /** 顶部预留安全区 */
    safeAreaInsetTop?: boolean
    /** 展开 / 收起的过渡时长，单位毫秒，同时用于 opened / closed 事件时机 */
    duration?: number
    /** 指定层级，不传则自动取全局递增层级 */
    zIndex?: number
  }>(),
  {
    modelValue: false,
    position: 'center',
    round: false,
    closeable: false,
    closeIcon: 'close',
    closeIconPosition: 'top-right',
    overlay: true,
    closeOnClickOverlay: true,
    lockScroll: true,
    safeAreaInsetBottom: false,
    safeAreaInsetTop: false,
    duration: 300,
    zIndex: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 开始展开 */
  open: []
  /** 展开动画结束 */
  opened: []
  /** 开始收起 */
  close: []
  /** 收起动画结束 */
  closed: []
  /** 点击遮罩 */
  clickOverlay: []
}>()

const { t } = useJeLocale()

const innerZIndex = ref(nextZIndex())

let timer: ReturnType<typeof setTimeout> | undefined

const clearTimer = () => {
  clearTimeout(timer)
  timer = undefined
}

/* H5 锁 body 滚动；小程序端没有 body，锁屏交给遮罩层的 catchtouchmove */
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

watch(
  () => props.modelValue,
  (open) => {
    clearTimer()
    if (open) {
      // 每次打开都重新取层级，保证后开的浮层压在上面
      innerZIndex.value = nextZIndex()
      emit('open')
      timer = setTimeout(() => emit('opened'), props.duration)
    } else {
      emit('close')
      timer = setTimeout(() => emit('closed'), props.duration)
    }
    // #ifdef H5
    setBodyScrollLock(open && props.lockScroll)
    // #endif
  },
)

onBeforeUnmount(() => {
  clearTimer()
  // #ifdef H5
  setBodyScrollLock(false)
  // #endif
})

const rootStyle = computed(() => ({
  zIndex: props.zIndex ?? innerZIndex.value,
  '--je-popup-duration': `${props.duration}ms`,
  '--je-popup-safe-top': props.safeAreaInsetTop ? 'env(safe-area-inset-top, 0px)' : '0px',
  '--je-popup-safe-bottom': props.safeAreaInsetBottom ? 'env(safe-area-inset-bottom, 0px)' : '0px',
}))

const close = () => {
  if (!props.modelValue) return
  emit('update:modelValue', false)
}

const onOverlayClick = () => {
  emit('clickOverlay')
  if (props.closeOnClickOverlay) close()
}
</script>

<template>
  <view
    class="je-popup"
    :class="[
      `je-popup--${position}`,
      { 'is-open': modelValue, 'is-round': round, 'has-overlay': overlay },
    ]"
    :style="rootStyle"
  >
    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="overlay"
      class="je-popup__overlay"
      aria-hidden="true"
      @tap="onOverlayClick"
      @touchmove.stop.prevent
    />

    <view class="je-popup__content" role="dialog" :aria-hidden="!modelValue">
      <slot />

      <button
        v-if="closeable"
        type="button"
        class="je-popup__close"
        :class="`je-popup__close--${closeIconPosition}`"
        :aria-label="t('close')"
        @tap="close"
      >
        <JeIcon :name="closeIcon" :size="16" />
      </button>
    </view>
  </view>
</template>

<style scoped>
.je-popup {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 容器铺满视口且常驻 DOM：默认放行点击，只有展开时由子元素各自接管 */
  pointer-events: none;
  --je-popup-duration: 300ms;
}

.je-popup__overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.5);
  /* 小程序端不支持 backdrop-filter，退化成纯半透明遮罩 */
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--je-popup-duration) ease,
    visibility 0s linear var(--je-popup-duration);
}

.je-popup.is-open .je-popup__overlay {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity var(--je-popup-duration) ease;
}

.je-popup__content {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 100%;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--je-border);
  box-shadow: var(--je-shadow-popup);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  will-change: transform, opacity;
  transition: transform var(--je-popup-duration) ease-in,
    opacity calc(var(--je-popup-duration) * 0.7) ease-in,
    visibility 0s linear var(--je-popup-duration);
}

.je-popup.is-open .je-popup__content {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: translate(0, 0) scale(1);
  transition: transform var(--je-popup-duration) var(--je-ease-out-back),
    opacity calc(var(--je-popup-duration) * 0.8) ease-out;
}

.je-popup.is-round .je-popup__content {
  border-radius: var(--je-radius-lg);
}

/* 居中 */
.je-popup--center .je-popup__content {
  top: 50%;
  left: 50%;
  width: 92vw;
  max-width: 480px;
  transform: translate(-50%, -50%) scale(0.86);
}

.je-popup--center.is-open .je-popup__content {
  transform: translate(-50%, -50%) scale(1);
}

/* 顶部滑入 */
.je-popup--top .je-popup__content {
  top: 0;
  right: 0;
  left: 0;
  padding-top: var(--je-popup-safe-top);
  transform: translateY(-100%);
}

.je-popup--top.is-open .je-popup__content {
  transform: translateY(0);
}

/* 底部滑入 */
.je-popup--bottom .je-popup__content {
  right: 0;
  bottom: 0;
  left: 0;
  padding-bottom: var(--je-popup-safe-bottom);
  transform: translateY(100%);
}

.je-popup--bottom.is-open .je-popup__content {
  transform: translateY(0);
}

/* 左侧滑入 */
.je-popup--left .je-popup__content {
  top: 0;
  bottom: 0;
  left: 0;
  width: 86vw;
  max-width: 420px;
  transform: translateX(-100%);
}

.je-popup--left.is-open .je-popup__content {
  transform: translateX(0);
}

/* 右侧滑入 */
.je-popup--right .je-popup__content {
  top: 0;
  right: 0;
  bottom: 0;
  width: 86vw;
  max-width: 420px;
  transform: translateX(100%);
}

.je-popup--right.is-open .je-popup__content {
  transform: translateX(0);
}

.je-popup__close {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  margin: 0;
  line-height: 1;
  color: var(--je-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 50%;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-popup__close::after {
  border: none;
}

.je-popup__close:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-popup__close--top-left {
  top: 8px;
  left: 8px;
}

.je-popup__close--top-right {
  top: 8px;
  right: 8px;
}

.je-popup__close--bottom-left {
  bottom: 8px;
  left: 8px;
}

.je-popup__close--bottom-right {
  right: 8px;
  bottom: 8px;
}

@media (max-width: 768px) {
  .je-popup__close {
    width: 40px;
    height: 40px;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类以及各个方向修饰符一起列进来：它们的选择器特异性
 * 比单个基础类高，只写基础类的话状态规则里的 transition 会反压回来，
 * 减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-popup__overlay,
  .je-popup__content,
  .je-popup.is-open .je-popup__overlay,
  .je-popup.is-open .je-popup__content,
  .je-popup--center .je-popup__content,
  .je-popup--center.is-open .je-popup__content,
  .je-popup--top .je-popup__content,
  .je-popup--top.is-open .je-popup__content,
  .je-popup--bottom .je-popup__content,
  .je-popup--bottom.is-open .je-popup__content,
  .je-popup--left .je-popup__content,
  .je-popup--left.is-open .je-popup__content,
  .je-popup--right .je-popup__content,
  .je-popup--right.is-open .je-popup__content {
    transition: none;
  }
}
</style>
