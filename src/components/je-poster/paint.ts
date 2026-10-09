import {
  drawImageInBox,
  drawQrcodeMatrix,
  isTransparent,
  resolveCssColor,
  roundRectPath,
  type JeCanvasImage,
} from '../../core/canvas'
import { posterFont } from './layout'
import type {
  JePosterBackground,
  JePosterBox,
  JePosterImageBox,
  JePosterQrcodeBox,
  JePosterTextBox,
} from './types'

/**
 * Canvas 绘制层：把布局解析出的盒子画到 2D 上下文。
 * 调用方负责先把 ctx 缩放好（画布像素 ÷ 设计稿 px），这里一律用设计稿坐标绘制，
 * 于是实时预览、DOM 模式之外的导出、以及任意导出尺寸都共用同一条绘制链。
 *
 * 与主库口径一致：只依赖 `CanvasRenderingContext2D`，H5 与小程序的 2d 上下文同源，
 * 因此这一层无需条件编译。唯一平台差异在图片对象类型（H5 `HTMLImageElement` /
 * 小程序 `canvas.createImage()` 产物），已收口为 `JeCanvasImage`。
 */

export interface JePosterPaintInput {
  /** 设计稿宽高 */
  width: number
  height: number
  background: JePosterBackground
  boxes: JePosterBox[]
  /** 预加载好的图片（key = 地址），失败为 null */
  images: Map<string, JeCanvasImage | null>
  /** 解析 currentColor / var() 的宿主元素（仅 H5 有效） */
  host?: HTMLElement | null
}

interface PaintContext {
  ctx: CanvasRenderingContext2D
  host: HTMLElement | null
  images: Map<string, JeCanvasImage | null>
}

/** 二维码中心 logo 占边长的比例（与 JeQrcode 的 iconSize 缺省值对齐） */
const QR_ICON_RATIO = 0.22

const paintBackground = (p: PaintContext, input: JePosterPaintInput): void => {
  const { ctx } = p
  const color = resolveCssColor(p.host, input.background.color ?? 'transparent', 'background-color')
  if (!isTransparent(color)) {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, input.width, input.height)
  }

  const src = input.background.src
  if (!src) return
  const image = p.images.get(src)
  if (!image) return
  drawImageInBox(
    ctx,
    image,
    { x: 0, y: 0, width: input.width, height: input.height },
    { fit: input.background.fit ?? 'cover' },
  )
}

const paintImage = (p: PaintContext, box: JePosterImageBox): void => {
  const image = p.images.get(box.element.src)
  if (!image) return
  const { ctx } = p
  const width = Math.max(0, Math.min(box.element.border?.width ?? 0, box.width / 2, box.height / 2))

  // 先按外圈半径铺一层描边色，再把图片内缩画上去 —— 描边自然成为一圈环
  if (width > 0) {
    ctx.fillStyle = resolveCssColor(p.host, box.element.border?.color ?? '#ffffff', 'color')
    roundRectPath(ctx, { x: box.x, y: box.y, width: box.width, height: box.height }, box.radius)
    ctx.fill()
  }

  drawImageInBox(
    ctx,
    image,
    {
      x: box.x + width,
      y: box.y + width,
      width: Math.max(0, box.width - width * 2),
      height: Math.max(0, box.height - width * 2),
    },
    { fit: box.element.fit ?? 'cover', radius: Math.max(0, box.radius - width) },
  )
}

const paintText = (p: PaintContext, box: JePosterTextBox): void => {
  const { ctx } = p
  ctx.font = posterFont(box.fontSize, box.fontWeight, box.fontFamily)
  ctx.fillStyle = resolveCssColor(p.host, box.color, 'color')
  // 逐行定位到「行盒」垂直中心，与 DOM 预览的 line-height 居中口径对齐
  ctx.textBaseline = 'middle'
  ctx.textAlign = box.align
  const anchorX =
    box.align === 'center' ? box.x + box.width / 2 : box.align === 'right' ? box.x + box.width : box.x
  box.lines.forEach((line, index) => {
    ctx.fillText(line, anchorX, box.y + index * box.lineHeightPx + box.lineHeightPx / 2)
  })
}

const paintQrcode = (p: PaintContext, box: JePosterQrcodeBox): void => {
  if (!box.result) return
  const { ctx } = p
  const element = box.element
  const background = element.background ?? '#ffffff'

  drawQrcodeMatrix(ctx, {
    x: box.x,
    y: box.y,
    size: box.width,
    result: box.result,
    margin: element.margin ?? 2,
    color: element.color ?? '#000000',
    background,
    shape: element.shape ?? 'square',
    gradient: element.gradient,
    gradientAngle: element.gradientAngle ?? 45,
    host: p.host,
  })

  if (!element.icon) return
  const icon = p.images.get(element.icon)
  if (!icon) return

  const size = Math.min(box.width, box.height) * QR_ICON_RATIO
  const left = box.x + (box.width - size) / 2
  const top = box.y + (box.height - size) / 2
  const resolved = resolveCssColor(p.host, background, 'background-color')
  ctx.fillStyle = isTransparent(resolved) ? '#ffffff' : resolved
  roundRectPath(ctx, { x: left, y: top, width: size, height: size }, size * 0.1)
  ctx.fill()
  const inner = size * 0.8
  drawImageInBox(
    ctx,
    icon,
    { x: left + size * 0.1, y: top + size * 0.1, width: inner, height: inner },
    { fit: 'contain' },
  )
}

/** 把整张海报画到已缩放好的上下文里 */
export const paintPoster = (ctx: CanvasRenderingContext2D, input: JePosterPaintInput): void => {
  const p: PaintContext = { ctx, host: input.host ?? null, images: input.images }
  paintBackground(p, input)

  for (const box of input.boxes) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, box.opacity))
    if (box.kind === 'image') paintImage(p, box)
    else if (box.kind === 'text') paintText(p, box)
    else paintQrcode(p, box)
    ctx.restore()
  }
}
