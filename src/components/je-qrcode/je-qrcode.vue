<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 小程序自定义组件默认会多包一层宿主节点。二维码常被父级 flex 居中，或按百分比宽高自适应，
   * 宿主节点会吃掉 flex 居中，也会让百分比宽高在「高度 auto 的宿主」里解析不出结果，
   * 二维码尺寸与居中位置就和 H5 对不上。声明 virtualHost 后宿主不再生成盒子。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { collectQrcodeRuns, gradientVector, QR_DOT_RADIUS, type JeQrcodeRun } from '../../core/canvas'
import { encodeQrcode } from '../../core/qrcode'
import type { JeQrcodeLevel, JeQrcodeRenderer, JeQrcodeShape, JeQrcodeSvgOptions } from './types'

defineOptions({ name: 'JeQrcode' })

const props = withDefaults(
  defineProps<{
    /** 要编码的文本，按 UTF-8 字节模式编码 */
    value: string
    /** 渲染边长，数字按 px 处理 */
    size?: number | string
    /** 纠错级别，越高越耐污损、可容纳的内容越少 */
    level?: JeQrcodeLevel
    /** 静区宽度，单位为模块数 */
    margin?: number
    /** 深色模块颜色，默认跟随当前文字颜色 */
    color?: string
    /** 背景色，默认透明 */
    background?: string
    /** 渲染方式，uni 端统一走 view 网格，svg / canvas 两个取值等价（保留仅供 API 兼容） */
    renderer?: JeQrcodeRenderer
    /** 深色模块形状：square 方块，dot 圆点（定位 / 校正 / 定时等结构模块恒为方块，保证可识别） */
    shape?: JeQrcodeShape
    /** 前景渐变色标，至少两个颜色；给值时覆盖 color */
    gradient?: string[]
    /** 前景渐变角度（度）：0 向上、90 向右、顺时针增大，默认 45 */
    gradientAngle?: number
    /** 中心 logo 图片地址，也可改用默认插槽自定义中心内容 */
    icon?: string
    /** 中心 logo 尺寸，数字按 px 处理；缺省为边长的 22% */
    iconSize?: number | string
    /** 无障碍描述，缺省用 value */
    label?: string
  }>(),
  {
    size: 160,
    level: 'M',
    margin: 2,
    color: 'currentColor',
    background: 'transparent',
    renderer: 'svg',
    shape: 'square',
    gradient: undefined,
    gradientAngle: 45,
    icon: undefined,
    iconSize: undefined,
    label: undefined,
  },
)

const slots = useSlots()

const encoded = computed(() => encodeQrcode({ value: props.value ?? '', level: props.level }))
const isDot = computed(() => props.shape === 'dot')
const offset = computed(() => Math.max(0, props.margin))

/** 含静区的总模块数（边长） */
const total = computed(() => {
  const result = encoded.value
  if (!result) return 0
  return result.size + offset.value * 2
})

/** 数字（含纯数字字符串）补 px，% / vw / calc 等原样透传 */
const toSize = (value: number | string | undefined, fallback: string): string => {
  if (value === undefined) return fallback
  if (typeof value === 'number') return `${value}px`
  return /^[\d.]+$/.test(value.trim()) ? `${value}px` : value
}

const rootStyle = computed(() => ({
  width: toSize(props.size, '160px'),
  height: toSize(props.size, '160px'),
  background: props.background,
}))

/** 保留 4 位小数，避免浮点误差把内联样式拉成一长串数字 */
const round = (value: number) => Math.round(value * 10000) / 10000

const nf = (value: number) => Math.round(value * 1000) / 1000

/* 用类型别名而不是 interface：interface 不参与隐式索引签名推导，绑到 :style 上会报 StyleValue 不兼容 */
type JeQrcodeBoxStyle = {
  left: string
  top: string
  width: string
  height: string
  backgroundColor?: string
  backgroundImage?: string
  backgroundSize?: string
  backgroundPosition?: string
  backgroundRepeat?: string
}

const gradientStops = computed(() =>
  Array.isArray(props.gradient) && props.gradient.length >= 2 ? props.gradient : null,
)

/**
 * 单块模块的定位与填充。
 *
 * **定位一律用百分比而不是像素**：坐标口径是「模块下标 ÷ 含静区的总模块数」，
 * size 传 % / vw / calc 这类非像素值时也算得对，不必去读 DOM 量渲染尺寸。
 *
 * **渐变按整幅连续铺开**：每块模块的背景图都被拉伸到「整幅二维码」那么大，再用
 * background-position 把它挪到当前模块该出现的位置 —— CSS 的百分比定位是按
 * 「图宽 − 盒宽」换算的，所以位移百分比 = −起点 ÷ (总模块数 − 盒宽)。
 * 这样几十上百个 view 拼出来的渐变与主库单条 SVG path 的观感一致（同一套 CSS 角度约定）。
 */
