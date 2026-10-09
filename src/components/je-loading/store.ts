import { computed, ref } from 'vue'
import type { JeLoadingInstance, JeLoadingOptions } from './types'

/**
 * 命令式加载遮罩的全局状态。
 *
 * 小程序端没有 document / createApp，主库那套「现场造一个容器挂到 body 上」的命令式实现
 * 跑不起来，所以这里改成状态驱动：showLoading() 只往这个栈里压一条记录，由页面上挂着的
 * `<je-loading />` 读栈渲染。
 *
 * 用栈而不是单个值，是为了让「同时开两个 loading、只关掉其中一个」不会把另一个也关掉；
 * 显示时只取栈顶那条。
 */
interface JeLoadingEntry {
  id: number
  text: string
  fullscreen: boolean
  background: string
}

let seed = 0

/** 生效中的命令式遮罩，后压入的在上 */
export const jeLoadingStack = ref<JeLoadingEntry[]>([])

/** 栈顶那条（当前该显示的那条） */
export const jeLoadingTop = computed(
  () => jeLoadingStack.value[jeLoadingStack.value.length - 1] ?? null,
)

/**
 * 命令式调用：显示加载遮罩，返回 close 用于手动关闭。
 *
 * 小程序端没有 DOM 可以现场挂载，需要页面里挂一个 `<je-loading />` 当宿主；
 * H5 端同样走这套（而不是主库的 createApp + body），保证两端行为一致。
 */
export function showLoading(options: JeLoadingOptions = {}): JeLoadingInstance {
  seed += 1
  const entry: JeLoadingEntry = {
    id: seed,
    text: options.text ?? '',
    fullscreen: options.fullscreen ?? true,
    background: options.background ?? '',
  }
  jeLoadingStack.value = [...jeLoadingStack.value, entry]

  let closed = false
  return {
    close: () => {
      if (closed) return
      closed = true
      jeLoadingStack.value = jeLoadingStack.value.filter((item) => item.id !== entry.id)
    },
  }
}
