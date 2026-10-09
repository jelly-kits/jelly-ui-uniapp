/** 图片填充方式 */
export type JeLazyloadFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'

/** eager 表示不做懒加载，直接渲染 */
export type JeLazyloadLoading = 'lazy' | 'eager'

/** JeLazyload 的属性 */
export interface JeLazyloadProps {
  /** 图片地址 */
  src?: string
  /** 替代文本 */
  alt?: string
  /** 距离视口多远开始加载：H5 直接当 IntersectionObserver 的 rootMargin 用，小程序端只取其数值（px） */
  rootMargin?: string
  /** eager 表示不做懒加载，直接渲染 */
  loading?: JeLazyloadLoading
  /** 占位图地址，也可以直接用 placeholder 插槽 */
  placeholder?: string
  /** 加载失败时的兜底图地址 */
  error?: string
  /** 容器宽度，数字按 px 处理 */
  width?: number | string
  /** 容器高度，数字按 px 处理 */
  height?: number | string
  /** 图片填充方式 */
  objectFit?: JeLazyloadFit
}
