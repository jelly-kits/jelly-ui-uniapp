/** 断点取值：数字等价于 span；对象可同时指定 span 与 offset */
export interface JeColResponsive {
  span?: number
  offset?: number
}

export type JeResponsiveValue = number | JeColResponsive
