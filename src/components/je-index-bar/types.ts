import type { ComputedRef, InjectionKey, Ref } from 'vue'

/** 索引栏下的一个锚点 */
export interface JeIndexAnchorItem {
  index: string | number
  /** 返回锚点根元素，用于测量滚动位置（H5） */
  getEl: () => HTMLElement | null
  /**
   * 小程序端跨组件查不到锚点节点，改由锚点自己量出「页面绝对位置」后回报；
   * H5 端不传，位置直接读 getEl()。
   */
  measureTop?: (pageScrollTop: number, report: (top: number) => void) => void
}

/** 索引栏下发给锚点的上下文 */
export interface JeIndexBarContext {
  /** 当前高亮的索引 */
  active: Ref<string | number | ''>
  /** 是否开启吸顶 */
  sticky: ComputedRef<boolean>
  /** 吸顶偏移量 */
  stickyOffsetTop: ComputedRef<number>
  /** 注册锚点 */
  register: (item: JeIndexAnchorItem) => void
  /** 注销锚点 */
  unregister: (index: string | number) => void
  /** 选中某个索引：高亮并滚动过去 */
  select: (index: string | number) => void
}

/** 索引锚点通过它拿到父级索引栏 */
export const jeIndexBarKey: InjectionKey<JeIndexBarContext> = Symbol('jeIndexBar')