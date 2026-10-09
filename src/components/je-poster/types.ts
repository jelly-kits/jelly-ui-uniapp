import type { JeImageFit, JeQrcodeShape } from '../../core/canvas'
import type { JeQrcodeEncodeResult, JeQrcodeLevel } from '../../core/qrcode'

/**
 * 海报元素配置。所有坐标 / 尺寸 / 字号都按**设计稿 px**书写
 * （`JePoster` 的 `width` / `height` 即设计稿尺寸），组件负责按容器宽度等比缩放，
 * 导出时再按目标像素等比放大，因此同一份配置在任何尺寸下都长得一样。
 */

/** 图片元素的描边 */
export interface JePosterBorder {
  /** 描边宽度（设计稿 px） */
  width?: number
  /** 描边颜色，默认 #ffffff */
  color?: string
}

interface JePosterElementBase {
  /** 元素标识，DOM 预览模式下用于匹配同名具名插槽 */
  name?: string
  /** 左上角 x（设计稿 px） */
  x: number
  /** 左上角 y（设计稿 px） */
  y: number
  /** 整体不透明度 0–1，默认 1 */
  opacity?: number
}

/** 图片元素：头像、装饰图等 */
export interface JePosterImageElement extends JePosterElementBase {
  type: 'image'
  /** 图片地址 */
  src: string
  /** 宽（设计稿 px） */
  width: number
  /** 高（设计稿 px） */
  height: number
  /** 填充方式，默认 cover */
  fit?: JeImageFit
  /** 裁成圆形（头像场景），等价于 radius = min(width, height) / 2 */
  circle?: boolean
  /** 圆角半径（设计稿 px），circle 为真时忽略 */
  radius?: number
  /** 描边（头像常见的白色圈） */
  border?: JePosterBorder
}

/** 文本元素：标题、说明等 */
export interface JePosterTextElement extends JePosterElementBase {
  type: 'text'
  /** 文本内容 */
  text: string
  /** 折行最大宽度（设计稿 px）；缺省取「海报宽度 − x」 */
  width?: number
  /** 字号（设计稿 px），默认 32 */
  fontSize?: number
  /** 字重，默认 400 */
  fontWeight?: number | string
  /** 文字颜色，默认 #ffffff */
  color?: string
  /** 字体栈，默认内置中文字体栈 */
  fontFamily?: string
  /** 行高倍数（相对字号），默认 1.4 */
  lineHeight?: number
  /** 水平对齐，默认 left */
  align?: 'left' | 'center' | 'right'
  /** 最多显示行数，超出部分用省略号截断 */
  maxLines?: number
}

/** 二维码元素：直接吃二维码内核，形状 / 渐变 / 中心 logo 全套可用 */
export interface JePosterQrcodeElement extends JePosterElementBase {
  type: 'qrcode'
  /** 要编码的文本 */
  value: string
  /** 边长（设计稿 px） */
  size: number
  /** 纠错级别，默认 M */
  level?: JeQrcodeLevel
  /** 静区宽度（模块数），默认 2 */
  margin?: number
  /** 深色模块颜色，默认 #000000 */
  color?: string
  /** 背景色，默认 #ffffff（海报上的二维码需要浅底才好扫） */
  background?: string
  /** 模块形状：square 方块 / dot 圆点，默认 square */
  shape?: JeQrcodeShape
  /** 前景渐变色标（至少两个），给值时覆盖 color */
  gradient?: string[]
  /** 渐变角度（CSS 约定），默认 45 */
  gradientAngle?: number
  /** 中心 logo 地址 */
  icon?: string
}

export type JePosterElement = JePosterImageElement | JePosterTextElement | JePosterQrcodeElement

/** 海报背景：底色 + 可选背景图 */
export interface JePosterBackground {
  /** 背景图地址；缺省时只铺底色 */
  src?: string
  /** 背景图填充方式，默认 cover */
  fit?: JeImageFit
  /** 背景底色，图片未覆盖处 / 加载失败时可见，默认 transparent */
  color?: string
}

/** 导出选项 */
export interface JePosterExportOptions {
  /** 导出宽度（px），缺省取设计稿宽度 */
  width?: number
  /** 导出高度（px），缺省按设计稿比例随宽度等比换算 */
  height?: number
  /** 图片 MIME 类型，默认 image/png；小程序端只有 png / jpeg 两种 */
  type?: string
  /** 图片质量 0–1，仅对 image/jpeg 等有损格式有效 */
  quality?: number
}

/** 布局解析结果：元素配置经折行 / 圆角换算后得到的绝对定位盒子 */
export interface JePosterBoxBase {
  /** 渲染用唯一 key（与数组下标绑定，同名元素也不冲突） */
  key: string
  /** 元素标识（若有），DOM 预览据此匹配具名插槽 */
  name?: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
}

export interface JePosterImageBox extends JePosterBoxBase {
  kind: 'image'
  element: JePosterImageElement
  /** 已换算好的圆角半径 */
  radius: number
}

export interface JePosterTextBox extends JePosterBoxBase {
  kind: 'text'
  element: JePosterTextElement
  /** 折行结果（DOM 预览与 Canvas 绘制共用，保证两处断行一致） */
  lines: string[]
  fontSize: number
  fontWeight: string
  color: string
  fontFamily: string
  align: 'left' | 'center' | 'right'
  /** 每行高度（设计稿 px） */
  lineHeightPx: number
  /** 是否被 maxLines 截断 */
  truncated: boolean
}

export interface JePosterQrcodeBox extends JePosterBoxBase {
  kind: 'qrcode'
  element: JePosterQrcodeElement
  /** 编码结果，内容超出容量时为 null（该元素不绘制） */
  result: JeQrcodeEncodeResult | null
}

export type JePosterBox = JePosterImageBox | JePosterTextBox | JePosterQrcodeBox
