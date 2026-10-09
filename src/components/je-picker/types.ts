/** 滚轮选择器的一列选项 */
export interface JePickerOption {
  /** 显示文字 */
  text: string
  /** 选中后回传的值 */
  value: string | number
  /** 次级说明文字 */
  subText?: string
  /** 禁用 */
  disabled?: boolean
}

/** 滚轮选择器的一列 */
export interface JePickerColumn {
  /** 列标识，仅用于 key 与无障碍标签 */
  name?: string
  /** 列的辅助标签 */
  title?: string
  /** 该列的选项 */
  options: JePickerOption[]
}
