import type { InjectionKey } from 'vue'

/** 单元格分组下发给子项的上下文 */
export interface JeCellGroupContext {
  /** 子项挂载时按顺序登记自己 */
  register: (uid: number) => void
  /** 子项卸载时注销 */
  unregister: (uid: number) => void
  /** 是否为组内最后一项，用来去掉悬空的分隔线 */
  isLast: (uid: number) => boolean
}

/**
 * 小程序端样式隔离，父组件 wxss 里的 `.je-cell-group__body > .je-cell:last-child::after`
 * 匹配不到子组件内部的节点，末项的分隔线只能由子项自己判断并隐藏。
 */
export const jeCellGroupKey: InjectionKey<JeCellGroupContext> = Symbol('jeCellGroup')
