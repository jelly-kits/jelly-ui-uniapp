import type { InjectionKey } from 'vue'

/** 面板标识，string 或 number */
export type JeCollapseName = string | number

/** 父级下发给子项的上下文 */
export interface JeCollapseContext {
  /** 该 name 是否处于展开状态 */
  isActive: (name: JeCollapseName) => boolean
  /** 切换某一项的展开状态 */
  toggle: (name: JeCollapseName) => void
}

/** 子项通过它拿到父级的展开状态与切换方法 */
export const jeCollapseKey: InjectionKey<JeCollapseContext> = Symbol('jeCollapse')
