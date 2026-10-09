/** 数字格式化选项，便于外部复用同样的展示规则 */
export interface JeStatisticFormatOptions {
  /** 保留的小数位数 */
  precision: number
  /** 是否插入千分位分隔符 */
  useGroupSeparator: boolean
  /** 千分位分隔符 */
  separator: string
}
