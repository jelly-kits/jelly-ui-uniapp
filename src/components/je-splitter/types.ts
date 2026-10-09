import type { InjectionKey, Ref } from 'vue'

/** 分栏方向：horizontal 左右分栏，vertical 上下分栏 */
export type JeSplitterLayout = 'horizontal' | 'vertical'

/** 面板注册时提供的配置读取器（保持响应式） */
export interface JeSplitterPanelState {
  /** 初始尺寸，按百分比处理 */
  size?: number | string
  min: number
  max: number
  collapsible: boolean
  resizable: boolean
}

export type JeSplitterPanelProvider = () => JeSplitterPanelState

/** JeSplitter 下发给 JeSplitterPanel 的上下文 */
export interface JeSplitterContext {
  layout: Ref<JeSplitterLayout>
  /** 各面板当前尺寸（百分比），面板据此计算 flex-basis */
  sizes: Ref<number[]>
  /** 已注册的面板数量 */
  count: Ref<number>
  /** 正在拖拽的分割条下标，-1 表示空闲 */
  activeIndex: Ref<number>
  registerPanel: (provider: JeSplitterPanelProvider) => number
  unregisterPanel: (index: number) => void
  /**
   * 分割条按下。事件在 H5 是指针事件、小程序端是触摸事件，两端各自从事件里取坐标，
   * 所以这里收成 unknown，具体解析由 JeSplitter 内部按条件编译完成。
   */
  onBarPointerDown: (index: number, event: unknown) => void
  onBarPointerMove: (event: unknown) => void
  onBarPointerUp: (event: unknown) => void
  /** 键盘微调（仅 H5） */
  nudge: (index: number, delta: number) => void
}

export const jeSplitterKey: InjectionKey<JeSplitterContext> = Symbol('jeSplitter')
