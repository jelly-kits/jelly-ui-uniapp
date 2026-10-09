import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { JeIconName } from '../je-icon/icons'

/*
 * uni 端与主库的差异（都是小程序端跑不了的能力，逐条列出）：
 * - 主库本组件并没有使用 <Teleport> / teleportTo，面板本就随菜单就地渲染，
 *   所以这里也不存在可去掉的传送目标，面板照样留在原位（不做传送）。
 * - 面板落位沿用主库的 direction（down / up）+ CSS 类实现，不引入 useFloating 的
 *   定位与碰撞检测 / 翻转：小程序端没有可靠的浮层尺寸测量，翻转反而会算错。
 * - 「点菜单之外收起」在 H5 走 document 的 pointerdown；窄屏 / 小程序端没有 document，
 *   改成一层全屏透明遮罩接点击（见组件里的 .je-dropdown-menu__scrim）。
 * - 父子的展开状态仍由 provide / inject 协调，与主库完全一致：
 *   父级不测量子节点 DOM，子项各自 onMounted 注册下标，因此无需为小程序端重构。
 */

/** 下拉项的值 */
export type JeDropdownValue = string | number

/** 单个选项 */
export interface JeDropdownOption {
  /** 选项文案 */
  text: string
  /** 选项值，必填且唯一 */
  value: JeDropdownValue
  /** 选中后回填到标题栏的文字，未提供时沿用标题栏自身文案 */
  title?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 选项前的图标 */
  icon?: JeIconName
  /** 选项右侧的灰色补充说明 */
  tip?: string
}

/** JeDropdownMenu 下发给子项的上下文 */
export interface JeDropdownMenuContext {
  /** 当前展开项下标，-1 表示全部收起 */
  activeIndex: Ref<number>
  /** 切换第 index 项 */
  toggle: (index: number) => void
  /** 收起全部 */
  close: () => void
  /** 面板展开方向 */
  direction: ComputedRef<'down' | 'up'>
  /** 选中 / 展开态文字颜色 */
  activeColor: ComputedRef<string>
  /** 未选中态文字颜色 */
  inactiveColor: ComputedRef<string>
  /** 展开 / 收起过渡时长（毫秒） */
  duration: ComputedRef<number>
  /** 点击选项后是否自动收起 */
  closeOnClickOption: ComputedRef<boolean>
  /** 展开时重新取一次浮层层级 */
  refreshZIndex: () => number
  /** 子项注册自己，返回当前下标 */
  register: (key: symbol) => number
  /** 注销子项 */
  unregister: (key: symbol) => void
  /** 由 key 反查当前下标 */
  indexOf: (key: symbol) => number
}

export const jeDropdownMenuKey: InjectionKey<JeDropdownMenuContext> = Symbol('jeDropdownMenu')
