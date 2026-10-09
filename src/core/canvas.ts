/**
 * Canvas 绘制共享内核（uni 版）—— 供 `JePoster` 复用。
 *
 * 与主库 `src/core/canvas.ts` 口径完全一致，只把「绘制底」换成跨端的：
 * - H5 走 DOM（`getComputedStyle` 解析颜色、`new Image()` 加载图片），条件编译 `#ifdef H5`；
 * - 小程序端没有 DOM，颜色原样返回，图片走 `canvas.createImage()`（`#ifndef H5`）。
 * 绘制指令本身两端同源 —— 小程序 `type="2d"` 的 ctx 与 DOM ctx 方法一致，故统一按
 * `CanvasRenderingContext2D` 书写，仅在取图片对象处按平台分派。
 */

import type { JeQrcodeEncodeResult } from './qrcode'

/** 深色模块形状 */
export type JeQrcodeShape = 'square' | 'dot'

/** 圆点半径（相对模块边长），略小于 0.5 以留出点与点之间的缝隙 */
export const QR_DOT_RADIUS = 0.45

/** 缺省字体栈（Canvas 里必须显式给 font，不能像 CSS 那样靠继承） */
export const CANVAS_FONT_FAMILY =
  '"PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif'

/**
 * 跨端可绘制图片对象：H5 是 `HTMLImageElement`，小程序是 `canvas.createImage()` 的产物。
 * 绘制只依赖宽高，两端结构兼容。
 */
export interface JeCanvasImage {
  width: number
  height: number
}

/** 小程序 canvas 2d 节点（`fields({ node: true })` 拿到的 node） */
export interface JeCanvasNode {
  width: number
  height: number
  getContext(type: '2d'): CanvasRenderingContext2D
  createImage(): JeCanvasImage & {
    src: string
    onload: (() => void) | null
    onerror: (() => void) | null
  }
}

/**
 * 解析 CSS 颜色为具体值。
 * canvas 不认 `currentColor` / `var()`，H5 借一次「写进宿主样式 → 读 computedStyle → 还原」
 * 把它落成 `rgb(...)`；小程序端没有 DOM / `getComputedStyle`，原样返回（组件默认色都是具体值）。
 */
export const resolveCssColor = (
  host: HTMLElement | null | undefined,
  css: string,
  prop: 'color' | 'background-color',
): string => {
  // #ifdef H5
  if (host) {
    const previous = host.style.getPropertyValue(prop)
    host.style.setProperty(prop, css)
    const resolved = getComputedStyle(host).getPropertyValue(prop).trim()
    if (previous) host.style.setProperty(prop, previous)
    else host.style.removeProperty(prop)
    return resolved || css
  }
  // #endif
  return css
}

/** `transparent` 与 alpha 为 0 的 rgba 都算透明 */
export const isTransparent = (css: string): boolean =>
  /^transparent$/.test(css) || /^rgba?\([^)]*,\s*0\s*\)$/.test(css)

/** 图片加载缓存（同一地址只请求一次；失败项会从缓存里剔除以便重试） */
const imageCache = new Map<string, Promise<JeCanvasImage | null>>()

/**
 * 加载图片。
 * - H5：`new Image()`，远程 / 跨域图片自动带 `crossOrigin`，否则画进 canvas 会「污染」画布、
 *   `toDataURL()` 直接抛 `SecurityError`（前提是图片服务器返回了 CORS 头）。
 * - 小程序：用当前 `canvas` 节点的 `createImage()`，必须传入 canvas 节点。
 * 加载失败时返回 `null`，由调用方降级（跳过图片 / 回退文字），不阻断整条绘制链。
 */
