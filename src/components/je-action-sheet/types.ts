import type { JeIconName } from '../je-icon/icons'

/** 动作面板的一个操作项 */
export interface JeActionSheetAction {
  /** 唯一标识，select 事件里原样回传 */
  name: string | number
  /** 主文字，缺省时回退到 name */
  text?: string
  /** 主文字下方的说明 */
  subText?: string
  /** 左侧图标 */
  icon?: JeIconName
  /** 自定义文字颜色，例如删除项用危险色 */
  color?: string
  /** 禁用 */
  disabled?: boolean
  /** 加载中 */
  loading?: boolean
}
