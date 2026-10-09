import type { InjectionKey, Ref } from 'vue'

/** 水平主轴对齐 */
export type JeRowJustify =
  | 'start'
  | 'end'
  | 'center'
  | 'space-around'
  | 'space-between'
  | 'space-evenly'

/** 垂直交叉轴对齐 */
export type JeRowAlign = 'top' | 'middle' | 'bottom' | 'stretch'

/** 栅格间距：数字为水平间距；数组为 [水平, 垂直] */
export type JeGutter = number | [number, number]

/** JeCol 用它取到 JeRow 下发的间距 */
export const jeRowKey: InjectionKey<Readonly<Ref<JeGutter>>> = Symbol('jeRow')
