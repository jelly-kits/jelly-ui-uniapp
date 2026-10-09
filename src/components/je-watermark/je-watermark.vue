<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  watch,
  type CSSProperties,
} from 'vue'
import type { JeWatermarkContent } from './types'

defineOptions({ name: 'JeWatermark' })

const props = withDefaults(
  defineProps<{
    /** 水印文字：单个字符串或字符串数组（多行） */
    content?: JeWatermarkContent
    /** 图片水印地址，给值时优先于文字水印 */
    image?: string
    /** 单个水印本体宽度 */
    width?: number
    /** 单个水印本体高度 */
    height?: number
    /** 旋转角度（deg） */
    rotate?: number
    /** 水平间距 */
    gapX?: number
    /** 垂直间距 */
    gapY?: number
    /** 文字字号 */
    fontSize?: number
    /** 水印颜色，留空则跟随当前正文色（明暗主题下都可见） */
    color?: string
    /** 水印层层级 */
    zIndex?: number
  }>(),
  {
    content: () => ['Jelly UI'],
    image: '',
    width: 120,
    height: 64,
    rotate: -22,
    gapX: 100,
    gapY: 100,
    fontSize: 14,
    color: '',
    zIndex: 9,
  },
)

/** 跟随正文色时铺开的透明度（H5 与小程序两端同一口径） */
const FOLLOW_ALPHA = 0.22

const rootRef = ref<HTMLElement | null>(null)

/** 内容统一成数组，逐行居中绘制 */
const lines = computed(() => {
  const value = props.content
  const list = Array.isArray(value) ? value : [value]
  return list.filter((line) => line !== '')
})

/** 单个平铺块的尺寸 = 水印本体 + 间距 */
const tileWidth = computed(() => props.width + props.gapX)
const tileHeight = computed(() => props.height + props.gapY)

/* ------------------------------- H5：离屏 canvas ------------------------------- */
// #ifdef H5
/** 画好的平铺块 dataURL，交给 background-image 平铺 */
const watermarkUrl = ref('')

/** 未指定颜色时的兜底：一套中性灰，明暗背景上都留得住痕迹 */
const FALLBACK_COLOR = 'rgb(128, 138, 158)'
const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif'

/** 图片加载缓存：同一地址只请求一次，失败项剔除以便重试 */
const imageCache = new Map<string, Promise<HTMLImageElement | null>>()

/** 远程 / 跨域图片自动带 crossOrigin；失败 resolve(null) 由调用方降级成文字水印 */
const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  const cached = imageCache.get(src)
  if (cached) return cached
  const task = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()
    if (/^https?:\/\//i.test(src)) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => {
      imageCache.delete(src)
      resolve(null)
    }
    image.src = src
  })
  imageCache.set(src, task)
  return task
}

/** 模板 ref 在 H5 下拿到的是 uni-view 组件实例，真实 DOM 挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/** 解析成 canvas 能吃的颜色：显式 color 优先，否则由宿主的正文色降低透明度得到 */
const resolveColor = (): string => {
  if (props.color) return props.color
  const host = pick(rootRef.value)
  const inherited = host ? getComputedStyle(host).color : FALLBACK_COLOR
  const channels = inherited.match(/rgba?\(([^)]+)\)/)
  if (!channels) return FALLBACK_COLOR
  const [r, g, b] = channels[1].split(',').slice(0, 3).map((part) => part.trim())
  return `rgba(${r}, ${g}, ${b}, ${FOLLOW_ALPHA})`
}

/** 建好画布并铺上公共的 DPR 缩放与旋转 */
const createSurface = () => {
  const ratio = window.devicePixelRatio || 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(tileWidth.value * ratio))
  canvas.height = Math.max(1, Math.round(tileHeight.value * ratio))

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.scale(ratio, ratio)
  ctx.translate(tileWidth.value / 2, tileHeight.value / 2)
  ctx.rotate((props.rotate * Math.PI) / 180)
  return { canvas, ctx }
}

/** 跨域图片可能导致画布被污染，取不到 dataURL 时直接放弃水印 */
const commit = (canvas: HTMLCanvasElement) => {
  try {
    watermarkUrl.value = canvas.toDataURL('image/png')
  } catch {
    watermarkUrl.value = ''
  }
}

