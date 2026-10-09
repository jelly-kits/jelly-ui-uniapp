import { ref } from 'vue'
import type {
  JeNotificationInstance,
  JeNotificationItem,
  JeNotificationOptions,
  JeNotifyApi,
} from './types'

/**
 * 命令式全局通知的全局状态。
 *
 * 小程序端没有 document / createApp，主库那套「现场造一个容器挂到 body 上」的命令式实现
 * 跑不起来（JeLoading / JeDialog / JeMessage 也是同样的原因改成了状态驱动）。于是 showNotify()
 * 只往这个队列里压一条记录，由页面里挂着的 `<je-notification />` 当宿主读队列渲染。
 *
 * 队列里每条通知只存数据；入场 / 滑出动画与自动关闭定时器都交给宿主组件负责，
 * 这样定时器能随宿主的卸载 / 热更新一起被清理。
 */
export const jeNotificationQueue = ref<JeNotificationItem[]>([])

let seed = 0

/**
 * 宿主挂载计数。小程序端没有 DOM 不能现场挂载，命令式通知必须有页面里显式挂的
 * `<je-notification />` 才渲染得出来；宿主没挂时命令式调用无处落地，这里只告警 + 静默忽略，
 * 不抛异常，避免把业务逻辑打断。用计数而非布尔是为了容忍 HMR 期间新旧宿主短暂共存。
 */
let hostCount = 0

/** 宿主组件在 onMounted / onBeforeUnmount 里调用 */
export function markNotificationHost(mounted: boolean): void {
  hostCount = Math.max(0, hostCount + (mounted ? 1 : -1))
}

/** 当前是否有宿主在监听队列 */
export function isNotificationHostMounted(): boolean {
  return hostCount > 0
}

/** 从队列移除一条通知，并在真正消失后触发用户回调 */
export function removeNotification(id: number): void {
  const queue = jeNotificationQueue.value
  const index = queue.findIndex((item) => item.id === id)
  if (index < 0) return
  const removed = queue[index]
  jeNotificationQueue.value = queue.filter((item) => item.id !== id)
  removed?.onClose?.()
}

/**
 * 命令式调用：显示一条通知，返回 close 用于手动关闭。
 *
 * 小程序端没有 DOM 可以现场挂载，需要页面模板里挂一个 `<je-notification />` 当宿主；
 * H5 端同样走这套（而不是主库的 createApp + body），保证两端行为一致。
 */
function createNotify(options: JeNotificationOptions): JeNotificationInstance {
  if (!isNotificationHostMounted()) {
    console.warn(
      '[JeNotification] 未找到宿主组件：请在页面模板里挂一个 <je-notification />（小程序端没有 DOM 可现场挂载）。本次调用已忽略。',
    )
    return { close: () => {} }
  }

  seed += 1
  const item: JeNotificationItem = {
    id: seed,
    type: options.type ?? 'info',
    title: options.title ?? '',
    message: options.message ?? '',
    duration: options.duration ?? 4500,
    position: options.position ?? 'top-right',
    showClose: options.showClose ?? true,
    onClose: options.onClose,
  }
  jeNotificationQueue.value = [...jeNotificationQueue.value, item]
  return { close: () => removeNotification(item.id) }
}

const showNotify = createNotify as JeNotifyApi

showNotify.success = (options) => createNotify({ ...options, type: 'success' })
showNotify.info = (options) => createNotify({ ...options, type: 'info' })
showNotify.warning = (options) => createNotify({ ...options, type: 'warning' })
showNotify.error = (options) => createNotify({ ...options, type: 'error' })

export { showNotify }
