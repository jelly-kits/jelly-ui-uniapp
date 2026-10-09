export type JeMessageType = 'success' | 'info' | 'warning' | 'error'

/** 命令式调用参数 */
export interface JeMessageOptions {
  type?: JeMessageType
  message?: string
  /** 自动关闭延迟（毫秒），0 表示不自动关闭 */
  duration?: number
  showClose?: boolean
  /** 距视口顶部的偏移（px） */
  offset?: number
  /** 消息关闭后回调 */
  onClose?: () => void
}

/** 队列里的一条消息 */
export interface JeMessageItem extends JeMessageOptions {
  id: number
}

/** 命令式调用返回的实例句柄 */
export interface JeMessageInstance {
  close: () => void
}

/** showMessage 函数的完整签名（含快捷方法） */
export interface JeMessageApi {
  (options: JeMessageOptions): JeMessageInstance
  success(message: string, duration?: number): JeMessageInstance
  info(message: string, duration?: number): JeMessageInstance
  warning(message: string, duration?: number): JeMessageInstance
  error(message: string, duration?: number): JeMessageInstance
}
