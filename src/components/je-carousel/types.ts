import type { InjectionKey } from 'vue'

/** 子项注册到父级时提交的元信息 */
export interface JeCarouselItemMeta {
  uid: string
  name?: string | number
}

/** 父级通过 provide 暴露给子项的上下文，子项靠它完成注册 / 注销 */
export interface JeCarouselContext {
  register: (item: JeCarouselItemMeta) => void
  unregister: (uid: string) => void
}

export const JE_CAROUSEL_KEY: InjectionKey<JeCarouselContext> = Symbol('jeCarousel')