export const loadImage = (
  src: string,
  canvas?: JeCanvasNode | null,
): Promise<JeCanvasImage | null> => {
  const cached = imageCache.get(src)
  if (cached) return cached
  const promise = new Promise<JeCanvasImage | null>((resolve) => {
    // #ifdef H5
    const htmlImage = new Image()
    if (/^https?:\/\//i.test(src)) htmlImage.crossOrigin = 'anonymous'
    htmlImage.onload = () => resolve(htmlImage)
    htmlImage.onerror = () => {
      imageCache.delete(src)
      resolve(null)
    }
    htmlImage.src = src
    // #endif
    // #ifndef H5
    if (!canvas) {
      resolve(null)
      return
    }
    const miniImage = canvas.createImage()
    miniImage.onload = () => resolve(miniImage)
    miniImage.onerror = () => {
      imageCache.delete(src)
      resolve(null)
    }
    miniImage.src = src
    // #endif
  })
  imageCache.set(src, promise)
  return promise
}

export interface JeQrcodeRun {
  x: number
  y: number
  len: number
}

/**
 * 按行把满足条件的深色模块合并成连续段。
 * SVG 与 Canvas 共用这一份口径，比逐模块绘制少几个数量级的绘制指令。
 */
export const collectQrcodeRuns = (
  result: JeQrcodeEncodeResult,
  include: (x: number, y: number) => boolean,
): JeQrcodeRun[] => {
  const list: JeQrcodeRun[] = []
  for (let y = 0; y < result.size; y++) {
    const row = result.matrix[y]
    let x = 0
    while (x < result.size) {
      if (!row[x] || !include(x, y)) {
        x += 1
        continue
      }
      let len = 1
      while (x + len < result.size && row[x + len] && include(x + len, y)) len += 1
      list.push({ x, y, len })
      x += len
    }
  }
  return list
}

/** 渐变方向向量：CSS 角度约定（0 向上、顺时针增大），屏幕 y 轴向下故取负 */
export const gradientVector = (angle: number): { x: number; y: number } => {
  const deg = Number.isFinite(angle) ? angle : 45
  const rad = (deg * Math.PI) / 180
  return { x: Math.sin(rad), y: -Math.cos(rad) }
}

export interface JeQrcodePaintOptions {
  /** 目标矩形左上角（canvas 坐标） */
  x: number
  y: number
  /** 目标边长（正方形） */
  size: number
  /** 编码结果 */
  result: JeQrcodeEncodeResult
  /** 静区宽度（模块数），默认 2 */
  margin?: number
  /** 深色模块颜色，支持 currentColor / var()，默认 currentColor */
  color?: string
  /** 背景色，默认透明（不铺底） */
  background?: string
  /** 深色模块形状，默认 square */
  shape?: JeQrcodeShape
  /** 前景渐变色标（至少两个），给值时覆盖 color */
  gradient?: string[]
  /** 渐变角度（CSS 约定），默认 45 */
  gradientAngle?: number
  /** 用于解析 currentColor / var() 的宿主元素 */
  host?: HTMLElement | null
}

/** 前景填充：有渐变走 createLinearGradient（覆盖整个目标矩形），否则解析 color */
const createQrcodeFill = (
  ctx: CanvasRenderingContext2D,
  options: JeQrcodePaintOptions,
): string | CanvasGradient => {
  const stops =
    Array.isArray(options.gradient) && options.gradient.length >= 2 ? options.gradient : null
  if (!stops) return resolveCssColor(options.host, options.color ?? 'currentColor', 'color')

  const { x: vx, y: vy } = gradientVector(options.gradientAngle ?? 45)
  const { x, y, size } = options
  const gradient = ctx.createLinearGradient(
    x + (0.5 - vx / 2) * size,
    y + (0.5 - vy / 2) * size,
    x + (0.5 + vx / 2) * size,
    y + (0.5 + vy / 2) * size,
  )
  const step = 1 / (stops.length - 1)
  stops.forEach((stop, index) =>
    gradient.addColorStop(index * step, resolveCssColor(options.host, stop, 'color')),
  )
  return gradient
}

/**
 * 把二维码矩阵画进指定矩形（背景 + 前景）。
 * 方块段的边界对齐到整数像素，避免出现缝；圆点段走 arc。
 */
export const drawQrcodeMatrix = (
  ctx: CanvasRenderingContext2D,
  options: JeQrcodePaintOptions,
): void => {
  const { x, y, size, result } = options
  if (!result || !Number.isFinite(size) || size <= 0) return

  const margin = Math.max(0, options.margin ?? 2)
  const total = result.size + margin * 2
  const cell = size / total
  const shape = options.shape ?? 'square'

  const background = resolveCssColor(
    options.host,
    options.background ?? 'transparent',
    'background-color',
  )
  if (!isTransparent(background)) {
    ctx.fillStyle = background
    ctx.fillRect(x, y, size, size)
  }

  ctx.fillStyle = createQrcodeFill(ctx, options)

  // 点状时功能模块仍走方块，保住定位图案的 1:1:3:1:1 比例
  const runs = collectQrcodeRuns(
    result,
    shape === 'dot' ? (mx, my) => result.isFunction[my][mx] : () => true,
  )
  for (const run of runs) {
    const x0 = Math.round(x + (run.x + margin) * cell)
    const x1 = Math.round(x + (run.x + margin + run.len) * cell)
    const y0 = Math.round(y + (run.y + margin) * cell)
    const y1 = Math.round(y + (run.y + margin + 1) * cell)
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  }

  if (shape === 'dot') {
    const radius = cell * QR_DOT_RADIUS
    for (let my = 0; my < result.size; my++) {
      const row = result.matrix[my]
      const fn = result.isFunction[my]
      for (let mx = 0; mx < result.size; mx++) {
        if (!row[mx] || fn[mx]) continue
        ctx.beginPath()
        ctx.arc(
          x + (mx + margin + 0.5) * cell,
          y + (my + margin + 0.5) * cell,
          radius,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    }
  }
}

export interface JeCanvasBox {
  x: number
  y: number
  width: number
  height: number
}

/** 圆角矩形路径（半径夹到不超过半边长；`radius` 为 0 时退化成直角矩形） */
export const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  box: JeCanvasBox,
  radius: number,
): void => {
  const r = Math.max(0, Math.min(radius, box.width / 2, box.height / 2))
  const { x, y, width, height } = box
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/** 图片填充方式：fill 拉伸 / contain 完整放入 / cover 铺满并裁切 */
export type JeImageFit = 'fill' | 'contain' | 'cover'

/**
 * 把图片按 `fit` 画进矩形，可带圆角（`radius` 给到半边长即圆形）裁剪。
 * 圆形头像就是 `radius = size / 2` 的 image。
 */
export const drawImageInBox = (
  ctx: CanvasRenderingContext2D,
  image: JeCanvasImage,
  box: JeCanvasBox,
  options: { fit?: JeImageFit; radius?: number } = {},
): void => {
  const fit = options.fit ?? 'contain'
  const radius = options.radius ?? 0
  const { x, y, width, height } = box
  if (width <= 0 || height <= 0 || !image.width || !image.height) return

  ctx.save()
  if (radius > 0) {
    roundRectPath(ctx, box, radius)
    ctx.clip()
  }

  let dw = width
  let dh = height
  if (fit !== 'fill') {
    const scale =
      fit === 'cover'
        ? Math.max(width / image.width, height / image.height)
        : Math.min(width / image.width, height / image.height)
    dw = image.width * scale
    dh = image.height * scale
  }
  // 小程序端图片对象不是 DOM CanvasImageSource，运行时结构兼容，此处按底类型透传
  ctx.drawImage(image as unknown as CanvasImageSource, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh)
  ctx.restore()
}

/** 中日韩字符与全角标点：折行时按「字」断，其余按「词」断 */
const CJK = '\u2e80-\u9fff\uff00-\uffef\u3000-\u303f'
const TOKEN_RE = new RegExp(`[${CJK}]|[^\\s${CJK}]+|\\s+`, 'g')

/**
 * 按最大宽度折行（调用前请先设好 `ctx.font`）。
 * 中日韩按字符断行、西文按单词断行；单个词超宽时退化到逐字符硬断。
 */
export const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const lines: string[] = []
  const tokens = String(text ?? '').match(TOKEN_RE) ?? []

  let line = ''
  const push = (value: string) => lines.push(value.replace(/\s+$/, ''))

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      // 空白只作为「可断点」，不在行尾留白
      if (line) line += token
      continue
    }
    const next = line + token
    if (line.trim() && ctx.measureText(next).width > maxWidth) {
      push(line)
      line = token
    } else {
      line = next
    }
    // 单个词本身就超宽：逐字符硬断
    if (ctx.measureText(line).width > maxWidth) {
      let chunk = ''
      for (const char of Array.from(line)) {
        if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
          push(chunk)
          chunk = char
        } else {
          chunk += char
        }
      }
      line = chunk
    }
  }
  if (line.trim() || lines.length === 0) push(line)
  return lines
}
