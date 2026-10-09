/** 图片预览的单张图片 */
export interface JeImagePreviewItem {
  /** 图片地址 */
  url: string
  /** 图片说明（暂不强制渲染，留给业务读取） */
  alt?: string
}
