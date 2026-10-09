<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JePoster 的根节点是 width: 100% 的块级容器（高度由设计稿比例换算出的 padding-top 撑开），
   * 常作为页面 / 卡片里的整行子项。小程序自定义组件默认会在外面多包一层宿主节点，
   * 子项会变成宿主，根节点的宽度与比例高度都落不到实处，故声明 virtualHost 让根节点直接参与父级排布。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
  type CSSProperties,
} from 'vue'
import { loadImage, type JeCanvasImage, type JeCanvasNode } from '../../core/canvas'
import { useUid } from '../../core/useUid'
import JeQrcode from '../je-qrcode/je-qrcode.vue'
import { collectPosterImages, resolvePoster } from './layout'
import { paintPoster } from './paint'
import type {
  JePosterBackground,
  JePosterBox,
  JePosterElement,
  JePosterExportOptions,
  JePosterImageBox,
  JePosterImageElement,
  JePosterTextBox,
} from './types'

defineOptions({ name: 'JePoster' })

const props = withDefaults(
  defineProps<{
    /** 设计稿宽度（px），元素坐标 / 尺寸 / 字号都按这个口径书写 */
    width?: number
    /** 设计稿高度（px） */
    height?: number
    /** 背景：底色 + 可选背景图 */
    background?: JePosterBackground
    /** 元素列表，按数组顺序叠放 */
    elements?: JePosterElement[]
    /** 渲染方式：canvas 所见即所得（默认，与导出一致）；dom 为真实 DOM 预览，可用同名具名插槽替换元素（插槽不影响导出） */
    mode?: 'canvas' | 'dom'
    /** 海报圆角（设计稿 px） */
    radius?: number
    /** 无障碍描述 */
    label?: string
  }>(),
  {
    width: 750,
    height: 1334,
    background: () => ({}),
    elements: () => [],
    mode: 'canvas',
    radius: 0,
    label: '海报',
  },
)

const slots = useSlots()
const instance = getCurrentInstance()

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)

/** 画布 id / canvas-id，同页多实例靠它区分 */
const canvasId = useUid('je-poster')

/** DOM 预览的缩放比：设计稿 → 容器宽度 */
const scale = ref(1)
/** 绘制用的图片表（key = 地址；失败为 null，绘制时跳过） */
const imageMap = new Map<string, JeCanvasImage | null>()

/** 一份配置 → 一组绝对定位盒子；两种渲染模式与导出共用 */
const boxes = computed(() => resolvePoster(props.width, props.elements))

/*
 * 根节点高度用 padding-top 百分比撑开（相对包含块宽度），而不是 aspect-ratio：
 * 小程序端对 aspect-ratio 的支持不一致，padding 百分比两端都稳。
 * 子节点一律绝对定位，所以 rootStyle 里不写 aspectRatio。
 */
const rootStyle = computed(() => ({
  paddingTop: props.width > 0 ? `${(props.height / props.width) * 100}%` : '100%',
  borderRadius: props.radius > 0 ? `${props.radius}px` : undefined,
}))

const stageStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
  transform: `scale(${scale.value})`,
  borderRadius: props.radius > 0 ? `${props.radius}px` : undefined,
}))

