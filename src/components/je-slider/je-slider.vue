<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'

defineOptions({ name: 'JeSlider' })

const props = withDefaults(
  defineProps<{
    /** 单值传 number，范围模式传 [起点, 终点] */
    modelValue?: number | number[]
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    showTooltip?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: 0,
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    showTooltip: true,
    size: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | number[]] }>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-slider--${size.value}`))

/** 小程序端拿不到 DOM 引用，几何靠 SelectorQuery 量；H5 下才是真实元素 */
const trackRef = ref<HTMLElement | null>(null)
const instance = getCurrentInstance()

const dragging = ref(false)
const activeIndex = ref(0)

const isRange = computed(() => Array.isArray(props.modelValue))

const values = computed<number[]>(() =>
  Array.isArray(props.modelValue) ? [...props.modelValue] : [props.modelValue],
)

const decimals = computed(() => {
  const text = String(props.step)
  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
})

const round = (value: number) => {
  const factor = 10 ** decimals.value
  return Math.round(value * factor) / factor
}

const clamp = (value: number) => Math.min(props.max, Math.max(props.min, value))

const percent = (value: number) => {
  const span = props.max - props.min
  return span === 0 ? 0 : ((value - props.min) / span) * 100
}

const fillStyle = computed(() => {
  if (isRange.value) {
    const [start, end] = values.value
    return { left: `${percent(start)}%`, width: `${percent(end) - percent(start)}%` }
  }
  return { left: '0%', width: `${percent(values.value[0])}%` }
})

const tooltipValue = computed(() => values.value[activeIndex.value] ?? props.min)

const format = (value: number) => String(round(value))

/* ------------------------------------------------------------------ 几何换算 */

/**
 * 原库拖着拖动时用 getBoundingClientRect 把 clientX 换算成比例，小程序端没有 DOM。
 * H5 走真实元素、小程序端走 SelectorQuery，量到的都是「视口坐标系下的轨迹」，换算结果一致。
 */
const trackRect = ref({ left: 0, width: 0 })

const measureTrack = (after?: () => void) => {
  // #ifdef H5
  // H5 下 <view> 是组件，模板 ref 拿到的是组件实例，真实 DOM 挂在 $el 上
  const host = trackRef.value as unknown as
    | { $el?: HTMLElement; getBoundingClientRect?: () => DOMRect }
    | null
  const el = host?.$el ?? host
  const rect = el?.getBoundingClientRect?.()
  if (rect) trackRect.value = { left: rect.left, width: rect.width }
  after?.()
  // #endif
  // #ifndef H5
  if (instance?.proxy) {
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select('.je-slider__track')
      .boundingClientRect((result) => {
        const info = (Array.isArray(result) ? result[0] : result) as unknown as
          | { left?: number; width?: number }
          | undefined
        if (info && typeof info.left === 'number' && typeof info.width === 'number') {
          trackRect.value = { left: info.left, width: info.width }
        }
        after?.()
      })
      .exec()
  }
  // #endif
}

/** 挂载后先量一次，首次点击就能用上缓存几何（页面横向布局不变时它一直有效） */
onMounted(measureTrack)

const ratioFromClientX = (clientX: number) => {
  const { left, width } = trackRect.value
  if (!width) return 0
  return Math.min(1, Math.max(0, (clientX - left) / width))
}

const valueFromRatio = (ratio: number) => {
  const raw = props.min + ratio * (props.max - props.min)
  const stepped = Math.round((raw - props.min) / props.step) * props.step + props.min
  return round(clamp(stepped))
}

/** 写入某个把手：范围模式下不允许两个值交叉，避免拖拽时把手互相穿越 */
const setValueAt = (index: number, value: number) => {
  if (!isRange.value) {
    if (value !== props.modelValue) emit('update:modelValue', value)
    return
  }
  const next: number[] = [values.value[0], values.value[1]]
  if (index === 0) next[0] = Math.min(value, values.value[1])
  else next[1] = Math.max(value, values.value[0])
  if (next[0] !== values.value[0] || next[1] !== values.value[1]) emit('update:modelValue', next)
}

const nearestIndex = (value: number) => {
  if (!isRange.value) return 0
  const [start, end] = values.value
  return Math.abs(value - start) <= Math.abs(value - end) ? 0 : 1
}

/** 落点：先定「拖哪个把手」，再写值；首次按下与小程序端量完几何后的校正都用它 */
const commitAt = (clientX: number) => {
  const value = valueFromRatio(ratioFromClientX(clientX))
  const index = nearestIndex(value)
  activeIndex.value = index
  setValueAt(index, value)
}

/** 拖动中：把手锁定为按下时选中的那个，不做重新就近判定 */
const moveTo = (clientX: number) => {
  setValueAt(activeIndex.value, valueFromRatio(ratioFromClientX(clientX)))
}

/* --------------------------------------------------------------- 平台事件适配 */

const endDrag = () => {
  dragging.value = false
}

/*
  H5 侧走「鼠标 + 触摸」两条原生通道：按下在热区上收，移动 / 抬起挂到 document 上，
  这样鼠标划出轨迹范围后仍能继续拖动。不依赖 pointerdown —— 部分 WebView 与自动化
  环境并不派发指针事件，只用指针通道会出现「点了没反应」。
*/
// #ifdef H5
const startDrag = (clientX: number) => {
  if (props.disabled) return
  // 按下时重量一次：页面滚动或窗口缩放后几何依然准确
  measureTrack()
  dragging.value = true
  commitAt(clientX)
}

const onMouseDown = (event: MouseEvent) => startDrag(event.clientX)

const onTouchStartH5 = (event: TouchEvent) => {
  const touch = event.touches?.[0]
  if (touch) startDrag(touch.clientX)
}

const onDocMouseMove = (event: MouseEvent) => {
  if (dragging.value) moveTo(event.clientX)
}

const onDocTouchMove = (event: TouchEvent) => {
  const touch = event.touches?.[0]
  if (dragging.value && touch) moveTo(touch.clientX)
}

onMounted(() => {
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchmove', onDocTouchMove)
  document.addEventListener('touchend', endDrag)
  document.addEventListener('touchcancel', endDrag)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchmove', onDocTouchMove)
  document.removeEventListener('touchend', endDrag)
  document.removeEventListener('touchcancel', endDrag)
})
// #endif

/** 触点横坐标：小程序的事件对象带 touches[0].clientX，退化成 detail.x */
const touchClientX = (event: TouchEvent) => {
  const touch = event.touches?.[0]
  if (touch) return touch.clientX
  return (event as unknown as { detail?: { x?: number } }).detail?.x ?? 0
}

const onTouchStart = (event: TouchEvent) => {
  if (props.disabled) return
  const clientX = touchClientX(event)
  dragging.value = true
  commitAt(clientX)
  // 小程序端的几何是异步量出来的（且开屏那一刻还没量过），量完用同一个触点再校正一次
  measureTrack(() => {
    if (dragging.value) commitAt(clientX)
  })
}

const onTouchMove = (event: TouchEvent) => {
  if (!dragging.value) return
  moveTo(touchClientX(event))
}

const onKeydown = (event: KeyboardEvent, index: number) => {
  if (props.disabled) return
  activeIndex.value = index
  const current = values.value[index]

  const commit = (value: number) => {
    event.preventDefault()
    setValueAt(index, round(clamp(value)))
  }

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      commit(current + props.step)
      break
    case 'ArrowLeft':
    case 'ArrowDown':
      commit(current - props.step)
      break
    case 'Home':
      commit(props.min)
      break
    case 'End':
      commit(props.max)
      break
  }
}
</script>

<template>
  <view class="je-slider" :class="[sizeClass, { 'is-disabled': disabled, 'is-range': isRange }]">
    <view ref="trackRef" class="je-slider__track">
      <view class="je-slider__fill" :style="fillStyle" />

      <!-- #ifdef H5 -->
      <button
        v-for="(value, index) in values"
        :key="`thumb-${index}`"
        type="button"
        class="je-slider__thumb"
        :class="{ 'is-active': dragging && activeIndex === index }"
        role="slider"
        :style="{ left: `${percent(value)}%` }"
        :disabled="disabled"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="value"
        :aria-label="isRange ? (index === 0 ? '最小值' : '最大值') : '数值'"
        @keydown="onKeydown($event, index)"
      />
      <!-- #endif -->

      <!-- #ifndef H5 -->
      <view
        v-for="(value, index) in values"
        :key="`thumb-${index}`"
        class="je-slider__thumb"
        :class="{ 'is-active': dragging && activeIndex === index }"
        :style="{ left: `${percent(value)}%` }"
      />
      <!-- #endif -->

      <view
        v-if="showTooltip && dragging"
        class="je-slider__tooltip"
        :style="{ left: `${percent(tooltipValue)}%` }"
        aria-hidden="true"
      >
        {{ format(tooltipValue) }}
      </view>
    </view>

    <!--
      透明的拖动热区层，盖在轨迹与把手上方：按下在这里收（H5 的移动 / 抬起挂在 document
      上，小程序端的移动 / 抬起仍在热区上）。条件编译只支持按整块元素取舍，所以只有这一层
      按平台写两遍，轨迹与把手保持单份。
    -->
    <!-- #ifdef H5 -->
    <view class="je-slider__hit" @mousedown="onMouseDown" @touchstart="onTouchStartH5" />
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <view
      class="je-slider__hit"
      @touchstart="onTouchStart"
      @touchmove.stop="onTouchMove"
      @touchend="endDrag"
      @touchcancel="endDrag"
    />
    <!-- #endif -->
  </view>
</template>

<style scoped>
.je-slider {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 0;
  font-family: inherit;
  touch-action: none;
  user-select: none;
}

.je-slider__track {
  position: relative;
  width: 100%;
  height: 6px;
  background: var(--je-surface);
  border-radius: 999px;
}

.je-slider__fill {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--je-primary), var(--je-primary-end));
  border-radius: 999px;
}

.je-slider__thumb {
  position: absolute;
  top: 50%;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  padding: 0;
  background: #fff;
  border: 2px solid var(--je-primary);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  outline: none;
  transform: translate(-50%, -50%);
  transition: transform 0.2s var(--je-ease-out-back);
}

/* 拖动中的把手放大一点，替代鼠标端的 :hover 反馈 */
.je-slider__thumb.is-active {
  transform: translate(-50%, -50%) scale(1.15);
}

.je-slider__thumb:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 3px;
}

.je-slider__tooltip {
  position: absolute;
  bottom: calc(100% + 12px);
  padding: 4px 8px;
  font-size: 12px;
  color: var(--je-text);
  background: var(--je-popup);
  border: var(--je-border);
  border-radius: 8px;
  transform: translateX(-50%);
  pointer-events: none;
  white-space: nowrap;
}

/* 热区层铺满整个根节点（含上下 12px 内边距），只为接事件、不参与绘制 */
.je-slider__hit {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.je-slider.is-disabled {
  opacity: 0.5;
}

/* 尺寸两档：轨道粗细与把手同步缩放。把手靠 translate(-50%, -50%) 居中，
   改宽高后依然垂直居中，无需另写定位；default 档即上面的基础样式 */
.je-slider--small .je-slider__track {
  height: 4px;
}

.je-slider--small .je-slider__thumb {
  width: 16px;
  height: 16px;
}

.je-slider--small .je-slider__tooltip {
  font-size: 11px;
}

.je-slider--large .je-slider__track {
  height: 8px;
}

.je-slider--large .je-slider__thumb {
  width: 24px;
  height: 24px;
}

.je-slider--large .je-slider__tooltip {
  font-size: 13px;
}

@media (max-width: 768px) {
  .je-slider__track {
    height: 8px;
  }

  .je-slider__thumb {
    width: 24px;
    height: 24px;
  }
}
</style>
