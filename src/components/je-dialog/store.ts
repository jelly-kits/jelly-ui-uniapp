import { reactive, ref } from 'vue'
import type {
  JeDialogAction,
  JeDialogApi,
  JeDialogBeforeClose,
  JeDialogFooterLayout,
  JeDialogHandler,
  JeDialogOptions,
} from './types'

/**
 * 命令式对话框的全局状态。
 *
 * 小程序端没有 document / createApp，主库那套「现场造一个容器 + 建一个 app 挂到 body 上」的
 * 命令式实现跑不起来（JeLoading 也是同样的原因改成了状态驱动）。于是 showDialog() 只往这个
 * 列表里压一条记录，由页面里挂着的 `<je-dialog-host />` 读列表渲染。
 *
 * 每条记录自带可见性、动作与 resolve，所以连开多个对话框互不干扰。
 */
export interface JeDialogEntry {
  id: number
  /** 可见性（v-model） */
  visible: boolean
  title: string
  message: string
  width: string | number
  closeOnClickModal: boolean
  bottomSheet: boolean
  fullscreen: boolean
  alignCenter: boolean
  center: boolean
  top: string
  footerLayout: JeDialogFooterLayout
  showCancelButton: boolean
  confirmButtonText: string
  cancelButtonText: string
  beforeClose?: JeDialogBeforeClose
  zIndex?: number
  /** 用户点下的动作；面板真正收起时据此兑现 Promise */
  action?: JeDialogAction
  /** 已经兑现过就不再重复兑现 */
  settled: boolean
  resolve: (action: JeDialogAction) => void
}

let seed = 0

/** 生效中的命令式对话框，后压入的在上（层级由各自的 zIndex 决定） */
export const jeDialogStack = ref<JeDialogEntry[]>([])

/**
 * 命令式调用：显示对话框，返回带 close() 的 Promise。
 *
 * 与主库一致，一律 resolve 成 'confirm' | 'cancel' | 'close'，从不 reject —— 缺了 receiver 的
 * unhandled rejection 是移动端最常见的线上崩溃来源之一。'close' 表示「点遮罩 / 按 Esc /
 * handler.close()」，也就是没有走内置页脚那两个按钮。Promise 在面板确实收起时才兑现，
 * 所以 beforeClose 拦下这次关闭时它继续保持 pending。
 *
 * 小程序端没有 DOM 可以现场挂载，需要页面里挂一个 `<je-dialog-host />` 当宿主；
 * H5 端同样走这套，保证两端行为一致。
 */
function openDialog(options: JeDialogOptions): Promise<JeDialogAction> & JeDialogHandler {
  seed += 1
  let resolveAction: (action: JeDialogAction) => void = () => {}
  const promise = new Promise<JeDialogAction>((resolve) => {
    resolveAction = resolve
  })

  const entry = reactive<JeDialogEntry>({
    id: seed,
    visible: true,
    title: options.title ?? '',
    message: options.message ?? '',
    width: options.width ?? 520,
    closeOnClickModal: options.closeOnClickModal ?? true,
    bottomSheet: options.bottomSheet ?? false,
    fullscreen: options.fullscreen ?? false,
    alignCenter: options.alignCenter ?? true,
    center: options.center ?? false,
    top: options.top ?? '',
    footerLayout: options.footerLayout ?? 'auto',
    showCancelButton: options.showCancelButton ?? false,
    confirmButtonText: options.confirmButtonText ?? '确定',
    cancelButtonText: options.cancelButtonText ?? '取消',
    beforeClose: options.beforeClose,
    zIndex: options.zIndex,
    action: undefined,
    settled: false,
    resolve: resolveAction,
  })

  jeDialogStack.value = [...jeDialogStack.value, entry]

  return Object.assign(promise, {
    close: () => {
      // 等价于点遮罩 / 按 Esc：走组件的 handleClose（含 beforeClose），动画结束后由 closed 收尾
      entry.action = 'close'
      entry.visible = false
    },
  })
}

/** 双键对话框：确认 / 取消都在 */
function confirmDialog(options: JeDialogOptions): Promise<JeDialogAction> {
  return showDialog({
    showCancelButton: true,
    ...options,
    confirmButtonText: options.confirmButtonText ?? '确定',
    cancelButtonText: options.cancelButtonText ?? '取消',
  })
}

/** 单键对话框：只有确认按钮，点确认 resolve 'confirm'，遮罩 / Esc 关掉 resolve 'close' */
function alertDialog(options: JeDialogOptions): Promise<JeDialogAction> {
  return showDialog({
    ...options,
    showCancelButton: false,
    cancelButtonText: undefined,
    confirmButtonText: options.confirmButtonText ?? '知道了',
  })
}

/** 命令式入口：showDialog(...) / showDialog.confirm(...) / showDialog.alert(...) */
export const showDialog: JeDialogApi = Object.assign(openDialog, {
  confirm: confirmDialog,
  alert: alertDialog,
})

/**
 * 面板确实收起后兑现 Promise 并把实例摘掉。
 * 由宿主组件的 closed 事件调用 —— 组件的 confirm / cancel 事件在 beforeClose 之前就发了，
 * 若那时就 resolve，会出现「Promise 已给出 confirm、面板却被 beforeClose 拦下还开着」的矛盾。
 */
export function settleDialogEntry(entry: JeDialogEntry): void {
  if (entry.settled) return
  entry.settled = true
  jeDialogStack.value = jeDialogStack.value.filter((item) => item.id !== entry.id)
  const action = entry.action
  entry.resolve(!action || action === 'close' ? 'close' : action)
}
