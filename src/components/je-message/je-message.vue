<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import { jeMessageQueue, markMessageHost, removeMessage } from './store'
import type { JeMessageItem } from './types'

/**
 * 命令式 showMessage() 的宿主。
 *
 * 小程序端没有 document / createApp，没法像主库那样现场造容器挂到 body 上，
 * 于是改成「showMessage() 往全局队列里压记录 + 页面里挂 <je-message /> 读队列渲染」。
 * H5 端同样走这套，保证两端行为一致。页面只需挂一次，队列为空时不渲染任何条目。
 */
defineOptions({ name: 'JeMessage' })

/** 浮层层级：有消息出现时重新取一个，保证压得住页面固定头栏 */
const zIndex = ref(nextZIndex())

/** 宿主容器：固定在视口顶部居中，纵向堆叠所有消息；顶部偏移取第一条消息的 offset */
const hostStyle = computed(() => ({
  zIndex: zIndex.value,
  paddingTop: `calc(${jeMessageQueue.value[0]?.offset ?? 20}px + env(safe-area-inset-top))`,
}))

/**
 * 每条消息的入场状态。列表项用 v-for 常驻渲染，显隐只切 `.is-open` 状态类，
 * 所以先以「上移 + 缩小」的起始态渲染，隔约一帧再落定，才有顶部滑入的过渡。
 */
const entered = ref<Record<number, boolean>>({})

/** 自动关闭定时器（每条一个） */
const autoTimers = new Map<number, ReturnType<typeof setTimeout>>()
/** 入场定时器（每条一个） */
const enterTimers = new Map<number, ReturnType<typeof setTimeout>>()

const setEntered = (id: number, value: boolean) => {
  const next: Record<number, boolean> = { ...entered.value }
  next[id] = value
  entered.value = next
}

const deleteEntered = (id: number) => {
  const next: Record<number, boolean> = {}
  for (const key of Object.keys(entered.value)) {
    const numeric = Number(key)
    if (numeric !== id) next[numeric] = entered.value[numeric]
  }
  entered.value = next
}

const clearAutoTimer = (id: number) => {
  const timer = autoTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    autoTimers.delete(id)
  }
}

const clearEnterTimer = (id: number) => {
  const timer = enterTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    enterTimers.delete(id)
  }
}

/** 组件卸载 / 热更新时清理全部定时器，避免泄漏与对已卸载实例的回调 */
const clearAllTimers = () => {
  autoTimers.forEach((timer) => clearTimeout(timer))
  autoTimers.clear()
  enterTimers.forEach((timer) => clearTimeout(timer))
  enterTimers.clear()
}

/** 先以起始态渲染，隔约一帧再落定（小程序端没有可靠的首帧回调，用 16ms 兜住） */
const scheduleEnter = (item: JeMessageItem) => {
  setEntered(item.id, false)
  clearEnterTimer(item.id)
  enterTimers.set(
    item.id,
    setTimeout(() => {
      enterTimers.delete(item.id)
      setEntered(item.id, true)
    }, 16),
  )
}

/** duration > 0 时才挂自动关闭；到点从队列移除，由 watch 收敛剩下的清理 */
const armAutoClose = (item: JeMessageItem) => {
  if ((item.duration ?? 0) <= 0) return
  clearAutoTimer(item.id)
  autoTimers.set(
    item.id,
    setTimeout(() => {
      autoTimers.delete(item.id)
      removeMessage(item.id)
    }, item.duration),
  )
}

/** 手动关闭：先清掉自己的定时器，再从队列移除 */
const closeItem = (item: JeMessageItem) => {
  clearAutoTimer(item.id)
  clearEnterTimer(item.id)
  removeMessage(item.id)
}

