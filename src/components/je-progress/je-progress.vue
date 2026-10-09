<script setup lang="ts">
import { computed } from 'vue'
import type { JeProgressStatus, JeProgressType } from './types'
import { useUid } from '../../core/useUid'

defineOptions({ name: 'JeProgress' })

const props = withDefaults(
  defineProps<{
    /** 当前进度（0 ~ 100，超出自动收敛） */
    percentage: number
    /** line 线性 / circle 环形 */
    type?: JeProgressType
    /** 线宽，line 为高度、circle 为环宽 */
    strokeWidth?: number
    /** 自定义进度色，留空则使用品牌渐变 */
    color?: string
    /** 是否显示百分比文案 */
    showText?: boolean
    /** 状态色，优先级高于 color */
    status?: JeProgressStatus
    /** 条纹填充 */
    striped?: boolean
    /** 条纹滚动 */
    animated?: boolean
    /** 不确定进度：无限滑动，忽略 percentage */
    indeterminate?: boolean
  }>(),
  {
    type: 'line',
    strokeWidth: 8,
    color: '',
    showText: true,
    status: '',
    striped: false,
    animated: false,
    indeterminate: false,
  },
)

const uid = useUid('je-progress')
const gradientId = `je-progress-grad-${uid}`

const clamped = computed(() => {
  const value = Number.isFinite(props.percentage) ? props.percentage : 0
  return Math.min(100, Math.max(0, value))
})

/** 状态色优先，其次自定义色，都没有才回落到品牌渐变 */
const barColor = computed(() => {
  if (props.status === 'success') return 'var(--je-success)'
  if (props.status === 'warning') return 'var(--je-warning)'
  if (props.status === 'danger') return 'var(--je-danger)'
  return props.color || ''
})

const STRIPES = 'repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0 10px, transparent 10px 20px)'
const GRADIENT = 'linear-gradient(135deg, var(--je-primary), var(--je-primary-end))'

const fillStyle = computed(() => {
  const style: Record<string, string> = {
    width: props.indeterminate ? '40%' : `${clamped.value}%`,
  }
  if (props.striped) {
    // 条纹叠在底色 / 渐变之上
    style.backgroundImage = barColor.value ? STRIPES : `${STRIPES}, ${GRADIENT}`
    if (barColor.value) style.backgroundColor = barColor.value
  } else if (barColor.value) {
    style.backgroundColor = barColor.value
  } else {
    style.backgroundImage = GRADIENT
  }
  return style
})

/** 环形半径与周长：SVG 视图盒固定 100×100（H5 分支用） */
const radius = computed(() => (100 - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - clamped.value / 100))

/**
 * 小程序端渲染不了内联 <svg>，环形改用 conic-gradient 画弧 + radial-gradient 遮罩挖空圆心。
 * 弧长取 clamped%（与 H5 的 stroke-dashoffset 等价），无自定义色时同样走「主色 → 主色末端」的扫掠渐变。
 * strokeWidth 在 H5 里是 viewBox 单位（满径 100），换算到 CSS 的径向遮罩上即「射线的 2×strokeWidth%」：
 * farthest-side 的射线长恰为半个盒子，所以 8 会挖掉 16% 的射线，正好等于盒宽的 8%。
 */
const ringStyle = computed(() => {
  const deg = clamped.value * 3.6
  const background = barColor.value
    ? `conic-gradient(${barColor.value} 0 ${deg}deg, var(--je-surface) ${deg}deg)`
    : `conic-gradient(var(--je-primary) 0deg, var(--je-primary-end) ${deg}deg, var(--je-surface) ${deg}deg)`
  const hole = `calc(100% - ${props.strokeWidth * 2}%)`
  const mask = `radial-gradient(farthest-side, transparent ${hole}, #000 ${hole})`
  return {
    background,
    '-webkit-mask-image': mask,
    'mask-image': mask,
  }
})
</script>

