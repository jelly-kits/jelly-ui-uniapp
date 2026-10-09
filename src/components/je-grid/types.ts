import type { InjectionKey } from 'vue'

/** 宫格下发给子项的布局约定 */
export interface JeGridContext {
  /** 单元格是否强制正方形 */
  getSquare: () => boolean
  /**
   * 是否画格子之间的分隔线。
   * 小程序端样式隔离，父组件 wxss 里的 `.je-grid.has-border > .je-grid__item`
   * 匹配不到子组件内部的节点，边框只能由子项自己画。
   */
  getBorder: () => boolean
}

/** 宫格子项通过它拿到父级的布局约定 */
export const jeGridKey: InjectionKey<JeGridContext> = Symbol('jeGrid')
