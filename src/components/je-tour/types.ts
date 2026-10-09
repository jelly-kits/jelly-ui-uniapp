import type { JePlacementValue } from '../../core/placement'

/** 单个引导步骤 */
export interface JeTourStep {
  /** 目标元素选择器，如 '#save-button' */
  target: string
  title?: string
  description?: string
  /** 气泡相对目标的方位，默认 bottom */
  placement?: JePlacementValue
}
