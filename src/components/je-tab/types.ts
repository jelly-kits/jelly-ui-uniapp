import type { ComputedRef, InjectionKey } from 'vue'

/** 标签名 */
export type JeTabName = string | number

/**
 * 子项注册给父级的标题信息。
 *
 * 与主库的差异：主库把标题按钮直接 Teleport 进父级的标题容器；小程序端不支持 Teleport，
 * 改由父级按注册顺序统一渲染标题，子项只提供数据（标题、角标、禁用态）。
 */
export interface JeTabItemState {
  /** 唯一 id，用于生成标题按钮的 DOM id（下划线定位要用） */
  uid: string
  name: JeTabName
  title: string
  disabled: boolean
  badge?: string | number
  dot: boolean
}

/** 父级下发给子项的上下文 */
export interface JeTabContext {
  /** 当前激活的标签名 */
  activeName: ComputedRef<JeTabName | undefined>
  /** 子项未声明 name 时，用它生成一个自增的兜底 name */
  genName: () => number
  /** 子项挂载时注册自己 */
  register: (uid: string, getState: () => JeTabItemState) => void
  /** 子项卸载时注销自己 */
  unregister: (uid: string) => void
  /** 激活某个标签（下标由父级按注册顺序反查） */
  activate: (name: JeTabName) => void
  /** 是否为当前激活项 */
  isActive: (name: JeTabName) => boolean
  /** 由 name 反查注册顺序下标 */
  getIndex: (name: JeTabName) => number
  /** 激活态颜色 */
  activeColor: ComputedRef<string>
  /** 未激活态颜色 */
  inactiveColor: ComputedRef<string>
  /** 标题放不下时省略并平分宽度 */
  ellipsis: ComputedRef<boolean>
}

/** 子项通过它拿到父级的激活状态与操作方法 */
export const jeTabKey: InjectionKey<JeTabContext> = Symbol('jeTab')