watch(
  jeMessageQueue,
  (list) => {
    let added = false
    for (const item of list) {
      if (!(item.id in entered.value)) {
        added = true
        scheduleEnter(item)
        armAutoClose(item)
      }
    }

    // 已出队的条目：清掉它的定时器与入场状态，避免 Map / 记录越攒越多
    const liveIds = new Set(list.map((item) => item.id))
    for (const id of [...autoTimers.keys()]) if (!liveIds.has(id)) clearAutoTimer(id)
    for (const id of [...enterTimers.keys()]) if (!liveIds.has(id)) clearEnterTimer(id)
    for (const key of Object.keys(entered.value)) {
      const id = Number(key)
      if (!liveIds.has(id)) deleteEntered(id)
    }

    if (added) zIndex.value = nextZIndex()
  },
  { immediate: true },
)

// 挂载 / 卸载时登记宿主，命令式 API 靠它判断有没有可渲染的落点
onMounted(() => {
  markMessageHost(true)
})

onBeforeUnmount(() => {
  markMessageHost(false)
  clearAllTimers()
})
</script>

<template>
  <view class="je-message-host" :style="hostStyle">
    <view
      v-for="item in jeMessageQueue"
      :key="item.id"
      class="je-message__layer"
      :class="{ 'is-open': entered[item.id] }"
    >
      <view class="je-message" :class="`je-message--${item.type}`" role="alert" aria-live="assertive">
        <JeIcon class="je-message__icon" :name="item.type ?? 'info'" :size="18" />
        <text class="je-message__text">{{ item.message }}</text>
        <button
          v-if="item.showClose"
          type="button"
          class="je-message__close"
          aria-label="关闭"
          @tap.stop="closeItem(item)"
        >
          <JeIcon name="close" :size="14" />
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 顶层容器铺满视口顶端：宽度自适应但留出左右 16px，纵向堆叠，本身不吃点击 */
.je-message-host {
  position: fixed;
  top: 0;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  gap: 12px;
  width: 380px;
  max-width: calc(100vw - 32px);
  transform: translateX(-50%);
  pointer-events: none;
}

/* 单个条目的包裹层：入场靠 .is-open 切 transform / opacity，不用 v-if / display */
.je-message__layer {
  box-sizing: border-box;
  width: 100%;
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  transform: translateY(-16px) scale(0.94);
  transition: opacity 0.26s ease, transform 0.34s var(--je-ease-out-back);
}

.je-message__layer.is-open {
  pointer-events: auto;
  opacity: 1;
  transform: translateY(0) scale(1);
}

.je-message {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--je-text);
  background: var(--je-popup);
  /* 小程序端不支持 backdrop-filter，退化成纯半透明底 */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
}

/* 语义色左色条：颜色取类型变体注入的局部变量，不新增全局 token */
.je-message::before {
  content: '';
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  width: 3px;
  background: var(--je-message-accent, var(--je-info));
  border-radius: var(--je-radius) 0 0 var(--je-radius);
}

.je-message--success {
  --je-message-accent: var(--je-success);
}

.je-message--info {
  --je-message-accent: var(--je-info);
}

.je-message--warning {
  --je-message-accent: var(--je-warning);
}

.je-message--error {
  --je-message-accent: var(--je-danger);
}

.je-message__icon {
  flex-shrink: 0;
  color: var(--je-message-accent, var(--je-info));
}

.je-message__text {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.je-message__close {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0 -4px 0 0;
  padding: 0;
  line-height: 1;
  color: var(--je-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  transition: color 0.2s ease, background 0.2s ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-message__close::after {
  border: none;
}

.je-message__close:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-message__close:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 窄屏：通栏显示，关闭热区撑到 44px */
@media (max-width: 768px) {
  .je-message__close {
    width: 44px;
    height: 44px;
    margin: -10px -10px -10px 0;
  }
}

/*
 * 减弱动效：瞬切入场过渡。
 * 必须把状态类 .is-open 一起列进来 —— 它的选择器特异性更高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-message__layer,
  .je-message__layer.is-open {
    transition: none;
  }
}
</style>
