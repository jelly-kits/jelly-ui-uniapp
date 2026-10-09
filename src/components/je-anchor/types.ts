import type { InjectionKey, Ref } from 'vue'

/** 锚点排列方向 */
export type JeAnchorDirection = 'vertical' | 'horizontal'

/** 父级下发给 JeAnchorLink 的上下文 */
export interface JeAnchorContext {
  /** 当前高亮的 href，子项据此响应式判断激活态（不做命令式改 class） */
  activeHref: Ref<string>
  /** 排列方向，子项据此切换指示条朝向 */
  direction: Ref<JeAnchorDirection>
  /** 子项挂载时登记 */
  registerLink: (href: string) => void
  /** 子项卸载时注销 */
  unregisterLink: (href: string) => void
  /** 点击子项后滚动到目标并派发事件 */
  scrollTo: (href: string) => void
}

/** JeAnchorLink 用它注入父级上下文 */
export const jeAnchorKey: InjectionKey<JeAnchorContext> = Symbol('jeAnchor')