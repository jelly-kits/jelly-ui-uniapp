/** 省市区数据节点 */
export interface JeAreaOption {
  /** 显示文字 */
  text: string
  /** 唯一值 */
  value: string | number
  /** 下级数据 */
  children?: JeAreaOption[]
}