const backgroundStyle = computed(() => {
  const fit = props.background.fit ?? 'cover'
  return {
    backgroundColor: props.background.color ?? 'transparent',
    backgroundImage: props.background.src ? `url("${props.background.src}")` : undefined,
    backgroundSize: fit === 'fill' ? '100% 100%' : fit,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
})

const boxStyle = (box: JePosterBox) => ({
  left: `${box.x}px`,
  top: `${box.y}px`,
  width: `${box.width}px`,
  height: `${box.height}px`,
  opacity: box.opacity,
})

const textStyle = (box: JePosterTextBox) => ({
  ...boxStyle(box),
  fontSize: `${box.fontSize}px`,
  fontWeight: box.fontWeight,
  fontFamily: box.fontFamily,
  color: box.color,
  textAlign: box.align,
})

const lineStyle = (box: JePosterTextBox) => ({
  height: `${box.lineHeightPx}px`,
  lineHeight: `${box.lineHeightPx}px`,
})

/** <image> 用 mode 代替 CSS 的 object-fit（H5 上 uni 会把它还原成 object-fit） */
const IMAGE_MODE: Record<string, string> = {
  fill: 'scaleToFill',
  contain: 'aspectFit',
  cover: 'aspectFill',
}

const imageMode = (element: JePosterImageElement) => IMAGE_MODE[element.fit ?? 'cover'] ?? 'aspectFill'

/**
 * 图片盒子：描边与圆角落在包裹层上 —— 小程序端 <image> 是原生组件，自身的 border / border-radius
 * 不可靠、还会盖住圆角。包裹层 overflow: hidden 会把内圈裁成「外圆角 − 描边宽」，
 * 与主库「先铺描边色再内缩画图」的口径一致。
 */
const imageBoxStyle = (box: JePosterImageBox): CSSProperties => {
  const border = Math.max(0, box.element.border?.width ?? 0)
  return {
    ...boxStyle(box),
    boxSizing: 'border-box',
    borderRadius: `${box.radius}px`,
    border: border > 0 ? `${border}px solid ${box.element.border?.color ?? '#ffffff'}` : undefined,
    overflow: 'hidden',
  }
}

/* ---------------------------------- 测量 ---------------------------------- */

interface MeasureResult {
  /** 真实 canvas 2d 节点（canvas 模式）；dom 模式为 null */
  node: JeCanvasNode | null
  /** 根节点 CSS 宽高 */
  width: number
  height: number
}

/** 模板 ref 在两端可能拿到组件实例，取真实 DOM 前先解包（H5 下就是元素本身） */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

// #ifdef H5
/** uni 的 <canvas> 在 H5 外面包了一层 <uni-canvas>，真实节点是它内部的 <canvas> */
const resolveH5Canvas = (): HTMLCanvasElement | null => {
  const host = pick(canvasRef.value)
  if (!host) return null
  if (host.tagName === 'CANVAS') return host as unknown as HTMLCanvasElement
  return (host.querySelector?.('canvas') as HTMLCanvasElement | null) ?? null
}
// #endif

/**
 * 量取根节点尺寸（canvas 模式同时取回真实 canvas 2d 节点）。
 * H5 同步读真实 DOM；小程序端没有 DOM，只能异步走 SelectorQuery，
 * 且 canvas 2d 节点必须 `fields({ node: true })` 才拿得到。
 */
const measure = (): Promise<MeasureResult> =>
  new Promise((resolve) => {
    // #ifdef H5
    {
      const root = pick(rootRef.value)
      const rect = root?.getBoundingClientRect()
      resolve({
        node: (resolveH5Canvas() as unknown as JeCanvasNode | null) ?? null,
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
      })
    }
    // #endif
    // #ifndef H5
    {
      const proxy = instance?.proxy
      if (!proxy) {
        resolve({ node: null, width: 0, height: 0 })
        return
      }
      if (props.mode === 'canvas') {
        uni
          .createSelectorQuery()
          .in(proxy)
          .select(`#${canvasId}`)
          .fields({ node: true, size: true }, (result) => {
            const info = (Array.isArray(result) ? result[0] : result) as {
              node?: JeCanvasNode
              width?: number
              height?: number
            } | null
            resolve({
              node: info?.node ?? null,
              width: info?.width ?? 0,
              height: info?.height ?? 0,
            })
          })
          .exec()
        return
      }
      uni
        .createSelectorQuery()
        .in(proxy)
        .select('.je-poster')
        .boundingClientRect((result) => {
          const rect = (Array.isArray(result) ? result[0] : result) as {
            width?: number
            height?: number
          } | null
          resolve({ node: null, width: rect?.width ?? 0, height: rect?.height ?? 0 })
        })
        .exec()
    }
    // #endif
  })

/* ---------------------------------- 绘制 ---------------------------------- */

/** 按需加载海报用到的全部图片（loadImage 自带缓存，重复调用很轻） */
const ensureImages = async (
  canvas: JeCanvasNode | null,
): Promise<Map<string, JeCanvasImage | null>> => {
  const missing = collectPosterImages(props.background, props.elements).filter(
    (src) => !imageMap.has(src),
  )
  if (missing.length) {
    const loaded = await Promise.all(
      missing.map(async (src) => [src, await loadImage(src, canvas)] as const),
    )
    for (const [src, image] of loaded) imageMap.set(src, image)
  }
  return imageMap
}

let renderToken = 0

/** Canvas 模式：按容器尺寸 × DPR 建位图，再按设计稿比例缩放上下文 */
const paint = async () => {
  if (props.mode !== 'canvas') return
  const token = (renderToken += 1)
  const result = await measure()
  if (token !== renderToken) return
  const target = result.node
  if (!target || result.width <= 0 || result.height <= 0) return

  const dpr = uni.getWindowInfo().pixelRatio || 1
  const outWidth = Math.max(1, Math.round(result.width * dpr))
  const outHeight = Math.max(1, Math.round(result.height * dpr))

  // 图片先加载好再改位图尺寸：await 期间旧帧还在，不会先闪一下空白
  const images = await ensureImages(target)
  if (token !== renderToken) return

  // 设置宽高会重置上下文状态，因此先定位图尺寸再取 ctx
  target.width = outWidth
  target.height = outHeight
  const ctx = target.getContext('2d') as CanvasRenderingContext2D | null
  if (!ctx) return

  // #ifdef H5
  // uni H5 的 canvas 组件会给 2d 上下文打 __hidpi__ 标记并改写一批绘制方法（坐标按 DPR 放大）。
  // 本组件自己按 DPR 缩放位图，必须关掉它，否则坐标会被放大两次。
  ;(ctx as unknown as { __hidpi__?: boolean }).__hidpi__ = false
  // #endif

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, outWidth, outHeight)
  ctx.scale(outWidth / props.width, outHeight / props.height)
  paintPoster(ctx, {
    width: props.width,
    height: props.height,
    background: props.background,
    boxes: boxes.value,
    images,
    host: pick(rootRef.value),
  })
}

