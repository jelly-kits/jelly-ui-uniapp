import type { JeIconName } from '../je-icon/icons'

/** before-close 的收尾函数：调用它才真正关闭；传 true 表示这次是「取消」 */
export type JeDialogDone = (cancel?: boolean) => void

/**
 * before-close 钩子。
 * 适用于提交前校验、二次确认这类「可能拦住关闭」的场景：不调用 done 面板就保持打开。
 */
export type JeDialogBeforeClose = (done: JeDialogDone) => void

/**
 * 内置页脚的布局。
 * inline 横排右对齐；stacked 竖排、按钮铺满并带一条分隔线；auto 交给窄屏媒体查询自动切换。
 */
export type JeDialogFooterLayout = 'inline' | 'stacked' | 'auto'

/**
 * 对话框的最终去向：确认 / 取消 / 被外部关掉（点遮罩、按 Esc、或调 handler.close()）。
 * 命令式 API 一律 resolve 成动作字符串，从不 reject —— 缺了 receiver 的 unhandled rejection
 * 是移动端最常见的线上崩溃来源之一。
 */
export type JeDialogAction = 'confirm' | 'cancel' | 'close'

/**
 * JeDialog 的属性。
 *
 * 与主库的差异（都是小程序端跑不了的 DOM 能力）：没有 `teleportTo` / `appendTo` / `appendToBody`
 * （小程序端没有可用的传送目标）、没有 `trapFocus`（没有可聚焦的 Tab 序列）。
 */
export interface JeDialogProps {
  /** 控制显隐（v-model） */
  modelValue?: boolean
  /** 标题文案；用 header 插槽时它仍作为无障碍名称 */
  title?: string
  /** 数字按 px 处理；窄屏会自动占满可用宽度 */
  width?: string | number
  /** 是否显示右上角关闭按钮 */
  showClose?: boolean
  /** 关闭按钮图标名 */
  closeIcon?: JeIconName
  /** 点击遮罩关闭 */
  closeOnClickModal?: boolean
  /** 按 Esc 关闭（仅 H5 有键盘事件） */
  closeOnPressEscape?: boolean
  /** closeOnEscape 的同义项（closeOnPressEscape 优先），保留是为了不破坏老代码 */
  closeOnEscape?: boolean
  /**
   * 关闭前的钩子：拿到 done 后自己决定何时放行。
   * 「点关闭按钮 / 点遮罩 / 按 Esc」以及「点内置页脚的确认 / 取消按钮」都会走它；
   * 页脚用 #footer 插槽自绘按钮时不经过这里，请在按钮自己的事件里处理
   */
  beforeClose?: JeDialogBeforeClose
  /** 确认按钮文案；传入即渲染内置页脚（默认不传，页脚仍由 #footer 插槽负责） */
  confirmButtonText?: string
  /** 取消按钮文案；传入即在内置页脚里显示取消按钮 */
  cancelButtonText?: string
  /** 显示内置页脚的取消按钮（未传 cancelButtonText 时用默认文案「取消」；二者满足其一即显示） */
  showCancelButton?: boolean
  /** 内置页脚的布局，默认 auto（窄屏竖排、宽屏横排）；使用 #footer 插槽时该属性不生效 */
  footerLayout?: JeDialogFooterLayout
  /** 关闭后销毁默认插槽内容（减少关闭态下的渲染开销） */
  destroyOnClose?: boolean
  /** 允许拖拽标题栏移动面板 */
  draggable?: boolean
  /** 占满整个视口，忽略 width / top / draggable */
  fullscreen?: boolean
  /** 内容整体居中（面板水平垂直居中，同时页头页脚文字居中） */
  alignCenter?: boolean
  /** 仅页头文字与页脚按钮水平居中，面板位置不变 */
  center?: boolean
  /** 面板与视口顶部的距离（如 15vh），传入即改为顶部对齐排版 */
  top?: string
  /**
   * 窄屏（≤768px）改成贴底弹出层（移动端 action sheet 形态）。
   * 默认 false：移动端与 Element Plus / Vant 的对话框一致，仍是一张垂直居中的卡片。
   */
  bottomSheet?: boolean
  /** 打开时锁定页面滚动（H5 锁 body；小程序端由遮罩层的 catchtouchmove 兜住） */
  lockScroll?: boolean
  /** 面板层级，不传则按打开顺序自动递增 */
  zIndex?: number
}

/** showDialog() 返回的句柄 */
export interface JeDialogHandler {
  /** 手动关闭，等价于点遮罩 / 按 Esc；会走一遍关闭动画再销毁 */
  close: () => void
}

/**
 * 命令式调用参数：复用组件 props（modelValue 由 API 自己掌管），再补上正文。
 *
 * 小程序端没有 VNode 可插进别的组件树，`message` 只支持字符串；
 * 需要更复杂的结构请直接用组件式写法配默认插槽。
 */
export interface JeDialogOptions extends Omit<JeDialogProps, 'modelValue'> {
  /** 正文内容 */
  message?: string
}

/** showDialog 的完整签名（含 confirm / alert 快捷方法） */
export interface JeDialogApi {
  (options: JeDialogOptions): Promise<JeDialogAction> & JeDialogHandler
  confirm(options: JeDialogOptions): Promise<JeDialogAction>
  /** 只有确认按钮的单键对话框 */
  alert(options: JeDialogOptions): Promise<JeDialogAction>
}
