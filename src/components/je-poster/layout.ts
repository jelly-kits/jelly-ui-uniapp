import { CANVAS_FONT_FAMILY, wrapText } from '../../core/canvas'
import { encodeQrcode } from '../../core/qrcode'
import type {
  JePosterBackground,
  JePosterBox,
  JePosterElement,
  JePosterImageElement,
  JePosterQrcodeElement,
  JePosterTextElement,
} from './types'

/**
 * 布局解析器：一份元素配置 → 一组绝对定位盒子。
 * Canvas 绘制与 DOM 预览**消费同一份盒子**（含折行结果），所以两种模式长得一样，
 * 导出也永远按这份盒子画 —— 「DOM 预览好看」与「导出所见即所得」才能并存。
 *
 * 与主库算法完全同源，纯几何 / 布局，不含平台 API：
 * 唯一的平台差异是折行测量用的离屏上下文 —— H5 有 DOM 可以真测宽，
 * 小程序端 `document` 未定义时退化为「只按 \n 断行、不做折行与 maxLines 截断」。
 */

/** 折行测量用的离屏上下文（惰性创建，全进程共用一个） */
let measureCtx: CanvasRenderingContext2D | null = null

const getMeasureContext = (): CanvasRenderingContext2D | null => {
  if (measureCtx) return measureCtx
  // 小程序端没有 document，测量上下文拿不到 → 上层走无折行降级
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  measureCtx = canvas.getContext('2d')
  return measureCtx
}

/** Canvas 与 DOM 共用的字体串 */
export const posterFont = (
  fontSize: number,
  fontWeight: number | string,
  fontFamily: string,
): string => `${fontWeight} ${fontSize}px ${fontFamily}`

/** 海报上所有需要预加载的图片地址（背景图 + 图片元素 + 二维码中心 logo） */
export const collectPosterImages = (
  background: JePosterBackground,
  elements: JePosterElement[],
): string[] => {
  const list: string[] = []
  if (background.src) list.push(background.src)
  for (const element of elements) {
    if (element.type === 'image' && element.src) list.push(element.src)
    if (element.type === 'qrcode' && element.icon) list.push(element.icon)
  }
  return list
}

/** 按 maxLines 截断并补省略号（逐字符回退，避免切断代理对） */
const clampLines = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxLines: number,
  maxWidth: number,
): { lines: string[]; truncated: boolean } => {
  if (maxLines <= 0 || lines.length <= maxLines) return { lines, truncated: false }
  const kept = lines.slice(0, maxLines)
  const last = kept[kept.length - 1]
  let chars = Array.from(last)
  while (chars.length && ctx.measureText(`${chars.join('')}…`).width > maxWidth) {
    chars = chars.slice(0, -1)
  }
  kept[kept.length - 1] = `${chars.join('')}…`
  return { lines: kept, truncated: true }
}

const resolveImage = (element: JePosterImageElement, key: string): JePosterBox => {
  const width = Math.max(0, element.width)
  const height = Math.max(0, element.height)
  const radius = element.circle ? Math.min(width, height) / 2 : Math.max(0, element.radius ?? 0)
  return {
    key,
    name: element.name,
    kind: 'image',
    element,
    x: element.x,
    y: element.y,
    width,
    height,
    opacity: element.opacity ?? 1,
    radius,
  }
}

const resolveText = (
  element: JePosterTextElement,
  key: string,
  posterWidth: number,
): JePosterBox => {
  const fontSize = element.fontSize ?? 32
  const fontWeight = element.fontWeight ?? 400
  const fontFamily = element.fontFamily ?? CANVAS_FONT_FAMILY
  const color = element.color ?? '#ffffff'
  const lineHeightPx = fontSize * (element.lineHeight ?? 1.4)
  const align = element.align ?? 'left'
  const maxWidth = Math.max(1, element.width ?? posterWidth - element.x)

  const ctx = getMeasureContext()
  let lines: string[]
  let truncated = false
  if (ctx) {
    ctx.font = posterFont(fontSize, fontWeight, fontFamily)
    lines = wrapText(ctx, element.text ?? '', maxWidth)
    const clamped = clampLines(ctx, lines, element.maxLines ?? 0, maxWidth)
    lines = clamped.lines
    truncated = clamped.truncated
  } else {
    lines = String(element.text ?? '').split('\n')
  }

  return {
    key,
    name: element.name,
    kind: 'text',
    element,
    x: element.x,
    y: element.y,
    width: maxWidth,
    height: lines.length * lineHeightPx,
    opacity: element.opacity ?? 1,
    lines,
    fontSize,
    fontWeight: String(fontWeight),
    color,
    fontFamily,
    align,
    lineHeightPx,
    truncated,
  }
}

const resolveQrcode = (element: JePosterQrcodeElement, key: string): JePosterBox => {
  const size = Math.max(0, element.size)
  return {
    key,
    name: element.name,
    kind: 'qrcode',
    element,
    x: element.x,
    y: element.y,
    width: size,
    height: size,
    opacity: element.opacity ?? 1,
    result: encodeQrcode({ value: element.value ?? '', level: element.level ?? 'M' }),
  }
}

/** 解析整张海报：按数组顺序产出盒子（数组顺序即叠放顺序） */
export const resolvePoster = (posterWidth: number, elements: JePosterElement[]): JePosterBox[] =>
  elements.map((element, index) => {
    const key = `${element.type}-${index}`
    if (element.type === 'image') return resolveImage(element, key)
    if (element.type === 'text') return resolveText(element, key, posterWidth)
    return resolveQrcode(element, key)
  })
