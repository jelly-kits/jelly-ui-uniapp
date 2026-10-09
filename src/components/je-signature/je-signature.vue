<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeSignature 的根节点是 width: 100% 的纵向 flex 容器，常作为页面 / 表单里的 flex 子项，
   * 靠自身根节点占满一行。小程序自定义组件默认会在外面多包一层宿主节点，flex 子项会变成宿主，
   * 根节点的宽度与纵向排列都落不到实处，故声明 virtualHost 让根节点直接参与父级排布。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUid } from '../../core/useUid'
import JeButton from '../je-button/je-button.vue'
import { useJeLocale } from '../je-locale'

defineOptions({ name: 'JeSignature' })

const props = withDefaults(
  defineProps<{
    /** 画笔颜色 */
    penColor?: string
    /** 画笔粗细，单位 px */
    lineWidth?: number
    /** 画布背景色，空字符串表示透明底 */
    backgroundColor?: string
    /** 画布高度，数字按 px 处理 */
    height?: number | string
    /** 禁用：不接收绘制 */
    disabled?: boolean
    /** 导出图片格式 */
    type?: 'png' | 'jpeg'
    /** 未书写时的提示文字，缺省取语言包 signature.tip */
    tips?: string
    /** 清空按钮文字，缺省取语言包 signature.clear */
    clearText?: string
    /** 撤销按钮文字，缺省取语言包 signature.undo */
    undoText?: string
    /** 是否显示底部工具栏 */
    showToolbar?: boolean
  }>(),
  {
    penColor: '#ffffff',
    lineWidth: 2,
    backgroundColor: '',
    height: 200,
    disabled: false,
    type: 'png',
    tips: undefined,
    clearText: undefined,
    undoText: undefined,
    showToolbar: true,
  },
)

const emit = defineEmits<{
  /** 开始一笔 */
  start: []
  /** 一笔结束 */
  end: []
  /** 存储变化时派发，回传画布是否为空，可用于判断能否提交 */
  change: [isEmpty: boolean]
  /** 画布被清空 */
  clear: []
}>()

const { t } = useJeLocale()
const instance = getCurrentInstance()

/** 模板 ref：H5 下 <canvas> 是内置组件，拿到的是组件实例，真实节点要再解一层 */
const wrapRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)

/** 画布的 id / canvas-id，同页多实例靠它区分（useUid 走模块级自增） */
const canvasId = useUid('je-signature')

const tipText = computed(() => props.tips ?? t('signature.tip'))
const clearLabel = computed(() => props.clearText ?? t('signature.clear'))
const undoLabel = computed(() => props.undoText ?? t('signature.undo'))

/** 尺寸类 prop：数字与纯数字字符串都补 px，%、em、calc() 原样透传 */
const toUnit = (value: number | string): string => {
  if (typeof value === 'number') return `${value}px`
  return /^-?\d+(\.\d+)?$/.test(value) ? `${value}px` : value
}
const heightStyle = computed(() => toUnit(props.height))

interface StrokePoint {
  x: number
  y: number
}

/**
 * 真实 canvas 节点：H5 是 HTMLCanvasElement，小程序端是 2d canvas 节点。
 * 两端绘制只用到 width / height / getContext('2d')，收口成同一个结构类型。
 */
interface JeCanvasNode {
  width: number
  height: number
  getContext: (type: '2d') => CanvasRenderingContext2D | null
}

let canvasNode: JeCanvasNode | null = null
/** 画布 CSS 尺寸与相对视口的左上角，重绘与坐标换算都按它们还原坐标系 */
let viewWidth = 0
let viewHeight = 0
let canvasLeft = 0
let canvasTop = 0
let dpr = 1

/** 历史笔画，只存坐标；重绘时用当前画笔参数描出来 */
const strokes = ref<StrokePoint[][]>([])
/** 画布为空：用于提示文字显隐与工具栏按钮禁用 */
const empty = computed(() => strokes.value.length === 0)

let current: StrokePoint[] | null = null
/** 最近一次触摸时间，用来忽略触屏浏览器补发的合成鼠标事件 */
let lastTouchAt = 0

/** 模板 ref 在小程序端可能是组件实例，取真实 DOM 前先解包（H5 下就是元素本身） */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/**
 * H5：uni 的 <canvas> 内置组件外面包了一层 <uni-canvas>，真实节点是它内部的 <canvas>；
 * 若宿主未包壳则直接就是 canvas 元素。
 */
const resolveH5Canvas = (): HTMLCanvasElement | null => {
  const host = pick(canvasRef.value)
  if (!host) return null
  if (host.tagName === 'CANVAS') return host as unknown as HTMLCanvasElement
  return (host.querySelector?.('canvas') as HTMLCanvasElement | null) ?? null
}

