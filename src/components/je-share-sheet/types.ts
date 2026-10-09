import type { JeIconName } from '../je-icon/icons'

/** 分享面板里的一个分享目标 */
export interface JeShareOption {
  /** 名称，既是展示文字也是 select 事件里回传的标识 */
  name: string
  /** 图标，缺省用 share */
  icon?: JeIconName
  /** 图标底色，缺省按索引取内置色组 */
  color?: string
  /** 图标颜色，缺省与底色一致 */
  iconColor?: string
  /** 禁用 */
  disabled?: boolean
}
