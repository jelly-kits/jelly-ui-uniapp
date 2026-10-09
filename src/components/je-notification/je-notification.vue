<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import { jeNotificationQueue, markNotificationHost, removeNotification } from './store'
import type { JeNotificationItem, JeNotificationPosition } from './types'

/**
 * 命令式 showNotify() 的宿主。
 *
 * 小程序端没有 document / createApp，没法像主库那样现场造容器挂到 body 上，
 * 于是改成「showNotify() 往全局队列里压记录 + 页面里挂 <je-notification /> 读队列渲染」。
 * H5 端同样走这套，保证两端行为一致。页面只需挂一次，队列为空时不渲染任何条目。
 */
defineOptions({ name: 'JeNotification' })

/** 浮层层级：有新通知出现时重新取一个，保证压得住页面固定头栏 */
const zIndex = ref(nextZIndex())

/** 窄屏把所有方位统一收敛到顶部通栏。小程序端没有 window，恒按窄屏处理；H5 挂载时按视口宽判一次 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

const positions: JeNotificationPosition[] = [
  'top-right',
  'top-left',
  'bottom-right',
  'bottom-left',
]

interface NotificationGroup {
  position: JeNotificationPosition
  items: JeNotificationItem[]
}

/** 按方位分组：宽屏四角各一组，窄屏合并成顶部一组 */
const groups = computed<NotificationGroup[]>(() => {
  if (isMobile.value) {
    return [{ position: 'top-right', items: jeNotificationQueue.value }]
  }
  return positions.map((position) => ({
    position,
    items: jeNotificationQueue.value.filter((item) => item.position === position),
  }))
})

/** 每组的自定位：贴边 + 堆叠方向；从下往上排的组用 column-reverse，让新通知从贴边侧推入 */
const groupStyle = (position: JeNotificationPosition): CSSProperties => {
  const top = 'calc(16px + env(safe-area-inset-top))'
  const bottom = 'calc(16px + env(safe-area-inset-bottom))'

  if (isMobile.value) {
    return { top, left: '12px', right: '12px', width: 'auto', flexDirection: 'column' }
  }

  const isTop = position === 'top-right' || position === 'top-left'
  const isRight = position === 'top-right' || position === 'bottom-right'
  return {
    ...(isTop ? { top } : { bottom }),
    ...(isRight ? { right: '20px' } : { left: '20px' }),
    width: '360px',
    flexDirection: isTop ? 'column' : 'column-reverse',
  }
}

/** 滑出过渡时长，与样式里的 .32s 对齐；等它跑完再把记录移出队列 */
const LEAVE_MS = 340

/**
 * 每条通知的入场 / 出场状态。列表项用 v-for 常驻渲染，显隐只切 `.is-open` 状态类：
 * 先以「缩小」的起始态渲染，隔约一帧再落定，才有滑入过渡；关闭时切回起始态再延迟出队。
 */
const entered = ref<Record<number, boolean>>({})

/** 每条一个定时器：自动关闭 / 入场落定 / 滑出出队 */
const autoTimers = new Map<number, ReturnType<typeof setTimeout>>()
const enterTimers = new Map<number, ReturnType<typeof setTimeout>>()
const leaveTimers = new Map<number, ReturnType<typeof setTimeout>>()

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

const clearLeaveTimer = (id: number) => {
  const timer = leaveTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    leaveTimers.delete(id)
  }
}

/** 组件卸载 / 热更新时清理全部定时器，避免泄漏与对已卸载实例的回调 */
const clearAllTimers = () => {
  autoTimers.forEach((timer) => clearTimeout(timer))
  autoTimers.clear()
  enterTimers.forEach((timer) => clearTimeout(timer))
  enterTimers.clear()
  leaveTimers.forEach((timer) => clearTimeout(timer))
  leaveTimers.clear()
}