/** DOM 预览：设计稿 → 容器宽度的缩放比 */
const updateScale = async () => {
  if (!props.width) return
  const { width } = await measure()
  scale.value = width > 0 ? width / props.width : 1
}

/** 渲染入口：canvas 模式重绘位图，dom 模式只更缩放比 */
const render = async () => {
  if (props.mode === 'canvas') {
    await paint()
    return
  }
  await updateScale()
}

/* ---------------------------------- 导出 ---------------------------------- */

/**
 * 离屏绘制一张海报位图（导出走这里，与预览同一条绘制链）。
 * H5 建离屏 DOM canvas 后 `toDataURL()`；小程序端建离屏 2d canvas 后 `canvasToTempFilePath()`，
 * 两端都返回字符串（H5 是 dataURL，小程序是临时文件路径）。
 */
const exportImage = async (options: JePosterExportOptions): Promise<string> => {
  const designWidth = props.width
  const designHeight = props.height
  const outWidth = Math.max(1, Math.round(options.width ?? designWidth))
  const outHeight = Math.max(
    1,
    Math.round(
      options.height ??
        (options.width ? (options.width / designWidth) * designHeight : designHeight),
    ),
  )

  // #ifdef H5
  {
    const canvas = document.createElement('canvas')
    canvas.width = outWidth
    canvas.height = outHeight
    const images = await ensureImages(null)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.scale(outWidth / designWidth, outHeight / designHeight)
    paintPoster(ctx, {
      width: designWidth,
      height: designHeight,
      background: props.background,
      boxes: boxes.value,
      images,
      host: pick(rootRef.value),
    })
    const type = options.type ?? 'image/png'
    return options.quality === undefined
      ? canvas.toDataURL(type)
      : canvas.toDataURL(type, options.quality)
  }
  // #endif
  // #ifndef H5
  {
    // 离屏 2d canvas 拿得到与显示画布同源的 ctx，绘制链一行不改
    const offscreen = uni.createOffscreenCanvas({ type: '2d', width: outWidth, height: outHeight })
    const node = offscreen as unknown as JeCanvasNode
    const images = await ensureImages(node)
    const ctx = node.getContext('2d')
    ctx.scale(outWidth / designWidth, outHeight / designHeight)
    paintPoster(ctx, {
      width: designWidth,
      height: designHeight,
      background: props.background,
      boxes: boxes.value,
      images,
      host: null,
    })
    return new Promise<string>((resolve) => {
      uni.canvasToTempFilePath(
        {
          canvas: offscreen,
          destWidth: outWidth,
          destHeight: outHeight,
          fileType: options.type === 'image/jpeg' ? 'jpg' : 'png',
          quality: options.quality,
          success: (result: { tempFilePath?: string }) => resolve(result?.tempFilePath ?? ''),
          fail: () => resolve(''),
        } as unknown as UniNamespace.CanvasToTempFilePathOptions,
        instance?.proxy,
      )
    })
  }
  // #endif
}

/** 导出并保存：H5 触发下载，小程序端存入相册（被拒绝时降级为预览） */
const download = async (
  filename = 'poster.png',
  options: JePosterExportOptions = {},
): Promise<void> => {
  const url = await exportImage(options)
  if (!url) return
  // #ifdef H5
  {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }
  // #endif
  // #ifndef H5
  {
    uni.saveImageToPhotosAlbum({
      filePath: url,
      fail: () => uni.previewImage({ urls: [url] }),
    })
  }
  // #endif
}

