/** JeBacktop 的属性 */
export interface JeBacktopProps {
  /** 滚动容器选择器，缺省监听窗口 */
  target?: string
  /** 滚动超过该距离后出现 */
  visibilityHeight?: number
  /** 距视口右侧距离（px） */
  right?: number
  /** 距视口底部距离（px） */
  bottom?: number
}