import type { InjectionKey } from 'vue'

/** 骨架块形态 */
export type JeSkeletonVariant = 'text' | 'circle' | 'rect' | 'button'

/** 骨架屏下发给子项的上下文 */
export interface JeSkeletonContext {
  /** 是否播放微光动画 */
  getAnimated: () => boolean
  /** 是否胶囊圆角（圆形形态自身除外） */
  getRound: () => boolean
}

/**
 * 小程序端样式隔离，父组件 wxss 里的 `:deep(.je-skeleton__item)` 够不到
 * je-skeleton-item 组件内部的节点，动画开关与圆角只能由父级 provide 下发。
 */
export const jeSkeletonKey: InjectionKey<JeSkeletonContext> = Symbol('jeSkeleton')
