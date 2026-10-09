<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import JeButton from '../je-button/je-button.vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeDialogProps, JeDialogDone } from './types'

defineOptions({ name: 'JeDialog' })

const props = withDefaults(defineProps<JeDialogProps>(), {
  modelValue: false,
  title: '',
  width: 520,
  showClose: true,
  closeIcon: 'close',
  closeOnClickModal: true,
  closeOnPressEscape: true,
  closeOnEscape: undefined,
  beforeClose: undefined,
  // 三个页脚属性都留空：不传 confirmButtonText 就完全不渲染内置页脚，#footer 插槽的老用法不受影响
  confirmButtonText: undefined,
  cancelButtonText: undefined,
  showCancelButton: false,
  footerLayout: 'auto',
  destroyOnClose: false,
  draggable: false,
  fullscreen: false,
  alignCenter: true,
  center: false,
  top: '',
  bottomSheet: false,
  lockScroll: true,
  zIndex: undefined,
})

const emit = defineEmits<{
  /** v-model 的 modelValue 更新时触发 */
  'update:modelValue': [value: boolean]
  /** 开始打开，此时面板还没跑完入场动画 */
  open: []
  /** 打开动画结束后触发，首次要摸 DOM 时用它 */
  opened: []
  /** 面板确实开始收起时触发；被 before-close 拦下则不会触发 */
  close: []
  /** 收起动画结束、面板不可见后触发 */
  closed: []
  /** 内置页脚的确认按钮走完流程后触发（被 before-close 拦下时不触发） */
  confirm: []
  /** 内置页脚的取消按钮走完流程后触发（被 before-close 拦下时不触发） */
  cancel: []
}>()

/** 打开动画时长，与样式里的 .42s 对齐；打开后要等它跑完才算 opened */
const OPEN_ANIMATION_MS = 420

const innerZIndex = ref(props.zIndex ?? nextZIndex())

/** 入场动画是否已经结束。拖拽只会发生在展开完成后，用它把展开用的回弹过渡切掉 */
const settled = ref(false)

/** 两种写法取或：closeOnPressEscape 是 EP 的名字，closeOnEscape 是本库历史名字 */
const escapeEnabled = computed(() => props.closeOnEscape ?? props.closeOnPressEscape)

/** 有 top 就改成顶部对齐排版；fullscreen 下两者都不参与 */
const topAligned = computed(() => !props.fullscreen && !props.alignCenter && props.top !== '')

/** 惰性渲染的开关：destroyOnClose 时首次打开之前不渲染默认插槽 */
const everOpened = ref(props.modelValue)
const bodyVisible = computed(() => !props.destroyOnClose || everOpened.value)

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

/**
 * 关闭的真正落点：只改 v-model，动画相关的事件交给 watch 统一发，
 * 这样外部直接改 modelValue 或调 handleClose 走的都是同一条路径。
 */
const doClose = () => {
  if (!props.modelValue) return
  emit('update:modelValue', false)
  emit('close')
}

/**
 * 用户主动触发的关闭（关闭按钮 / 遮罩 / Esc）。
 * 有 beforeClose 时把决定权交出去，不调用 done 就被拦住；此时不发 close，
 * 与「close 表示确实开始收起」的语义保持一致。
 */
const handleClose = () => {
  if (!props.modelValue) return
  if (props.beforeClose) {
    const done: JeDialogDone = (cancel) => {
      if (cancel) return
      doClose()
    }
    props.beforeClose(done)
    return
  }
  doClose()
}

const onScrimClick = () => {
  if (props.closeOnClickModal) handleClose()
}

/* Esc 关闭：小程序端没有键盘事件，整块只在 H5 编译 */
// #ifdef H5
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !escapeEnabled.value) return
  event.stopPropagation()
  handleClose()
}
// #endif

/* ---------------------------------------------------------------- 拖拽 */

const dragX = ref(0)
const dragY = ref(0)
const dragging = ref(false)
let startX = 0
let startY = 0

const beginDrag = (clientX: number, clientY: number) => {
  if (!props.draggable) return
  dragging.value = true
  startX = clientX - dragX.value
  startY = clientY - dragY.value
}

const moveDrag = (clientX: number, clientY: number) => {
  if (!dragging.value) return
  dragX.value = clientX - startX
  dragY.value = clientY - startY
}

