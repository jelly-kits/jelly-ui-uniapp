import { ref } from 'vue'
import type {
  JeMessageApi,
  JeMessageInstance,
  JeMessageItem,
  JeMessageOptions,
} from './types'

/**
 * 命令式轻提示的全局状态。
 *
 * 小程序端没有 document / createApp，主库那套「现场造一个容器挂到 body 上」的命令式实现
 * 跑不起来（JeLoading / JeDialog 也是同样的原因改成了状态驱动）。于是 showMessage() 只往
 * 这个队列里压一条记录，由页面里挂着的 `<je-message />` 当宿主读队列渲染。
 *
 * 队列里的每条消息只存数据；入场动画与自动关闭定时器都交给宿主组件负责，
 * 这样定时器能随宿主的卸载 / 热更新一起被清理。
 */
export const jeMessageQueue = ref<JeMessageItem[]>([])

let seed = 0

/**
 * 宿主挂载计数。小程序端没有 DOM 不能现场挂载，命令式提示必须有页面里显式挂的
 * `<je-message />` 才渲染得出来；宿主没挂时命令式调用无处落地，这里只告警 + 静默忽略，
 * 不抛异常，避免把业务逻辑打断。用计数而非布尔是为了容忍 HMR 期间新旧宿主短暂共存。
 */
let hostCount = 0

/** 宿主组件在 onMounted / onBeforeUnmount 里调用 */
export function markMessageHost(mounted: boolean): void {
  hostCount = Math.max(0, hostCount + (mounted ? 1 : -1))
}

/** 当前是否有宿主在监听队列 */
export function isMessageHostMounted(): boolean {
  return hostCount > 0
}

/** 从队列移除一条消息，并在真正消失后触发用户回调 */
export function removeMessage(id: number): void {
  const queue = jeMessageQueue.value
  const index = queue.findIndex((item) => item.id === id)
  if (index < 0) return
  const removed = queue[index]
  jeMessageQueue.value = queue.filter((item) => item.id !== id)
  removed?.onClose?.()
}

/**
 * 命令式调用：显示一条轻提示，返回 close 用于手动关闭。
 *
 * 小程序端没有 DOM 可以现场挂载，需要页面模板里挂一个 `<je-message />` 当宿主；
 * H5 端同样走这套（而不是主库的 createApp + body），保证两端行为一致。
 */
function createMessage(options: JeMessageOptions): JeMessageInstance {
  if (!isMessageHostMounted()) {
    console.warn(
      '[JeMessage] 未找到宿主组件：请在页面模板里挂一个 <je-message />（小程序端没有 DOM 可现场挂载）。本次调用已忽略。',
    )
    return { close: () => {} }
  }

  seed += 1
  const item: JeMessageItem = {
    id: seed,
    type: options.type ?? 'info',
    message: options.message ?? '',
    duration: options.duration ?? 3000,
    showClose: options.showClose ?? false,
    offset: options.offset ?? 20,
    onClose: options.onClose,
  }
  jeMessageQueue.value = [...jeMessageQueue.value, item]
  return { close: () => removeMessage(item.id) }
}

const showMessage = createMessage as JeMessageApi

showMessage.success = (message, duration) => createMessage({ type: 'success', message, duration })
showMessage.info = (message, duration) => createMessage({ type: 'info', message, duration })
showMessage.warning = (message, duration) => createMessage({ type: 'warning', message, duration })
showMessage.error = (message, duration) => createMessage({ type: 'error', message, duration })

export { showMessage }
