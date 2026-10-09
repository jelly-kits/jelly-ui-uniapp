import type { InjectionKey } from 'vue'

/** 时间轴节点语义类型 */
export type JeTimelineType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** 时间轴节点尺寸 */
export type JeTimelineSize = 'normal' | 'large'

/** 时间轴下发给子项的上下文 */
export interface JeTimelineContext {
  /** 是否倒序：DOM 首项在视觉上位于末尾 */
  getReverse: () => boolean
}

/**
 * 小程序端样式隔离，子项 wxss 里的 `.je-timeline.is-reverse .je-timeline-item:first-child`
 * 匹配不到另一个组件里的 `.je-timeline` 节点，倒序的判断只能由父级 provide 下发。
 */
export const jeTimelineKey: InjectionKey<JeTimelineContext> = Symbol('jeTimeline')