const endDrag = () => {
  dragging.value = false
}

/** 复位只改位移，不动开关状态：关闭后再打开时 watch 会调用它 */
const resetPosition = () => {
  dragX.value = 0
  dragY.value = 0
  dragging.value = false
}

/*
 * 拖拽走「鼠标 + 触摸」两条原生通道，不依赖 pointerdown：部分 WebView 与自动化环境
 * 并不派发指针事件（H5 侧实测只收到 mousedown/mouseup/click），只用指针通道会出现
 * 「拖不动」。鼠标按下收在标题栏上、移动 / 抬起挂到 document，划出标题栏也能继续拖。
 *
 * 两套处理器不写条件编译：模板上同一个标题栏元素同时绑了鼠标与触摸事件，
 * 条件编译只支持按整块元素取舍，砍掉任何一套都会让模板引用到不存在的绑定。
 * 小程序端 mousedown 永远不会触发，H5 端触摸事件同理，互不干扰。
 */
const onMouseDown = (event: MouseEvent) => {
  if (!props.draggable || event.button !== 0) return
  beginDrag(event.clientX, event.clientY)
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
}

const onDocMouseMove = (event: MouseEvent) => moveDrag(event.clientX, event.clientY)

const onDocMouseUp = () => {
  endDrag()
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
}

const onTouchStart = (event: TouchEvent) => {
  const touch = event.touches?.[0]
  if (touch) beginDrag(touch.clientX, touch.clientY)
}

const onTouchMove = (event: TouchEvent) => {
  const touch = event.touches?.[0]
  if (touch) moveDrag(touch.clientX, touch.clientY)
}

/* ---------------------------------------------------------------- 内置页脚 */

/**
 * 内置页脚只在传了 confirmButtonText 时渲染：这样「页脚交给 #footer 插槽」的老页面
 * 拿到的 DOM 与以前完全一致。渲染优先级仍然是 #footer 插槽 > 内置页脚。
 */
const hasBuiltinFooter = computed(() => props.confirmButtonText !== undefined)

/** 取消按钮：showCancelButton 或 cancelButtonText 满足其一即显示；没给文案时用默认「取消」 */
const showCancel = computed(() => props.showCancelButton || props.cancelButtonText !== undefined)

const cancelText = computed(() => props.cancelButtonText ?? '取消')

/**
 * 确认按钮的加载态。只有走 beforeClose 时才点亮：
 * done 一旦被调用（放行或取消）就立刻熄灭，页面保持打开时不会留下转圈的按钮。
 */
const confirmLoading = ref(false)

/**
 * 面板是否还挂在页面上。beforeClose 迟迟不调用 done、期间面板又被别的路径关掉时，
 * done 的后续调用不该再去动一个已经卸载的实例。
 */
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

/**
 * 确认这条收尾路径。内置确认按钮和命令式 API 都走它：
 * 顺序固定为「先发 confirm 事件，再过 beforeClose」——因为组件在 beforeClose 拦下时不会发 close，
 * 所以「事件记下了动作、面板却仍开着」这种组合是预期的，与既有 close 事件的语义一致。
 * done 的约定与 handleClose 相同：done() / done(false) 放行，done(true) 表示不关。
 */
const handleConfirm = () => {
  if (!props.modelValue) return
  emit('confirm')
  if (!props.beforeClose) {
    doClose()
    return
  }
  confirmLoading.value = true
  const done: JeDialogDone = (cancel) => {
    confirmLoading.value = false
    if (cancel || !mounted.value) return
    doClose()
  }
  props.beforeClose(done)
}

/**
 * 取消这条收尾路径（内置取消按钮 / 命令式 API 的取消侧）：
 * 同样过 beforeClose，放行后发 cancel 事件，于是命令式调用能区分「取消」与「被遮罩关掉」。
 */
const handleCancel = () => {
  if (!props.modelValue) return
  if (props.beforeClose) {
    const done: JeDialogDone = (cancel) => {
      if (cancel || !mounted.value) return
      doClose()
      emit('cancel')
    }
    props.beforeClose(done)
    return
  }
  doClose()
  emit('cancel')
}

/* ---------------------------------------------------------------- 样式 */

