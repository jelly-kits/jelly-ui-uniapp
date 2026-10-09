/** 吸顶 / 吸底 */
export type JeAffixPosition = 'top' | 'bottom'

/** JeAffix 的属性 */
export interface JeAffixProps {
  /** 与目标边界的距离（px） */
  offset?: number
  /** 吸附所参照的容器选择器，缺省为窗口 */
  target?: string
  /** 吸附方向 */
  position?: JeAffixPosition
  /** 固定后的层级 */
  zIndex?: number
}