const boxStyle = (x: number, y: number, width: number, height: number): JeQrcodeBoxStyle => {
  const totalModules = total.value || 1
  const unit = 100 / totalModules
  const left = x + offset.value
  const top = y + offset.value
  const style: JeQrcodeBoxStyle = {
    left: `${round(left * unit)}%`,
    top: `${round(top * unit)}%`,
    width: `${round(width * unit)}%`,
    height: `${round(height * unit)}%`,
  }

  const stops = gradientStops.value
  // 整幅恰好被一块模块占满时（margin 为 0 且整行全深色）没有可挪动的余量，退回纯色
  if (stops && totalModules > width && totalModules > height) {
    style.backgroundImage = `linear-gradient(${props.gradientAngle ?? 45}deg, ${stops.join(', ')})`
    style.backgroundSize = `${round((totalModules / width) * 100)}% ${round((totalModules / height) * 100)}%`
    style.backgroundPosition =
      `${round((-left / (totalModules - width)) * 100)}% ` +
      `${round((-top / (totalModules - height)) * 100)}%`
    style.backgroundRepeat = 'no-repeat'
  } else {
    style.backgroundColor = props.color
  }
  return style
}

/**
 * 方块部分的连续段：square 形状下是全部深色模块；dot 形状下只保留功能模块
 * （定位 / 校正 / 定时 / 格式），它们必须保持方块才不破坏定位图案的 1:1:3:1:1 比例。
 */
const squareRuns = computed<JeQrcodeRun[]>(() => {
  const result = encoded.value
  if (!result) return []
  return collectQrcodeRuns(
    result,
    isDot.value ? (x, y) => result.isFunction[y][x] : () => true,
  )
})

/** 圆点部分：dot 形状下需要画成圆的数据模块 */
const dotModules = computed<Array<{ x: number; y: number }>>(() => {
  const result = encoded.value
  const list: Array<{ x: number; y: number }> = []
  if (!result || !isDot.value) return list
  for (let y = 0; y < result.size; y++) {
    const row = result.matrix[y]
    const fn = result.isFunction[y]
    for (let x = 0; x < result.size; x++) {
      if (row[x] && !fn[x]) list.push({ x, y })
    }
  }
  return list
})

/** 圆点直径占一个模块的比例，略小于 1 以留出点与点之间的缝隙（半径与绘制内核同源） */
const DOT_DIAMETER = QR_DOT_RADIUS * 2

const squareCells = computed(() =>
  squareRuns.value.map((run) => ({
    key: `${run.y}-${run.x}`,
    style: boxStyle(run.x, run.y, run.len, 1),
  })),
)

const dotCells = computed(() => {
  const inset = (1 - DOT_DIAMETER) / 2
  return dotModules.value.map((module) => ({
    key: `${module.y}-${module.x}`,
    style: boxStyle(module.x + inset, module.y + inset, DOT_DIAMETER, DOT_DIAMETER),
  }))
})

const hasCenter = computed(() => Boolean(props.icon) || Boolean(slots.default))

/** 中心 logo 的衬底：二维码靠浅色留白才易被识别，缺省用白色兜底 */
const centerBackground = computed(() =>
  props.background && props.background !== 'transparent' ? props.background : '#ffffff',
)

const centerStyle = computed(() => ({
  width: toSize(props.iconSize, '22%'),
  height: toSize(props.iconSize, '22%'),
  background: centerBackground.value,
}))

/* ---------------- SVG 字符串导出 ---------------- */

/** SVG 是 XML，属性值里的 & < > " 必须转义 */
const escapeAttr = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** 导出尺寸：显式 size 优先，缺省取 size 属性的数字值，再退到 160（百分比尺寸量不到，同样走兜底） */
const resolveExportSize = (size?: number) => {
  if (typeof size === 'number' && size > 0) return Math.round(size)
  return typeof props.size === 'number' && props.size > 0 ? Math.round(props.size) : 160
}

/** 中心 logo 在导出图里占的边长比例（与 CSS 里 iconSize 的口径对齐） */
const centerRatio = () => {
  const size = props.iconSize
  if (typeof size === 'number') {
    const rendered = resolveExportSize(undefined)
    return rendered ? size / rendered : 0.22
  }
  if (typeof size === 'string') {
    const px = /^([\d.]+)px$/.exec(size)
    if (px) {
      const rendered = resolveExportSize(undefined)
      return rendered ? parseFloat(px[1]) / rendered : 0.22
    }
    const percent = /^([\d.]+)%$/.exec(size)
    if (percent) return parseFloat(percent[1]) / 100
  }
  return 0.22
}

/** 前景 path：方块段 + 圆点段，坐标单位是模块（含静区偏移），viewBox 与之一致 */
const foregroundPathD = computed(() => {
  const shift = offset.value
  const squares = squareRuns.value
    .map((run) => `M${run.x + shift} ${run.y + shift}h${run.len}v1h-${run.len}z`)
    .join('')

  const radius = DOT_DIAMETER / 2
  const dots = dotModules.value
    .map(({ x, y }) => {
      const cx = x + shift + 0.5
      const cy = y + shift + 0.5
      return `M${nf(cx - radius)} ${nf(cy)}a${radius} ${radius} 0 1 0 ${nf(radius * 2)} 0a${radius} ${radius} 0 1 0 ${nf(-radius * 2)} 0z`
    })
    .join('')

  return squares + dots
})