const paintText = () => {
  if (lines.value.length === 0) {
    watermarkUrl.value = ''
    return
  }

  const surface = createSurface()
  if (!surface) return
  const { canvas, ctx } = surface

  ctx.fillStyle = resolveColor()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${props.fontSize}px ${FONT_FAMILY}`

  const lineHeight = props.fontSize * 1.4
  const offsetY = -((lines.value.length - 1) * lineHeight) / 2
  lines.value.forEach((line, index) => {
    ctx.fillText(line, 0, offsetY + index * lineHeight)
  })

  commit(canvas)
}

const paintImage = (image: HTMLImageElement) => {
  const surface = createSurface()
  if (!surface) return
  const { canvas, ctx } = surface

  ctx.drawImage(image, -props.width / 2, -props.height / 2, props.width, props.height)
  commit(canvas)
}

/** 图片水印异步加载：失败（含跨域被拒）时退回文字水印，不让整块水印消失 */
const paint = async () => {
  const src = props.image
  if (!src) {
    paintText()
    return
  }

  const image = await loadImage(src)
  // 加载期间 image 又变了，丢弃这次结果
  if (src !== props.image) return
  if (image) paintImage(image)
  else paintText()
}

let observer: ResizeObserver | null = null

const layerStyle = computed(() => ({
  zIndex: props.zIndex,
  backgroundImage: watermarkUrl.value ? `url("${watermarkUrl.value}")` : undefined,
  backgroundSize: `${tileWidth.value}px ${tileHeight.value}px`,
}))
// #endif

/* --------------------------- 小程序：纯 view 网格平铺 --------------------------- */
// #ifndef H5
const instance = getCurrentInstance()

/** 水印层实测尺寸，用来算需要铺多少块 */
const layerSize = ref({ width: 0, height: 0 })

const columns = computed(() =>
  Math.max(1, Math.ceil(layerSize.value.width / tileWidth.value) + 1),
)
const rows = computed(() => Math.max(1, Math.ceil(layerSize.value.height / tileHeight.value) + 1))

/** 铺满整层的平铺块：绝对定位 + 块内旋转，靠外层 overflow: hidden 裁边（对齐 canvas 的裁剪口径） */
const tiles = computed(() => {
  if (!props.image && lines.value.length === 0) return []
  const tw = tileWidth.value
  const th = tileHeight.value
  const list: { key: string; style: CSSProperties }[] = []
  for (let row = 0; row < rows.value; row++) {
    for (let col = 0; col < columns.value; col++) {
      list.push({
        key: `${row}-${col}`,
        style: {
          left: `${col * tw}px`,
          top: `${row * th}px`,
          width: `${tw}px`,
          height: `${th}px`,
        },
      })
    }
  }
  return list
})

const markStyle = computed<CSSProperties>(() => ({
  transform: `rotate(${props.rotate}deg)`,
  // 未显式给色时跟随正文色（继承当前 color），再整体降到与 H5 一致的透明度
  opacity: props.image || props.color ? 1 : FOLLOW_ALPHA,
}))

const imageStyle = computed<CSSProperties>(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}))

const linesStyle = computed<CSSProperties>(() => ({
  fontSize: `${props.fontSize}px`,
  lineHeight: `${props.fontSize * 1.4}px`,
}))

/*
 * 小程序端没有 DOM，量不到容器尺寸就不知道要铺多少块，只能用选区查询量根节点。
 * 量到的是「当前」尺寸，插槽内容异步变高后靠 onUpdated 再量（仅在尺寸真的变化时写回，
 * 避免「测量 → 重渲染 → 再测量」互相触发）。
 */
let measuring = false
const measure = () => {
  if (measuring || !instance?.proxy) return
  measuring = true
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-watermark')
    .boundingClientRect()
    .exec((res) => {
      measuring = false
      const rect = res?.[0] as unknown as
        | { width?: number; height?: number }
        | null
        | undefined
      if (!rect) return
      const width = rect.width ?? 0
      const height = rect.height ?? 0
      if (
        Math.abs(width - layerSize.value.width) < 0.5 &&
        Math.abs(height - layerSize.value.height) < 0.5
      ) {
        return
      }
      layerSize.value = { width, height }
    })
}

onUpdated(() => measure())
// #endif

/* ------------------------------- 渲染与生命周期 ------------------------------- */

/** 渲染总入口：体内按端分派——H5 走离屏 canvas，小程序走纯 view 网格 */
const render = () => {
  // #ifdef H5
  void paint()
  // #endif
  // #ifndef H5
  measure()
  // #endif
}

onMounted(() => {
  render()
  // #ifdef H5
  const host = pick(rootRef.value)
  if (typeof ResizeObserver !== 'undefined' && host) {
    // 主库只有 ResizeObserver、并无 MutationObserver：宿主尺寸 / 主题色变化时重取正文色重绘
    observer = new ResizeObserver(() => void paint())
    observer.observe(host)
  }
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  observer?.disconnect()
  observer = null
  // #endif
})

watch(
  () => [
    props.content,
    props.image,
    props.width,
    props.height,
    props.rotate,
    props.gapX,
    props.gapY,
    props.fontSize,
    props.color,
  ],
  () => render(),
)
</script>

<template>
  <view ref="rootRef" class="je-watermark">
    <!-- #ifdef H5 -->
    <!-- 离屏 canvas 生成的平铺图直接当 background-image 铺满 -->
    <view class="je-watermark__layer" :style="layerStyle" aria-hidden="true" />
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <!-- 小程序端没有 DOM canvas：用绝对定位的重复 view 网格平铺，每块一个旋转的水印单元 -->
    <view class="je-watermark__layer" :style="{ zIndex: zIndex }" aria-hidden="true">
      <view
        v-for="tile in tiles"
        :key="tile.key"
        class="je-watermark__tile"
        :style="tile.style"
      >
        <view class="je-watermark__mark" :style="markStyle">
          <image
            v-if="image"
            class="je-watermark__image"
            :src="image"
            mode="aspectFit"
            :style="imageStyle"
          />
          <view v-else class="je-watermark__lines" :style="linesStyle">
            <text
              v-for="(line, index) in lines"
              :key="index"
              class="je-watermark__line"
            >{{ line }}</text>
          </view>
        </view>
      </view>
    </view>
    <!-- #endif -->

    <view class="je-watermark__content">
      <slot />
    </view>
  </view>
</template>

<style scoped>
.je-watermark {
  position: relative;
  box-sizing: border-box;
  font-family: inherit;
}

/* 水印层盖住内容但完全不吃事件，下方内容仍可正常交互 */
.je-watermark__layer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-repeat: repeat;
  pointer-events: none;
}

.je-watermark__content {
  position: relative;
}

/* #ifndef H5 */
/* 小程序端：外层裁边，块内一个旋转单元；每块自身也裁边，对齐离屏 canvas 的边界裁剪口径 */
.je-watermark__layer {
  overflow: hidden;
}

.je-watermark__tile {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.je-watermark__mark {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.je-watermark__image {
  display: block;
}

.je-watermark__lines {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.je-watermark__line {
  text-align: center;
  white-space: nowrap;
}
/* #endif */
</style>