/**
 * 量取 canvas 节点的 CSS 尺寸与相对视口的左上角。
 * H5 同步读真实 DOM；小程序端没有 DOM，只能异步走 SelectorQuery 拿 2d 节点（rect + size 一次取齐）。
 */
const measureCanvas = (): Promise<void> =>
  new Promise((resolve) => {
    // #ifdef H5
    const h5Node = resolveH5Canvas()
    if (h5Node) {
      const rect = h5Node.getBoundingClientRect()
      canvasNode = h5Node as unknown as JeCanvasNode
      viewWidth = rect.width
      viewHeight = rect.height
      canvasLeft = rect.left
      canvasTop = rect.top
    }
    resolve()
    // #endif
    // #ifndef H5
    if (!instance?.proxy) {
      resolve()
      return
    }
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select(`#${canvasId}`)
      .fields({ node: true, size: true, rect: true }, (result) => {
        const info = (Array.isArray(result) ? result[0] : result) as
          | {
              node?: JeCanvasNode
              width?: number
              height?: number
              left?: number
              top?: number
            }
          | null
          | undefined
        if (info?.node) {
          canvasNode = info.node
          viewWidth = info.width ?? 0
          viewHeight = info.height ?? 0
          canvasLeft = info.left ?? 0
          canvasTop = info.top ?? 0
        }
        resolve()
      })
      .exec()
    // #endif
  })

/**
 * 取 2d 上下文：H5 与小程序端收口到同一个函数，体内条件编译分派，避免 TS2451。
 *
 * uni-app H5 的 <canvas> 内置组件会给 2d 上下文打上 __hidpi__ 标记，并全局改写一批绘制方法
 * （坐标按 pixelRatio 放大）。本组件自己按 DPR 缩放位图，必须把它关掉，否则坐标会被放大两次。
 */
const getCtx = (): CanvasRenderingContext2D | null => {
  const node = canvasNode
  if (!node) return null
  const ctx = node.getContext('2d')
  // #ifdef H5
  if (ctx) (ctx as unknown as { __hidpi__?: boolean }).__hidpi__ = false
  // #endif
  return ctx
}

/** 非空才铺底色，空字符串即透明 */
const paintBackground = (ctx: CanvasRenderingContext2D) => {
  if (!props.backgroundColor) return
  ctx.fillStyle = props.backgroundColor
  ctx.fillRect(0, 0, viewWidth, viewHeight)
}

/** 每次绘制前重置画笔样式，避免被上一次的调用污染 */
const applyBrush = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = props.penColor
  ctx.fillStyle = props.penColor
  ctx.lineWidth = props.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