const panelStyle = computed(() => ({
  zIndex: props.zIndex ?? innerZIndex.value,
  '--je-dialog-width': typeof props.width === 'number' ? `${props.width}px` : props.width,
  // 只在顶部对齐时才下发，否则空值会把 margin-top 的计算整个作废
  ...(topAligned.value ? { '--je-dialog-top': props.top } : {}),
  // 位移做成 CSS 变量而不是直接写 transform，否则会冲掉里面对齐用的 translate
  '--je-dialog-drag-x': `${dragX.value}px`,
  '--je-dialog-drag-y': `${dragY.value}px`,
  // 未落定时保持展开动画的过渡；落定后用短过渡跟随指针，拖拽时干脆不要过渡
  '--je-dialog-drag-transition': settled.value
    ? dragging.value
      ? 'transform 0s'
      : 'transform 0.2s ease-out'
    : 'transform 0.42s var(--je-ease-out-back)',
}))

/* ---------------------------------------------------------------- 生命周期 */

let openTimer: ReturnType<typeof setTimeout> | undefined
let closeTimer: ReturnType<typeof setTimeout> | undefined

const clearTimers = () => {
  clearTimeout(openTimer)
  clearTimeout(closeTimer)
  openTimer = undefined
  closeTimer = undefined
}

watch(
  () => props.modelValue,
  (open) => {
    clearTimers()
    if (open) {
      everOpened.value = true
      if (props.zIndex === undefined) innerZIndex.value = nextZIndex()
      resetPosition()
      settled.value = false
      emit('open')
      // #ifdef H5
      document.addEventListener('keydown', onKeydown)
      // #endif
      // 面板常驻 DOM 且有过渡，所以用定时器而不是 nextTick 来对齐动画结束
      openTimer = setTimeout(() => {
        settled.value = true
        emit('opened')
      }, OPEN_ANIMATION_MS)
    } else {
      settled.value = false
      // #ifdef H5
      document.removeEventListener('keydown', onKeydown)
      // #endif
      closeTimer = setTimeout(() => {
        emit('closed')
        // 关闭后才清位移，否则收起动画会突然跳回中间
        resetPosition()
      }, OPEN_ANIMATION_MS)
    }
    // #ifdef H5
    setBodyScrollLock(open && props.lockScroll)
    // #endif
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  mounted.value = false
  clearTimers()
  // #ifdef H5
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
  setBodyScrollLock(false)
  // #endif
})

defineExpose({
  /** 走一遍完整的关闭流程（含 before-close），供外部按钮复用 */
  handleClose,
  /** 把拖拽产生的位移清零，回到初始位置 */
  resetPosition,
  /** 走「确认」这条收尾路径：先发 confirm 事件，再过 before-close */
  handleConfirm,
  /** 走「取消」这条收尾路径：过 before-close 后发 cancel 事件，命令式 API 靠它区分取消 */
  handleCancel,
})
</script>

<template>
  <view class="je-dialog" :class="{ 'is-open': modelValue }">
    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view class="je-dialog__scrim" aria-hidden="true" @tap="onScrimClick" @touchmove.stop.prevent />

    <view
      class="je-dialog__panel"
      :class="{
        'je-dialog--fullscreen': fullscreen,
        'je-dialog--top': topAligned,
        'je-dialog--center': center,
        'je-dialog--sheet': bottomSheet,
      }"
      :style="panelStyle"
      role="dialog"
      aria-modal="true"
      :aria-hidden="!modelValue"
    >
      <view
        v-if="title || showClose || $slots.header"
        class="je-dialog__header"
        :class="{ 'je-dialog__header--draggable': draggable, 'is-dragging': dragging }"
        @mousedown="onMouseDown"
        @touchstart="onTouchStart"
        @touchmove.stop="onTouchMove"
        @touchend="endDrag"
        @touchcancel="endDrag"
      >
        <!-- 页头内容，替换后标题文案不再显示（关闭按钮保留） -->
        <slot name="header">
          <text class="je-dialog__title">{{ title }}</text>
        </slot>
        <!-- 关闭按钮上停掉触摸起始，避免从它按下去被当成拖拽（与 H5 侧跳过 button 的判定一致） -->
        <button
          v-if="showClose"
          type="button"
          class="je-dialog__close"
          aria-label="关闭"
          @tap="handleClose"
          @touchstart.stop
        >
          <JeIcon :name="closeIcon" :size="18" />
        </button>
      </view>

      <!-- 默认内容；destroyOnClose 打开时首次展开前不渲染 -->
      <view v-if="bodyVisible" class="je-dialog__body">
        <slot />
      </view>

      <!-- 页脚区域：优先渲染 footer 插槽（老用法），没写插槽时才用内置页脚 -->
      <view v-if="$slots.footer" class="je-dialog__footer">
        <slot name="footer" />
      </view>
      <view
        v-else-if="hasBuiltinFooter"
        class="je-dialog__footer je-dialog__footer--builtin"
        :class="`je-dialog__footer--${footerLayout}`"
      >
        <JeButton
          v-if="showCancel"
          variant="ghost"
          class="je-dialog__action"
          @click="handleCancel"
        >
          {{ cancelText }}
        </JeButton>
        <JeButton class="je-dialog__action" :loading="confirmLoading" @click="handleConfirm">
          {{ confirmButtonText }}
        </JeButton>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-dialog {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 容器常驻 DOM 且铺满视口，收起时必须放行点击，否则会盖死整页 */
  pointer-events: none;
}

