import type { InjectionKey } from 'vue'
import type { JeIconName } from '../je-icon/icons'

/** 父级下发给子项的分隔符与顺序信息 */
export interface JeBreadcrumbContext {
  /** 读取当前分隔符文字 */
  getSeparator: () => string
  /** 读取当前自定义分隔符图标 */
  getSeparatorIcon: () => JeIconName | undefined
  /** 该子项是否为最后一项（最后一项不显示分隔符） */
  isLast: (uid: string) => boolean
  /** 注册子项，父级据此维护顺序 */
  registerItem: (uid: string) => void
  /** 注销子项 */
  unregisterItem: (uid: string) => void
}

/** 子项通过它拿到父级的分隔符与自身位置 */
export const jeBreadcrumbKey: InjectionKey<JeBreadcrumbContext> = Symbol('jeBreadcrumb')