defineExpose({
  /** 导出为图片（默认 PNG）：H5 返回 dataURL，小程序端返回临时文件路径，均异步，失败返回空串 */
  toDataURL: (options: JePosterExportOptions = {}) => exportImage(options),
  /** 导出并触发保存：H5 下载文件，小程序端存入相册，filename 缺省 poster.png */
  download,
})

/* -------------------------------- 生命周期 -------------------------------- */

/** 插槽只在 DOM 预览里生效，canvas 模式给一次提示，避免「改了没反应」 */
const warnedSlots = new Set<string>()
const warnSlots = () => {
  if (props.mode !== 'canvas') return
  for (const element of props.elements) {
    const name = element.name
    if (!name || warnedSlots.has(name) || !slots[name]) continue
    warnedSlots.add(name)
    console.warn(
      `[JePoster] 具名插槽 "${name}" 只在 mode="dom" 的预览里生效，导出始终按 elements 配置绘制。`,
    )
  }
}

// #ifdef H5
let resizeObserver: ResizeObserver | null = null
// #endif

onMounted(() => {
  // #ifdef H5
  const root = pick(rootRef.value)
  if (root && typeof ResizeObserver !== 'undefined') {
    // 容器宽度变化会改变位图尺寸与预览缩放比，必须重绘（否则位图被拉伸变糊）
    resizeObserver = new ResizeObserver(() => void render())
    resizeObserver.observe(root)
  }
  // #endif
  warnSlots()
  void render()
})

onBeforeUnmount(() => {
  // #ifdef H5
  resizeObserver?.disconnect()
  resizeObserver = null
  // #endif
  // 让在途绘制作废，避免卸载后往已销毁的画布上画
  renderToken += 1
})

watch(
  [
    () => props.width,
    () => props.height,
    () => props.background,
    () => props.elements,
    () => props.mode,
  ],
  async () => {
    await nextTick()
    warnSlots()
    void render()
  },
  { flush: 'post', deep: true },
)
</script>

<template>
  <view
    ref="rootRef"
    class="je-poster"
    :class="`je-poster--${mode}`"
    :style="rootStyle"
    :aria-label="label"
  >
    <canvas
      v-if="mode === 'canvas'"
      ref="canvasRef"
      :id="canvasId"
      :canvas-id="canvasId"
      type="2d"
      class="je-poster__canvas"
    />
    <view v-else class="je-poster__stage" :style="stageStyle">
      <view class="je-poster__bg" :style="backgroundStyle" />
      <template v-for="box in boxes" :key="box.key">
        <view v-if="box.kind === 'text'" class="je-poster__text" :style="textStyle(box)">
          <view
            v-for="(line, index) in box.lines"
            :key="index"
            class="je-poster__line"
            :style="lineStyle(box)"
          >
            {{ line }}
          </view>
        </view>
        <view v-else-if="box.kind === 'image'" class="je-poster__box" :style="imageBoxStyle(box)">
          <slot v-if="box.name && slots[box.name]" :name="box.name" />
          <image
            v-else
            class="je-poster__image"
            :src="box.element.src"
            :mode="imageMode(box.element)"
          />
        </view>
        <view v-else class="je-poster__box" :style="boxStyle(box)">
          <slot v-if="box.name && slots[box.name]" :name="box.name" />
          <je-qrcode
            v-else
            class="je-poster__qrcode"
            :value="box.element.value"
            :size="box.width"
            :level="box.element.level"
            :margin="box.element.margin"
            :color="box.element.color ?? '#000000'"
            :background="box.element.background ?? '#ffffff'"
            :shape="box.element.shape"
            :gradient="box.element.gradient"
            :gradient-angle="box.element.gradientAngle"
            :icon="box.element.icon"
          />
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped>
/* 高度由 rootStyle 的 padding-top 百分比撑开（相对包含块宽度），子节点一律绝对定位 */
.je-poster {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
}

.je-poster__canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.je-poster__stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  overflow: hidden;
}

.je-poster__bg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.je-poster__box,
.je-poster__text {
  position: absolute;
}

/* 断行已由布局解析器算好，这里不再让渲染层重新折行 */
.je-poster__text {
  overflow: hidden;
  white-space: pre;
}

.je-poster__line {
  display: block;
  overflow: hidden;
}

.je-poster__image {
  display: block;
  width: 100%;
  height: 100%;
}

.je-poster__qrcode {
  display: block;
}
</style>
