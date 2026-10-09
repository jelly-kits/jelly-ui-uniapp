/** 单个颜色，或一组用于线性渐变的端点色 */
export type JeCircleColorInput = string | string[] | Array<string | string[]>

/** 环形进度色输入：单色 / 渐变端点色数组 / 以 offset 为键的渐变对象 */
export type JeCircleColor =
  | JeCircleColorInput
  | Record<string, string>
  | Array<string | Record<string, string>>
