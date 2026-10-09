import type { InjectionKey, VNodeChild } from 'vue'

/** tab 标识 */
export type JeTabName = string | number
/** 外观类型 */
export type JeTabsType = 'line' | 'card' | 'border-card'
/** tab 条位置 */
export type JeTabsPosition = 'top' | 'bottom' | 'left' | 'right'

/** 子项注册给父级的面板信息 */
export interface JeTabPaneState {
  /** 唯一 id，用于生成 tab / panel 的 DOM id */
  uid: string
  name: JeTabName
  label: string
  disabled: boolean
  closable: boolean
  /**
   * 自定义 label 插槽，父级渲染标题时调用。
   *
   * 与主库的差异：只有 H5 会填这个字段。小程序端 `$slots` 是「有没有这个插槽」的布尔标记
   * 而不是渲染函数，且子组件的插槽无法在父级模板里渲染（tab 标题长得在父级上），
   * 所以小程序端 `#label` 插槽不生效，标题退回 `label` 属性。
   */
  labelRender?: () => VNodeChild
}

/** 父级下发给子项的上下文 */
export interface JeTabsContext {
  /** 注册面板（父级据此维护 pane 顺序） */
  registerPane: (uid: string, getState: () => JeTabPaneState) => void
  /** 注销面板 */
  unregisterPane: (uid: string) => void
  /** 该 name 是否为当前激活项 */
  isActive: (name: JeTabName) => boolean
}

/** 子项通过它拿到父级的激活状态与操作方法 */
export const jeTabsKey: InjectionKey<JeTabsContext> = Symbol('jeTabs')