/** 整屏重绘：尺寸变化 / 撤销 / 清空 / 改画笔参数时复用 */
const redraw = () => {
  const ctx = getCtx()
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, viewWidth, viewHeight)
  paintBackground(ctx)
  applyBrush(ctx)

  for (const stroke of strokes.value) {
    const first = stroke[0]
    if (!first) continue
    if (stroke.length === 1) {
      // 单点落笔也要可见，lineCap=round 画不出点，这里用圆填充
      ctx.beginPath()
      ctx.arc(first.x, first.y, Math.max(props.lineWidth / 2, 0.5), 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (let i = 1; i < stroke.length; i += 1) {
      const point = stroke[i]
      if (point) ctx.lineTo(point.x, point.y)
    }
    ctx.stroke()
  }
}

/** 设备像素比：H5 取 window.devicePixelRatio，小程序端从系统信息里取 */
const readDpr = (): number => {
  // #ifdef H5
  return (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1
  // #endif
  // #ifndef H5
  return uni.getWindowInfo().pixelRatio || 1
  // #endif
}

/** 按 CSS 尺寸与 DPR 重置画布位图，重置后必须重绘（设置宽高会清空上下文） */
const resizeCanvas = async () => {
  await measureCanvas()
  const node = canvasNode
  if (!node || viewWidth <= 0 || viewHeight <= 0) return
  dpr = readDpr()
  node.width = Math.round(viewWidth * dpr)
  node.height = Math.round(viewHeight * dpr)
  redraw()
}

/** 手势开始前刷新一次相对视口的边界（H5 同步；小程序端几何在初始化时量过，异步不重取） */
const refreshRect = () => {
  // #ifdef H5
  const node = resolveH5Canvas()
  if (node) {
    const rect = node.getBoundingClientRect()
    canvasLeft = rect.left
    canvasTop = rect.top
  }
  // #endif
}

const pointFrom = (clientX: number, clientY: number): StrokePoint => ({
  x: clientX - canvasLeft,
  y: clientY - canvasTop,
})

const beginStroke = (clientX: number, clientY: number) => {
  if (props.disabled || current) return
  current = [pointFrom(clientX, clientY)]
  strokes.value.push(current)
  // 单点落笔先整屏重绘一次，让圆点立刻出现
  redraw()
  emit('start')
}

const moveStroke = (clientX: number, clientY: number) => {
  if (!current) return
  const ctx = getCtx()
  if (!ctx) return
  const previous = current[current.length - 1]
  const point = pointFrom(clientX, clientY)
  current.push(point)
  if (!previous) return
  // 增量绘制：只补最后一段，长笔画也不卡
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  applyBrush(ctx)
  ctx.beginPath()
  ctx.moveTo(previous.x, previous.y)
  ctx.lineTo(point.x, point.y)
  ctx.stroke()
}

const endStroke = () => {
  if (!current) return
  current = null
  emit('end')
  emit('change', empty.value)
}

/* ------------------------------------------------------------ 输入通道 */

/** 触点坐标：uni 在 H5 与小程序两端的事件对象都带 touches / changedTouches */
type RawTouch = { clientX: number; clientY: number }

const firstTouch = (event: TouchEvent): RawTouch | null => {
  const list = event.touches ?? event.changedTouches
  const touch = list?.[0] as unknown as RawTouch | undefined
  return touch ?? null
}

const onTouchStart = (event: TouchEvent) => {
  lastTouchAt = Date.now()
  refreshRect()
  const touch = firstTouch(event)
  if (touch) beginStroke(touch.clientX, touch.clientY)
}

const onTouchMove = (event: TouchEvent) => {
  const touch = firstTouch(event)
  if (touch) moveStroke(touch.clientX, touch.clientY)
}

const onTouchEnd = () => endStroke()

/*
 * 桌面端鼠标通道：小程序端这些绑定永不触发，留着不影响编译。
 * 触屏浏览器在 touchend 后会补发一套合成鼠标事件，用 lastTouchAt 短暂忽略，避免重复落笔。
 *
 * 不走模板绑定：uni-app H5 会把内置组件上的 DOM 事件归一化成跨端事件对象，
 * 只保留 type / target / detail，clientX、clientY、button 都会丢，鼠标画不出线。
 * 因此 H5 下改成在 onMounted 里给真实 canvas 挂原生监听（见文件末尾）。
 */
const onMouseDown = (event: MouseEvent) => {
  if (Date.now() - lastTouchAt < 600) return
  // 只认左键
  if (event.button !== 0) return
  refreshRect()
  beginStroke(event.clientX, event.clientY)
}

const onMouseMove = (event: MouseEvent) => {
  if (Date.now() - lastTouchAt < 600) return
  moveStroke(event.clientX, event.clientY)
}

const onMouseUp = () => endStroke()

/* ------------------------------------------------------------ 受控方法 */

/** 撤销最后一笔后整屏重绘 */
const undo = () => {
  if (strokes.value.length === 0) return
  strokes.value.pop()
  current = null
  redraw()
  emit('change', empty.value)
}

/** 清空历史与画布 */
const clear = () => {
  strokes.value = []
  current = null
  redraw()
  emit('clear')
  emit('change', true)
}

/** 画布是否为空 */
const isEmpty = () => empty.value

/**
 * 导出图片：H5 返回 dataURL，小程序端返回临时文件路径（canvasToTempFilePath 是异步的，
 * 所以统一收口成 Promise）。不传则用 props.type。
 */
const exportImage = (type?: 'png' | 'jpeg'): Promise<string> => {
  const format = type ?? props.type
  // #ifdef H5
  const h5Canvas = canvasNode as unknown as HTMLCanvasElement | null
  if (!h5Canvas) return Promise.resolve('')
  if (format === 'png') return Promise.resolve(h5Canvas.toDataURL('image/png'))
  // jpeg 不支持透明，先铺一层底再导出，否则透明处会变黑
  const offscreen = document.createElement('canvas')
  offscreen.width = h5Canvas.width
  offscreen.height = h5Canvas.height
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return Promise.resolve(h5Canvas.toDataURL('image/jpeg'))
  offCtx.fillStyle = props.backgroundColor || '#ffffff'
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height)
  offCtx.drawImage(h5Canvas, 0, 0)
  return Promise.resolve(offscreen.toDataURL('image/jpeg'))
  // #endif
  // #ifndef H5
  return new Promise<string>((resolve) => {
    const node = canvasNode
    if (!node) {
      resolve('')
      return
    }
    const options = {
      canvasId,
      // 2d 节点走 canvas 字段，canvasId 仅作兜底（旧版 canvas-id 通道）
      canvas: node,
      fileType: format === 'jpeg' ? 'jpg' : 'png',
      // 导出位图按 DPR 还原，与预览同清晰度
      destWidth: Math.round(viewWidth * dpr),
      destHeight: Math.round(viewHeight * dpr),
      success: (result: { tempFilePath?: string }) => resolve(result?.tempFilePath ?? ''),
      fail: () => resolve(''),
    } as unknown as UniNamespace.CanvasToTempFilePathOptions
    uni.canvasToTempFilePath(options, instance?.proxy)
  })
  // #endif
}

/** 导出 dataURL / 临时文件路径，不传则用 props.type */
const toDataURL = (type?: 'png' | 'jpeg') => exportImage(type)

/** 一次性拿到空状态与导出图，便于父级提交 */
const getResult = async () => ({ isEmpty: empty.value, dataUrl: await exportImage() })

/** 导出为文件：H5 触发下载，小程序端存入相册（被拒绝时降级为预览） */
const download = async () => {
  const url = await exportImage()
  if (!url) return
  // #ifdef H5
  const link = document.createElement('a')
  link.href = url
  link.download = `signature-${Date.now()}.${props.type === 'jpeg' ? 'jpg' : 'png'}`
  link.click()
  // #endif
  // #ifndef H5
  uni.saveImageToPhotosAlbum({
    filePath: url,
    fail: () => uni.previewImage({ urls: [url] }),
  })
  // #endif
}

watch(
  () => [props.penColor, props.lineWidth, props.backgroundColor],
  () => redraw(),
)

// #ifdef H5
let observer: ResizeObserver | null = null
/** 挂了原生鼠标监听的 canvas 元素，卸载时按同一个引用解绑 */
let mouseHost: HTMLCanvasElement | null = null
const onDocMouseMove = (event: MouseEvent) => onMouseMove(event)
const onDocMouseUp = () => onMouseUp()
// #endif

onMounted(() => {
  void resizeCanvas()
  // #ifdef H5
  const host = pick(wrapRef.value)
  if (host && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => void resizeCanvas())
    observer.observe(host)
  }
  // 按下落在画布上，移动 / 抬起挂到 document：拖出画布后还能继续画
  mouseHost = resolveH5Canvas()
  mouseHost?.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  observer?.disconnect()
  observer = null
  mouseHost?.removeEventListener('mousedown', onMouseDown)
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
  mouseHost = null
  // #endif
})