.je-dialog.is-open {
  pointer-events: auto;
}

.je-dialog__scrim {
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
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-dialog.is-open .je-dialog__scrim {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-dialog__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: var(--je-dialog-width, 520px);
  max-width: calc(100vw - 32px);
  max-height: 84vh;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--je-border);
  border-radius: var(--je-radius-lg);
  box-shadow: var(--je-shadow-popup);
  /* 收起后必须屏蔽点击，否则过渡期间面板是「隐形可点」的 */
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  visibility: hidden;
  /* 入场与拖拽共用一条 transform，真正用哪条过渡由 --je-dialog-drag-transition 决定 */
  --je-dialog-drag-x: 0px;
  --je-dialog-drag-y: 0px;
  --je-dialog-drag-transition: transform 0.42s var(--je-ease-out-back);
  /* 默认就是「垂直 + 水平居中」，与组件历史行为一致；顶部对齐改由 .je-dialog--top 覆盖 */
  transform: translate(-50%, -50%) translate(var(--je-dialog-drag-x), var(--je-dialog-drag-y))
    translateY(20px) scale(0.94);
  transition: transform 0.3s ease-in, opacity 0.22s ease-in, visibility 0s linear 0.3s;
}

.je-dialog.is-open .je-dialog__panel {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, -50%) translate(var(--je-dialog-drag-x), var(--je-dialog-drag-y))
    translateY(0) scale(1);
  transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out,
    var(--je-dialog-drag-transition);
}

/* 顶部对齐：margin-top 由 top 传入，入场只做垂直位移动画 */
.je-dialog__panel.je-dialog--top {
  top: 0;
  margin-top: var(--je-dialog-top, 15vh);
  transform: translate(-50%, 0) translate(var(--je-dialog-drag-x), var(--je-dialog-drag-y))
    translateY(-24px) scale(0.96);
}

.je-dialog.is-open .je-dialog__panel.je-dialog--top {
  transform: translate(-50%, 0) translate(var(--je-dialog-drag-x), var(--je-dialog-drag-y))
    translateY(0) scale(1);
}

/* 全屏：铺满视口，此时 width / top / draggable 都无意义 */
.je-dialog__panel.je-dialog--fullscreen {
  top: 0;
  left: 0;
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  max-height: 100vh;
  margin: 0;
  border: none;
  border-radius: 0;
  /* 全屏下位移交给内层内容，面板本身只做淡入，避免整屏元素跟着飞 */
  transform: none;
}

.je-dialog.is-open .je-dialog__panel.je-dialog--fullscreen {
  transform: none;
}

.je-dialog--fullscreen {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.je-dialog__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 12px;
}

/* 可拖拽提示：抓手光标 + 禁止选中，否则拖的时候会把标题文字一起选中 */
.je-dialog__header--draggable {
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.je-dialog__header--draggable.is-dragging {
  cursor: grabbing;
}

.je-dialog__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.je-dialog__close {
  display: flex;
  flex-shrink: 0;
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
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  transition: color 0.2s ease, background 0.2s ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-dialog__close::after {
  border: none;
}

.je-dialog__close:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-dialog__close:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-dialog__body {
  flex: 1;
  overflow: auto;
  padding: 4px 22px 22px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--je-text-muted);
  -webkit-overflow-scrolling: touch;
}

.je-dialog__footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 22px 22px;
}

