export type JeNotificationType = 'success' | 'info' | 'warning' | 'error'

/** 通知弹出方位：宽屏四角，窄屏统一收敛到顶部通栏 */
export type JeNotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

/** 命令式调用参数 */
export interface JeNotificationOptions {
  /** 标题文案 */
  title?: string
  /** 正文文案；小程序端没有 VNode，命令式只支持字符串 */
  message?: string
  /** 语义类型，缺省 info */
  type?: JeNotificationType
  /** 自动关闭延迟（毫秒），0 表示不自动关闭 */
  duration?: number
  /** 弹出方位，缺省右上角 */
  position?: JeNotificationPosition
  /** 是否显示右上角关闭按钮 */
  showClose?: boolean
  /** 通知关闭后回调 */
  onClose?: () => void
}

/** 队列里的一条通知 */
export interface JeNotificationItem extends JeNotificationOptions {
  id: number
}

/** 命令式调用返回的实例句柄 */
export interface JeNotificationInstance {
  /** 手动关闭 */
  close: () => void
}

/** showNotify 函数的完整签名（含快捷方法） */
export interface JeNotifyApi {
  (options: JeNotificationOptions): JeNotificationInstance
  success(options: JeNotificationOptions): JeNotificationInstance
  info(options: JeNotificationOptions): JeNotificationInstance
  warning(options: JeNotificationOptions): JeNotificationInstance
  error(options: JeNotificationOptions): JeNotificationInstance
}