defineExpose({
  /** 清空画布与笔画历史 */
  clear,
  /** 撤销最后一笔 */
  undo,
  /** 导出图片（H5 返回 dataURL，小程序端返回临时文件路径，异步） */
  toDataURL,
  /** 画布是否为空 */
  isEmpty,
  /** 导出结果 { isEmpty, dataUrl }，异步 */
  getResult,
})
</script>

<template>
  <view class="je-signature" :class="{ 'is-disabled': disabled }">
    <view ref="wrapRef" class="je-signature__board" :style="{ height: heightStyle }">
      <canvas
        ref="canvasRef"
        :id="canvasId"
        :canvas-id="canvasId"
        type="2d"
        class="je-signature__canvas"
        @touchstart="onTouchStart"
        @touchmove.stop.prevent="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      />
      <text v-if="empty" class="je-signature__tip">{{ tipText }}</text>
    </view>

    <view v-if="showToolbar" class="je-signature__toolbar">
      <JeButton
        size="small"
        variant="ghost"
        icon="undo"
        :disabled="disabled || empty"
        @tap="undo"
      >
        {{ undoLabel }}
      </JeButton>
      <JeButton
        size="small"
        variant="ghost"
        icon="trash"
        :disabled="disabled || empty"
        @tap="clear"
      >
        {{ clearLabel }}
      </JeButton>
      <JeButton
        size="small"
        variant="ghost"
        icon="download"
        :disabled="disabled || empty"
        @tap="download"
      >
        导出
      </JeButton>
    </view>

    <view v-if="$slots.footer" class="je-signature__footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<style scoped>
.je-signature {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  font-family: inherit;
}

.je-signature__board {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  /* 深色底衬，白色画笔在上面才看得清；canvas 透明处会透出这层 */
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  /* 画布是手势区，禁掉浏览器默认滚动 / 缩放手势（本组件唯一的例外） */
  touch-action: none;
}

.je-signature__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.je-signature__tip {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 0 12px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--je-text-faint);
  text-align: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
  user-select: none;
}

.je-signature__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.je-signature.is-disabled {
  opacity: 0.5;
}

.je-signature.is-disabled .je-signature__canvas {
  cursor: not-allowed;
  pointer-events: none;
}

@media (max-width: 768px) {
  .je-signature__toolbar :deep(.je-button) {
    flex: 1 1 0;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-signature__toolbar :deep(.je-button) {
    transition: none;
  }
}
</style>
