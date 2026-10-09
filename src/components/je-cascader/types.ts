export interface JeCascaderOption {
  value: string | number
  label: string
  children?: JeCascaderOption[]
  disabled?: boolean
}

/** 级联选择的绑定值：从根到叶子的 value 路径 */
export type JeCascaderValue = (string | number)[]
