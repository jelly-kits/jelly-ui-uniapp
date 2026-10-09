/**
 * 渲染方式。
 *
 * 主库 svg 走内联 `<svg>` 路径、canvas 走真实像素绘制；小程序端两者都不可用
 * （内联 SVG 是小程序硬禁忌；canvas 是原生层，会盖住中心 logo 的叠加层，也不好同步导出位图），
 * uni 端统一用 view 网格渲染，因此这里两个取值**等价**，仅保留供 API 兼容。
 */
export type JeQrcodeRenderer = 'svg' | 'canvas'

/** 深色模块形状，与绘制内核同源，这里转导一份方便使用方引用 */
export type { JeQrcodeShape } from '../../core/canvas'

/** 纠错级别，与编码内核同源，这里转导一份方便使用方引用 */
export type { JeQrcodeLevel } from '../../core/qrcode'

/** SVG 字符串导出选项 */
export interface JeQrcodeSvgOptions {
  /** 导出 SVG 的默认显示边长（写入 width / height），数字按 px 处理；缺省取 size 属性的数字值，再退到 160 */
  size?: number
}
