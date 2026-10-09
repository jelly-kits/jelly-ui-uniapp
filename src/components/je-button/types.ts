import type { InjectionKey } from 'vue'

/** 按钮语义类型，与 JeText / JeToast 的语义色一一对应 */
export type JeButtonType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** 按钮皮肤：比 type 多一个 ghost（半透明的次级按钮），是旧的 variant 写法的保留值域 */
export type JeButtonVariant = JeButtonType | 'ghost'

/** 按钮尺寸 */
export type JeButtonSize = 'large' | 'default' | 'small'

/** 按钮在组内的位置：独占整个组时不收紧圆角 */
export type JeButtonGroupPosition = 'only' | 'first' | 'middle' | 'last'

/** 按钮组下发给子按钮的默认配置 */
export interface JeButtonGroupContext {
  /** 组上声明的尺寸，子按钮未显式指定时沿用 */
  getSize: () => JeButtonSize | undefined
  /** 组上声明的语义类型，子按钮未显式指定时沿用 */
  getType: () => JeButtonType | undefined
  /** 排列方向，决定首尾相扣的是左右圆角还是上下圆角 */
  getDirection: () => 'horizontal' | 'vertical'
  /** 子按钮挂载时按顺序登记自己 */
  register: (uid: number) => void
  /** 子按钮卸载时注销 */
  unregister: (uid: number) => void
  /** 该按钮在组内的位置 */
  getPosition: (uid: number) => JeButtonGroupPosition
}

/**
 * 子按钮通过它拿到按钮组的默认尺寸、语义类型，以及自己在组内的位置。
 *
 * 位置必须由分组下发：小程序端样式隔离，父组件 wxss 里的
 * `.je-button-group > .je-button:first-child` 匹配不到子组件内部的节点，
 * 首尾圆角与 -1px 叠边只能由子按钮自己落地。
 */
export const jeButtonGroupKey: InjectionKey<JeButtonGroupContext> = Symbol('jeButtonGroup')