/**
 * 组装自包含的 SVG 字符串（向量），可直接存盘或塞进 image / CSS 背景。
 *
 * uni 端没有 DOM，两处与主库不同：① 颜色不做解析，currentColor / var() 原样写入
 * （独立文件里会回落成黑色，需要精确颜色请显式传 color）；② 中心 logo 只有本身就是
 * data URL 时才会内联，其余情况导出的 SVG 不含 logo。
 */
const exportSVGString = async (options: JeQrcodeSvgOptions = {}): Promise<string> => {
  const result = encoded.value
  if (!result) return ''
  const totalModules = total.value || 1
  const size = resolveExportSize(options.size)
  const parts: string[] = []

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
      `viewBox="0 0 ${totalModules} ${totalModules}" role="img" ` +
      `aria-label="${escapeAttr(props.label ?? props.value)}" ` +
      `shape-rendering="${isDot.value ? 'geometricPrecision' : 'crispEdges'}">`,
  )

  const stops = gradientStops.value
  if (stops) {
    const { x: vx, y: vy } = gradientVector(props.gradientAngle ?? 45)
    const stopTags = stops
      .map((stop, index) => {
        const stopOffset = nf(index / (stops.length - 1))
        return `<stop offset="${stopOffset}" stop-color="${escapeAttr(stop)}"/>`
      })
      .join('')
    parts.push(
      `<defs><linearGradient id="je-qrcode-gradient" ` +
        `x1="${nf(0.5 - vx / 2)}" y1="${nf(0.5 - vy / 2)}" ` +
        `x2="${nf(0.5 + vx / 2)}" y2="${nf(0.5 + vy / 2)}">${stopTags}</linearGradient></defs>`,
    )
  }

  if (props.background && props.background !== 'transparent') {
    parts.push(
      `<rect x="0" y="0" width="${totalModules}" height="${totalModules}" fill="${escapeAttr(props.background)}"/>`,
    )
  }

  parts.push(
    `<path d="${foregroundPathD.value}" ` +
      `fill="${stops ? 'url(#je-qrcode-gradient)' : escapeAttr(props.color)}"/>`,
  )

  const icon = props.icon
  if (icon) {
    if (/^data:/i.test(icon)) {
      const center = totalModules * centerRatio()
      const inner = center * 0.8
      const start = nf((totalModules - center) / 2)
      const innerStart = nf((totalModules - center) / 2 + center * 0.1)
      parts.push(
        `<rect x="${start}" y="${start}" width="${nf(center)}" height="${nf(center)}" ` +
          `rx="${nf(center * 0.1)}" fill="${escapeAttr(centerBackground.value)}"/>`,
        `<image href="${escapeAttr(icon)}" x="${innerStart}" y="${innerStart}" ` +
          `width="${nf(inner)}" height="${nf(inner)}" preserveAspectRatio="xMidYMid meet"/>`,
      )
    } else {
      console.warn('[JeQrcode] 中心 logo 不是 data URL，小程序端读不到文件内容，导出的 SVG 将不含 logo。')
    }
  } else if (slots.default) {
    console.warn('[JeQrcode] 中心内容来自插槽，无法导出到 SVG；如需导出请改用 icon 属性。')
  }

  parts.push('</svg>')
  return parts.join('')
}

defineExpose({
  /**
   * 导出为自包含的 SVG 字符串（向量）。
   * 位图（PNG）导出需要 DOM canvas，小程序端没有，故不提供；要位图请在宿主侧自行绘制或走服务端。
   */
  toSVGString: (options: JeQrcodeSvgOptions = {}) => exportSVGString(options),
})
</script>

<template>
  <view
    class="je-qrcode"
    :class="{ 'is-empty': !encoded }"
    :style="rootStyle"
    role="img"
    :aria-label="label ?? value"
  >
    <view
      v-for="cell in squareCells"
      :key="cell.key"
      class="je-qrcode__module"
      :style="cell.style"
    />
    <view
      v-for="cell in dotCells"
      :key="cell.key"
      class="je-qrcode__module je-qrcode__module--dot"
      :style="cell.style"
    />

    <view v-if="hasCenter" class="je-qrcode__center" :style="centerStyle">
      <image
        v-if="!slots.default && icon"
        class="je-qrcode__icon"
        :src="icon"
        mode="aspectFit"
        alt=""
      />
      <slot v-else />
    </view>
  </view>
</template>

<style scoped>
.je-qrcode {
  position: relative;
  display: block;
  color: inherit;
}

/* 每块模块都是根节点的绝对定位子项，宽高走百分比（见脚本里的 boxStyle） */
.je-qrcode__module {
  position: absolute;
}

.je-qrcode__module--dot {
  border-radius: 50%;
}

/* 中心 logo 以叠加层呈现：支持 icon 属性，也支持插槽塞任意内容 */
.je-qrcode__center {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  border-radius: 6px;
}

.je-qrcode__icon {
  display: block;
  width: 80%;
  height: 80%;
}

/* 内容超出可编码上限时 encodeQrcode 返回 null，此时只剩静区，视觉上等价于空 */
.je-qrcode.is-empty {
  visibility: hidden;
}
</style>
