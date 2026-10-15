<script setup lang="ts">
import { computed } from 'vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeSegmentedOption } from './types'

defineOptions({ name: 'JeSegmented' })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    options: JeSegmentedOption[]
    disabled?: boolean
    /** 撑满父级宽度 */
    block?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  /*
   * options 虽然必传，但小程序端 props 是在首次 render 之后才注入的，
   * 不给默认值的话首帧会拿到 undefined，findIndex / length 直接抛 TypeError。
   */
  { modelValue: null, options: () => [], disabled: false, block: false, size: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-segmented--${size.value}`))

const activeIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue),
)

const thumbStyle = computed(() => ({
  width: `calc((100% - 8px) / ${props.options.length || 1})`,
  opacity: activeIndex.value < 0 ? '0' : '1',
  transform: `translateX(${Math.max(0, activeIndex.value) * 100}%)`,
}))

const select = (option: JeSegmentedOption) => {
  if (props.disabled || option.disabled) return
  if (option.value !== props.modelValue) emit('update:modelValue', option.value)
}

/** 方向键在当前可选项之间移动 */
const move = (step: number) => {
  const count = props.options.length
  if (count === 0) return
  const base = activeIndex.value < 0 ? -1 : activeIndex.value
  let next = base
  for (let i = 0; i < count; i += 1) {
    next = (next + step + count) % count
    const option = props.options[next]
    if (option && !option.disabled) {
      select(option)
      return
    }
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  }
}
</script>

<template>
  <div
    class="je-segmented"
    :class="[sizeClass, { 'is-disabled': disabled, 'is-block': block }]"
    role="radiogroup"
    @keydown="onKeydown"
  >
    <span class="je-segmented__thumb" :style="thumbStyle" aria-hidden="true" />

    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="je-segmented__item"
      :class="{ 'is-active': option.value === modelValue }"
      role="radio"
      :aria-checked="option.value === modelValue"
      :disabled="disabled || option.disabled"
      @click="select(option)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.je-segmented {
  position: relative;
  /*
   * 用 flex 而不是 inline-grid：小程序端 grid 的兼容性不如 flex 稳，而且各格等分、
   * 能随容器一起被压缩，才保证选中滑块（宽度 = 容器宽 / 份数）始终与格子对齐。
   */
  display: inline-flex;
  box-sizing: border-box;
  /* 定高 44px，与 je-input / je-select 同一档；内边距是滑块相对外框的内缩 */
  height: var(--je-touch-h);
  padding: 4px;
  font-family: inherit;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
}

/* 尺寸三档：只覆盖高度 / 左右内边距 / 字号，配色、圆角、滑块都沿用基础样式。
   滑块（.je-segmented__thumb）用的是 top/bottom 内缩，不用改 */
.je-segmented--small {
  height: var(--je-touch-h-sm);
}

.je-segmented--small .je-segmented__item {
  padding: 0 12px;
  font-size: 13px;
}

.je-segmented--large {
  height: var(--je-touch-h-lg);
}

.je-segmented--large .je-segmented__item {
  padding: 0 20px;
  font-size: 15px;
}

.je-segmented.is-block {
  display: flex;
  width: 100%;
}

/* 选中态滑块：位移用带过冲的缓动，切换时有轻微果冻感 */
.je-segmented__thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-radius: calc(var(--je-radius) - 4px);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--je-primary) 40%, transparent);
  transition: transform 0.36s var(--je-ease-out-back), opacity 0.2s ease;
  pointer-events: none;
}

.je-segmented__item {
  position: relative;
  z-index: 1;
  /* 各格等分容器宽度；min-width: 0 才能真正被压缩到等宽 */
  flex: 1 1 0;
  min-width: 0;
  /* 高度由外层定死（44px），这里只留左右内边距。
     原生 button 自带 line-height: 2.55，不显式压掉会把格子撑高，所以这里也写明行高 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  line-height: 1.4;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--je-text-muted);
  white-space: nowrap;
  background: none;
  border: none;
  border-radius: calc(var(--je-radius) - 4px);
  cursor: pointer;
  outline: none;
  transition: color 0.25s ease;
}

.je-segmented__item.is-active {
  /* 选中项压在同位移的渐变滑块上，固定浅色 */
  color: var(--je-text-on-color);
}

.je-segmented__item:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-segmented__item:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-segmented.is-disabled {
  opacity: 0.6;
}

/*
 * 窄屏：不再给每格固定最小宽度。容器经常会被父级压窄（例如放在单元格右侧 62% 宽的内容区里），
 * 固定最小宽度会让整条溢出、并且选中滑块的宽度算不回格子宽度（滑块与文字错位）。
 * 改成各格等分容器宽度，同时把内边距和字号收一点，四五个选项也能在一行里放下。
 */
@media (max-width: 768px) {
  .je-segmented {
    max-width: 100%;
  }

  .je-segmented__item {
    padding: 0 8px;
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-segmented__thumb {
    transition: none;
  }
}
</style>