/** 先以起始态渲染，隔约一帧再落定（小程序端没有可靠的首帧回调，用 16ms 兜住） */
const scheduleEnter = (item: JeNotificationItem) => {
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

/** duration > 0 时才挂自动关闭；到点走带滑出动画的关闭 */
const armAutoClose = (item: JeNotificationItem) => {
  if ((item.duration ?? 0) <= 0) return
  clearAutoTimer(item.id)
  autoTimers.set(
    item.id,
    setTimeout(() => {
      autoTimers.delete(item.id)
      closeItem(item)
    }, item.duration),
  )
}

/** 关闭：先切回起始态触发滑出，动画结束后再从队列移除 */
const closeItem = (item: JeNotificationItem) => {
  clearAutoTimer(item.id)
  clearEnterTimer(item.id)
  setEntered(item.id, false)
  clearLeaveTimer(item.id)
  leaveTimers.set(
    item.id,
    setTimeout(() => {
      leaveTimers.delete(item.id)
      removeNotification(item.id)
    }, LEAVE_MS),
  )
}

watch(
  jeNotificationQueue,
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
    for (const id of [...leaveTimers.keys()]) if (!liveIds.has(id)) clearLeaveTimer(id)
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
  markNotificationHost(true)
})

onBeforeUnmount(() => {
  markNotificationHost(false)
  clearAllTimers()
})
</script>

<template>
  <view class="je-notification" :style="{ zIndex }">
    <view
      v-for="group in groups"
      :key="group.position"
      class="je-notification__group"
      :style="groupStyle(group.position)"
    >
      <view
        v-for="item in group.items"
        :key="item.id"
        class="je-notification__item"
        :class="{ 'is-open': entered[item.id] }"
      >
        <view class="je-notification__card" :class="`je-notification__card--${item.type}`">
          <view class="je-notification__icon" aria-hidden="true">
            <JeIcon :name="item.type ?? 'info'" :size="20" />
          </view>

          <view class="je-notification__body">
            <text v-if="item.title" class="je-notification__title">{{ item.title }}</text>
            <text class="je-notification__text">{{ item.message }}</text>
          </view>

          <button
            v-if="item.showClose"
            type="button"
            class="je-notification__close"
            aria-label="关闭"
            @tap.stop="closeItem(item)"
          >
            <JeIcon name="close" :size="15" />
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-notification {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 容器铺满视口且常驻 DOM：默认放行点击，只有展开的卡片自己接管 */
  pointer-events: none;
}

.je-notification__group {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: calc(100vw - 24px);
  pointer-events: none;
}

/* 单条通知的过渡层：常驻 DOM，用 .is-open 切滑入 / 滑出 */
.je-notification__item {
  box-sizing: border-box;
  width: 100%;
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  transform: scale(0.94);
  transition: opacity 0.26s ease, transform 0.32s var(--je-ease-out-back);
}

.je-notification__item.is-open {
  pointer-events: auto;
  opacity: 1;
  transform: scale(1);
}

.je-notification__card {
  position: relative;
  box-sizing: border-box;
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 16px;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  /* 小程序端不支持 backdrop-filter，退化成纯半透明底 */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius-lg);
  box-shadow: var(--je-shadow-popup);
}

.je-notification__card--success {
  --je-notification-accent: var(--je-success);
}

.je-notification__card--info {
  --je-notification-accent: var(--je-info);
}

.je-notification__card--warning {
  --je-notification-accent: var(--je-warning);
}

.je-notification__card--error {
  --je-notification-accent: var(--je-danger);
}

.je-notification__icon {
  display: flex;
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--je-notification-accent, var(--je-info));
}

.je-notification__body {
  flex: 1;
  min-width: 0;
}

.je-notification__title {
  display: block;
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}

.je-notification__text {
  display: block;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--je-text-muted);
  word-break: break-word;
}

.je-notification__close {
  display: flex;
  flex-shrink: 0;
  align-self: flex-start;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: -4px -4px 0 0;
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
.je-notification__close::after {
  border: none;
}

.je-notification__close:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-notification__close:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 窄屏：卡片通栏，关闭热区撑到 44px */
@media (max-width: 768px) {
  .je-notification__close {
    width: 44px;
    height: 44px;
    margin: -12px -12px 0 0;
  }
}

/*
 * 减弱动效：瞬切滑入 / 滑出过渡。
 * 必须把状态类 .is-open 一起列进来 —— 它的选择器特异性更高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-notification__item,
  .je-notification__item.is-open {
    transition: none;
  }
}
</style>