<template>
  <div
    class="je-progress"
    :class="[
      `je-progress--${type}`,
      {
        'is-indeterminate': indeterminate,
        'is-striped': striped,
        'is-animated': animated,
      },
    ]"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="indeterminate ? undefined : clamped"
  >
    <template v-if="type === 'line'">
      <div class="je-progress__bar" :style="{ height: `${strokeWidth}px` }">
        <div class="je-progress__fill" :style="fillStyle" />
      </div>
      <span v-if="showText" class="je-progress__text">{{ clamped }}%</span>
    </template>

    <div v-else class="je-progress__ring">
      <!-- #ifdef H5 -->
      <svg class="je-progress__svg" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
            <stop class="je-progress__stop-start" offset="0%" />
            <stop class="je-progress__stop-end" offset="100%" />
          </linearGradient>
        </defs>
        <circle
          class="je-progress__track"
          cx="50"
          cy="50"
          :r="radius"
          fill="none"
          :stroke-width="strokeWidth"
        />
        <circle
          class="je-progress__meter"
          cx="50"
          cy="50"
          :r="radius"
          fill="none"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          :stroke="barColor || `url(#${gradientId})`"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <!-- #endif -->

      <!-- #ifndef H5 -->
      <view class="je-progress__svg je-progress__svg--ring" :style="ringStyle" />
      <!-- #endif -->

      <span v-if="showText" class="je-progress__text je-progress__text--inner">
        {{ clamped }}%
      </span>
    </div>
  </div>
</template>

<style scoped>
.je-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: inherit;
  color: var(--je-text-muted);
}

.je-progress--line {
  width: 100%;
}

.je-progress__bar {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  background: var(--je-surface);
  border-radius: 999px;
}

.je-progress__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.36s var(--je-ease-out-back), background-color 0.3s ease;
}

/* 不确定进度：定宽小块来回滑动 */
.je-progress.is-indeterminate .je-progress__fill {
  transition: none;
  animation: je-progress-slide 1.4s ease-in-out infinite;
}

/* 条纹滚动 */
.je-progress.is-striped.is-animated .je-progress__fill {
  animation: je-progress-stripes 1s linear infinite;
}

.je-progress__text {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--je-text);
}

.je-progress__ring {
  position: relative;
  width: 120px;
  height: 120px;
}

.je-progress__svg {
  display: block;
  width: 100%;
  height: 100%;
}

/*
 * 小程序端的环形（conic-gradient 画弧 + radial-gradient 遮罩挖圆心）。
 * 遮罩用的是 farthest-side，圆的半径只到「盒子的边」，四个角落在渐变结束点之外，
 * 会被填成遮罩的最后一个颜色（#000，即完全不透明）——少了这一步裁切，
 * 环的外轮廓就是方的。所以必须自己把盒子裁成圆。
 */
.je-progress__svg--ring {
  border-radius: 50%;
}

.je-progress__track {
  stroke: var(--je-surface);
}

.je-progress__meter {
  transition: stroke-dashoffset 0.4s var(--je-ease-out-back), stroke 0.3s ease;
}

.je-progress__stop-start {
  stop-color: var(--je-primary);
}

.je-progress__stop-end {
  stop-color: var(--je-primary-end);
}

.je-progress__text--inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

/* 环形的文字压在环心，字号随容器自适应 */
.je-progress--circle {
  display: inline-flex;
}

/* 环形不确定态：整体旋转，配合固定长度的弧 */
.je-progress--circle.is-indeterminate .je-progress__svg {
  animation: je-progress-rotate 1.2s linear infinite;
}

@keyframes je-progress-slide {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(250%);
  }
}

@keyframes je-progress-stripes {
  from {
    background-position: 0 0;
  }

  to {
    background-position: 28px 0;
  }
}

@keyframes je-progress-rotate {
  to {
    transform: rotate(360deg);
  }
}

/* 窄屏：文本可与进度条换行，字号自适应 */
@media (max-width: 768px) {
  .je-progress--line {
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .je-progress__text {
    margin-left: auto;
    font-size: 13px;
  }

  .je-progress__ring {
    width: 96px;
    height: 96px;
  }

  .je-progress__text--inner {
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-progress__fill,
  .je-progress__meter {
    transition: none;
  }

  .je-progress.is-indeterminate .je-progress__fill,
  .je-progress.is-striped.is-animated .je-progress__fill,
  .je-progress--circle.is-indeterminate .je-progress__svg {
    animation: none;
  }
}
</style>
