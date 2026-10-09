/** 关键字高亮切分后的一段文本 */
export interface JeHighlightSegment {
  /** 片段文本 */
  text: string
  /** 是否命中关键字 */
  matched: boolean
}