/*
 * 内置页脚：DOM 顺序固定为「取消在左、确认在右」。
 * stacked 用 column-reverse 得到「确认在上、取消在下」——Vant 的移动端形态，
 * 主操作靠近拇指；因为按钮本身 44px 高，不用再额外补触控热区。
 */
.je-dialog__footer--builtin {
  align-items: center;
}

/* 横排：按钮不等宽，整体右对齐（页脚基础样式已是 flex-end，这里只补最小宽度） */
.je-dialog__footer--inline .je-dialog__action,
.je-dialog__footer--auto .je-dialog__action {
  flex: 0 0 auto;
  min-width: 96px;
}

.je-dialog__footer--stacked {
  flex-direction: column-reverse;
  align-items: stretch;
  gap: 10px;
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--je-border-color) 70%, transparent);
}

.je-dialog__footer--stacked .je-dialog__action {
  width: 100%;
  min-height: 44px;
}

/* center：只把页头文字与页脚按钮推到中间，面板位置不变 */
.je-dialog--center .je-dialog__header {
  flex-direction: column;
  gap: 6px;
  text-align: center;
}

.je-dialog--center .je-dialog__footer {
  justify-content: center;
}

/*
 * 窄屏：默认保持「垂直 + 水平居中的卡片」，与 Element Plus / Vant 的对话框一致
 * （基础样式里的 max-width: calc(100vw - 32px) 已经把宽度收好了）。
 * 贴底形态改成显式开关 .je-dialog--sheet，不再无条件贴底。
 *
 * footerLayout 的 auto 也交给媒体查询，而不是 JS 里读屏宽：两端同一套判定，
 * 小程序端也没有 matchMedia 可用。
 */
@media (max-width: 768px) {
  .je-dialog__panel {
    max-height: 84vh;
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* auto 在窄屏退化成竖排（与 stacked 同构，选择器分开写避免特异性打架） */
  .je-dialog__footer--auto {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 10px;
    margin-top: 4px;
    padding-top: 16px;
    border-top: 1px solid color-mix(in srgb, var(--je-border-color) 70%, transparent);
  }

  .je-dialog__footer--auto .je-dialog__action {
    width: 100%;
    min-height: 44px;
  }

  /* 贴底形态：移动端 action sheet */
  .je-dialog__panel.je-dialog--sheet,
  .je-dialog__panel.je-dialog--sheet.je-dialog--top {
    top: auto;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    max-height: 86vh;
    margin: 0;
    border-bottom: none;
    border-radius: var(--je-radius-lg) var(--je-radius-lg) 0 0;
    transform: translate(-50%, 0) translate(var(--je-dialog-drag-x), var(--je-dialog-drag-y))
      translateY(24px);
  }

  .je-dialog.is-open .je-dialog__panel.je-dialog--sheet,
  .je-dialog.is-open .je-dialog__panel.je-dialog--sheet.je-dialog--top {
    transform: translate(-50%, 0) translate(var(--je-dialog-drag-x), var(--je-dialog-drag-y))
      translateY(0);
  }

  .je-dialog__header {
    padding-top: 22px;
  }

  /* 触控热区兜到 44px */
  .je-dialog__close {
    width: 44px;
    height: 44px;
  }

  /* 内置页脚：窄屏下无论哪种布局都把按钮热区兜到 44px */
  .je-dialog__footer--builtin .je-dialog__action {
    min-height: 44px;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 注意必须把 .is-open / --top / --fullscreen 这些「状态类」也列进来：
 * 它们的选择器特异性比单个 .je-dialog__panel 高，只写基础类的话
 * 状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-dialog__scrim,
  .je-dialog.is-open .je-dialog__scrim,
  .je-dialog__panel,
  .je-dialog.is-open .je-dialog__panel,
  .je-dialog__panel.je-dialog--top,
  .je-dialog.is-open .je-dialog__panel.je-dialog--top,
  .je-dialog__panel.je-dialog--fullscreen,
  .je-dialog.is-open .je-dialog__panel.je-dialog--fullscreen,
  .je-dialog__panel.je-dialog--sheet,
  .je-dialog.is-open .je-dialog__panel.je-dialog--sheet {
    transition: none;
  }
}
</style>
