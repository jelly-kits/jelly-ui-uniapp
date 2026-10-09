import type { ComputedRef, InjectionKey, Ref } from 'vue'

/**
 * 与主库的差异（都是小程序端跑不了的 DOM / 浮层能力）：
 * - 没有 `teleportTo`：小程序端没有 Teleport，子菜单浮层一律就地渲染在标题旁边，
 *   挂在 `position: relative` 的 `.je-submenu` 上做绝对定位；
 * - 浮层不再经 `useFloating` 计算坐标（主库那样 `left/top` 内联 + `position: fixed`），
 *   改为纯 CSS 落位：横向贴标题下方、折叠态纵向贴标题右侧，**不做碰撞检测与自动翻转**；
 * - 收起浮层不再依赖 `useClickOutside` 的文档级监听：H5 走 `document` 的 pointerdown，
 *   小程序端靠一层透明遮罩接「点外部」。
 */

/** 菜单项 / 子菜单标识 */
export type JeMenuIndex = string | number

/** 子菜单下发给后代的前缀信息，用来拼出 select 事件里的 indexPath */
export interface JeMenuParentContext {
  /** 从根到当前层级的 index 路径 */
  path: ComputedRef<JeMenuIndex[]>
  /** 当前处于浮层内（横向弹出层 / 折叠态弹出层），浮层内不再隐藏文字 */
  popup: ComputedRef<boolean>
  /** 浮层内选中后收起所属浮层 */
  closePopup: () => void
}

/** 子菜单通过它把路径与浮层状态透传给内部项 */
export const jeMenuParentKey: InjectionKey<JeMenuParentContext> = Symbol('jeMenuParent')

/** JeMenu 下发给所有后代的上下文 */
export interface JeMenuContext {
  /** 当前激活项 */
  activeIndex: Readonly<Ref<JeMenuIndex | null>>
  /** 已展开的子菜单 */
  openedMenus: Ref<JeMenuIndex[]>
  /** 是否横向模式 */
  horizontal: ComputedRef<boolean>
  /** 是否折叠（仅纵向模式且 collapse 为真） */
  collapse: ComputedRef<boolean>
  /** 选中某一项 */
  select: (index: JeMenuIndex, indexPath: JeMenuIndex[]) => void
  /** 切换子菜单展开状态 */
  toggleOpen: (index: JeMenuIndex) => void
  /** 展开子菜单 */
  openMenu: (index: JeMenuIndex) => void
  /** 收起子菜单 */
  closeMenu: (index: JeMenuIndex) => void
  /** 子菜单是否已展开 */
  isOpened: (index: JeMenuIndex) => boolean
}

/** 菜单项通过它拿到激活态与交互方法 */
export const jeMenuKey: InjectionKey<JeMenuContext> = Symbol('jeMenu')
