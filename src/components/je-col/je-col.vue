<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeCol 是 .je-row 的 flex 子项，靠自身根节点的百分比宽度（span/offset）决定列宽。
   * 小程序自定义组件默认会多包一层宿主节点，flex 子项变成宿主，百分比宽度与被 JeRow
   * 下发的内边距都落不到子项上，栅格会按内容宽度排布。声明 virtualHost 后宿主不再生成盒子。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { jeRowKey } from '../je-row/types'
import type { JeResponsiveValue } from './types'

defineOptions({ name: 'JeCol' })

const props = withDefaults(
  defineProps<{
    span?: number
    offset?: number
    push?: number
    pull?: number
    xs?: JeResponsiveValue
    sm?: JeResponsiveValue
    md?: JeResponsiveValue
    lg?: JeResponsiveValue
    xl?: JeResponsiveValue
    /**
     * 渲染标签，默认 div。
     * 小程序不支持动态组件（<component :is>），这里只按语义分两类：
     * 默认 div 归 block 的 view，span 归 inline 的 text。
     */
    tag?: string
  }>(),
  { span: 24, offset: 0, push: 0, pull: 0, tag: 'div' },
)

/** 小程序不支持 <component :is="...">，改为静态双分支 */
const isInline = computed(() => props.tag === 'span')

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const gutter = inject(jeRowKey, null)

/** 只取水平间距，垂直间距由 Row 的 row-gap 负责 */
const horizontalGutter = computed(() => {
  const value = gutter?.value
  if (value === undefined) return 0
  return Array.isArray(value) ? (value[0] ?? 0) : value
})

const clampSpan = (value: number) => Math.min(24, Math.max(1, Math.round(value)))
const clampOffset = (value: number) => Math.min(24, Math.max(0, Math.round(value)))

const spanClass = computed(() => `je-col--span-${clampSpan(props.span)}`)

const offsetClass = computed(() =>
  props.offset ? `je-col--offset-${clampOffset(props.offset)}` : '',
)

/** 响应式类名：.je-col--md-12 / .je-col--md-offset-4，样式在各断点 @media 里 */
const responsiveClass = computed(() => {
  const classes: string[] = []
  BREAKPOINTS.forEach((breakpoint) => {
    const value = props[breakpoint]
    if (value === undefined) return
    if (typeof value === 'number') {
      classes.push(`je-col--${breakpoint}-${clampSpan(value)}`)
      return
    }
    if (typeof value.span === 'number') {
      classes.push(`je-col--${breakpoint}-${clampSpan(value.span)}`)
    }
    if (typeof value.offset === 'number') {
      classes.push(`je-col--${breakpoint}-offset-${clampOffset(value.offset)}`)
    }
  })
  return classes
})

const colClass = computed(() => [spanClass.value, offsetClass.value, ...responsiveClass.value])

const style = computed(() => {
  const horizontal = horizontalGutter.value
  const shifted = Boolean(props.push || props.pull)

  return {
    paddingLeft: horizontal ? `${horizontal / 2}px` : undefined,
    paddingRight: horizontal ? `${horizontal / 2}px` : undefined,
    position: shifted ? ('relative' as const) : undefined,
    left: props.push ? `${(props.push / 24) * 100}%` : undefined,
    right: props.pull ? `${(props.pull / 24) * 100}%` : undefined,
  }
})
</script>

<template>
  <view v-if="!isInline" class="je-col" :class="colClass" :style="style"><slot /></view>
  <text v-else class="je-col" :class="colClass" :style="style"><slot /></text>
</template>

<style scoped>
.je-col {
  box-sizing: border-box;
  min-width: 0;
}

/* ---- 基础栅格：span 1~24 ---- */
.je-col--span-1 { width: 4.16666667%; }
.je-col--span-2 { width: 8.33333333%; }
.je-col--span-3 { width: 12.5%; }
.je-col--span-4 { width: 16.66666667%; }
.je-col--span-5 { width: 20.83333333%; }
.je-col--span-6 { width: 25%; }
.je-col--span-7 { width: 29.16666667%; }
.je-col--span-8 { width: 33.33333333%; }
.je-col--span-9 { width: 37.5%; }
.je-col--span-10 { width: 41.66666667%; }
.je-col--span-11 { width: 45.83333333%; }
.je-col--span-12 { width: 50%; }
.je-col--span-13 { width: 54.16666667%; }
.je-col--span-14 { width: 58.33333333%; }
.je-col--span-15 { width: 62.5%; }
.je-col--span-16 { width: 66.66666667%; }
.je-col--span-17 { width: 70.83333333%; }
.je-col--span-18 { width: 75%; }
.je-col--span-19 { width: 79.16666667%; }
.je-col--span-20 { width: 83.33333333%; }
.je-col--span-21 { width: 87.5%; }
.je-col--span-22 { width: 91.66666667%; }
.je-col--span-23 { width: 95.83333333%; }
.je-col--span-24 { width: 100%; }

/* ---- 基础偏移：offset 1~24 ---- */
.je-col--offset-1 { margin-left: 4.16666667%; }
.je-col--offset-2 { margin-left: 8.33333333%; }
.je-col--offset-3 { margin-left: 12.5%; }
.je-col--offset-4 { margin-left: 16.66666667%; }
.je-col--offset-5 { margin-left: 20.83333333%; }
.je-col--offset-6 { margin-left: 25%; }
.je-col--offset-7 { margin-left: 29.16666667%; }
.je-col--offset-8 { margin-left: 33.33333333%; }
.je-col--offset-9 { margin-left: 37.5%; }
.je-col--offset-10 { margin-left: 41.66666667%; }
.je-col--offset-11 { margin-left: 45.83333333%; }
.je-col--offset-12 { margin-left: 50%; }
.je-col--offset-13 { margin-left: 54.16666667%; }
.je-col--offset-14 { margin-left: 58.33333333%; }
.je-col--offset-15 { margin-left: 62.5%; }
.je-col--offset-16 { margin-left: 66.66666667%; }
.je-col--offset-17 { margin-left: 70.83333333%; }
.je-col--offset-18 { margin-left: 75%; }
.je-col--offset-19 { margin-left: 79.16666667%; }
.je-col--offset-20 { margin-left: 83.33333333%; }
.je-col--offset-21 { margin-left: 87.5%; }
.je-col--offset-22 { margin-left: 91.66666667%; }
.je-col--offset-23 { margin-left: 95.83333333%; }
.je-col--offset-24 { margin-left: 100%; }

/* ---- xs：< 768px ---- */
@media (max-width: 767px) {
  .je-col--xs-1 { width: 4.16666667%; }
  .je-col--xs-2 { width: 8.33333333%; }
  .je-col--xs-3 { width: 12.5%; }
  .je-col--xs-4 { width: 16.66666667%; }
  .je-col--xs-5 { width: 20.83333333%; }
  .je-col--xs-6 { width: 25%; }
  .je-col--xs-7 { width: 29.16666667%; }
  .je-col--xs-8 { width: 33.33333333%; }
  .je-col--xs-9 { width: 37.5%; }
  .je-col--xs-10 { width: 41.66666667%; }
  .je-col--xs-11 { width: 45.83333333%; }
  .je-col--xs-12 { width: 50%; }
  .je-col--xs-13 { width: 54.16666667%; }
  .je-col--xs-14 { width: 58.33333333%; }
  .je-col--xs-15 { width: 62.5%; }
  .je-col--xs-16 { width: 66.66666667%; }
  .je-col--xs-17 { width: 70.83333333%; }
  .je-col--xs-18 { width: 75%; }
  .je-col--xs-19 { width: 79.16666667%; }
  .je-col--xs-20 { width: 83.33333333%; }
  .je-col--xs-21 { width: 87.5%; }
  .je-col--xs-22 { width: 91.66666667%; }
  .je-col--xs-23 { width: 95.83333333%; }
  .je-col--xs-24 { width: 100%; }

  .je-col--xs-offset-1 { margin-left: 4.16666667%; }
  .je-col--xs-offset-2 { margin-left: 8.33333333%; }
  .je-col--xs-offset-3 { margin-left: 12.5%; }
  .je-col--xs-offset-4 { margin-left: 16.66666667%; }
  .je-col--xs-offset-5 { margin-left: 20.83333333%; }
  .je-col--xs-offset-6 { margin-left: 25%; }
  .je-col--xs-offset-7 { margin-left: 29.16666667%; }
  .je-col--xs-offset-8 { margin-left: 33.33333333%; }
  .je-col--xs-offset-9 { margin-left: 37.5%; }
  .je-col--xs-offset-10 { margin-left: 41.66666667%; }
  .je-col--xs-offset-11 { margin-left: 45.83333333%; }
  .je-col--xs-offset-12 { margin-left: 50%; }
  .je-col--xs-offset-13 { margin-left: 54.16666667%; }
  .je-col--xs-offset-14 { margin-left: 58.33333333%; }
  .je-col--xs-offset-15 { margin-left: 62.5%; }
  .je-col--xs-offset-16 { margin-left: 66.66666667%; }
  .je-col--xs-offset-17 { margin-left: 70.83333333%; }
  .je-col--xs-offset-18 { margin-left: 75%; }
  .je-col--xs-offset-19 { margin-left: 79.16666667%; }
  .je-col--xs-offset-20 { margin-left: 83.33333333%; }
  .je-col--xs-offset-21 { margin-left: 87.5%; }
  .je-col--xs-offset-22 { margin-left: 91.66666667%; }
  .je-col--xs-offset-23 { margin-left: 95.83333333%; }
  .je-col--xs-offset-24 { margin-left: 100%; }
}

/* ---- sm：≥ 768px ---- */
@media (min-width: 768px) {
  .je-col--sm-1 { width: 4.16666667%; }
  .je-col--sm-2 { width: 8.33333333%; }
  .je-col--sm-3 { width: 12.5%; }
  .je-col--sm-4 { width: 16.66666667%; }
  .je-col--sm-5 { width: 20.83333333%; }
  .je-col--sm-6 { width: 25%; }
  .je-col--sm-7 { width: 29.16666667%; }
  .je-col--sm-8 { width: 33.33333333%; }
  .je-col--sm-9 { width: 37.5%; }
  .je-col--sm-10 { width: 41.66666667%; }
  .je-col--sm-11 { width: 45.83333333%; }
  .je-col--sm-12 { width: 50%; }
  .je-col--sm-13 { width: 54.16666667%; }
  .je-col--sm-14 { width: 58.33333333%; }
  .je-col--sm-15 { width: 62.5%; }
  .je-col--sm-16 { width: 66.66666667%; }
  .je-col--sm-17 { width: 70.83333333%; }
  .je-col--sm-18 { width: 75%; }
  .je-col--sm-19 { width: 79.16666667%; }
  .je-col--sm-20 { width: 83.33333333%; }
  .je-col--sm-21 { width: 87.5%; }
  .je-col--sm-22 { width: 91.66666667%; }
  .je-col--sm-23 { width: 95.83333333%; }
  .je-col--sm-24 { width: 100%; }

  .je-col--sm-offset-1 { margin-left: 4.16666667%; }
  .je-col--sm-offset-2 { margin-left: 8.33333333%; }
  .je-col--sm-offset-3 { margin-left: 12.5%; }
  .je-col--sm-offset-4 { margin-left: 16.66666667%; }
  .je-col--sm-offset-5 { margin-left: 20.83333333%; }
  .je-col--sm-offset-6 { margin-left: 25%; }
  .je-col--sm-offset-7 { margin-left: 29.16666667%; }
  .je-col--sm-offset-8 { margin-left: 33.33333333%; }
  .je-col--sm-offset-9 { margin-left: 37.5%; }
  .je-col--sm-offset-10 { margin-left: 41.66666667%; }
  .je-col--sm-offset-11 { margin-left: 45.83333333%; }
  .je-col--sm-offset-12 { margin-left: 50%; }
  .je-col--sm-offset-13 { margin-left: 54.16666667%; }
  .je-col--sm-offset-14 { margin-left: 58.33333333%; }
  .je-col--sm-offset-15 { margin-left: 62.5%; }
  .je-col--sm-offset-16 { margin-left: 66.66666667%; }
  .je-col--sm-offset-17 { margin-left: 70.83333333%; }
  .je-col--sm-offset-18 { margin-left: 75%; }
  .je-col--sm-offset-19 { margin-left: 79.16666667%; }
  .je-col--sm-offset-20 { margin-left: 83.33333333%; }
  .je-col--sm-offset-21 { margin-left: 87.5%; }
  .je-col--sm-offset-22 { margin-left: 91.66666667%; }
  .je-col--sm-offset-23 { margin-left: 95.83333333%; }
  .je-col--sm-offset-24 { margin-left: 100%; }
}

/* ---- md：≥ 992px ---- */
@media (min-width: 992px) {
  .je-col--md-1 { width: 4.16666667%; }
  .je-col--md-2 { width: 8.33333333%; }
  .je-col--md-3 { width: 12.5%; }
  .je-col--md-4 { width: 16.66666667%; }
  .je-col--md-5 { width: 20.83333333%; }
  .je-col--md-6 { width: 25%; }
  .je-col--md-7 { width: 29.16666667%; }
  .je-col--md-8 { width: 33.33333333%; }
  .je-col--md-9 { width: 37.5%; }
  .je-col--md-10 { width: 41.66666667%; }
  .je-col--md-11 { width: 45.83333333%; }
  .je-col--md-12 { width: 50%; }
  .je-col--md-13 { width: 54.16666667%; }
  .je-col--md-14 { width: 58.33333333%; }
  .je-col--md-15 { width: 62.5%; }
  .je-col--md-16 { width: 66.66666667%; }
  .je-col--md-17 { width: 70.83333333%; }
  .je-col--md-18 { width: 75%; }
  .je-col--md-19 { width: 79.16666667%; }
  .je-col--md-20 { width: 83.33333333%; }
  .je-col--md-21 { width: 87.5%; }
  .je-col--md-22 { width: 91.66666667%; }
  .je-col--md-23 { width: 95.83333333%; }
  .je-col--md-24 { width: 100%; }

  .je-col--md-offset-1 { margin-left: 4.16666667%; }
  .je-col--md-offset-2 { margin-left: 8.33333333%; }
  .je-col--md-offset-3 { margin-left: 12.5%; }
  .je-col--md-offset-4 { margin-left: 16.66666667%; }
  .je-col--md-offset-5 { margin-left: 20.83333333%; }
  .je-col--md-offset-6 { margin-left: 25%; }
  .je-col--md-offset-7 { margin-left: 29.16666667%; }
  .je-col--md-offset-8 { margin-left: 33.33333333%; }
  .je-col--md-offset-9 { margin-left: 37.5%; }
  .je-col--md-offset-10 { margin-left: 41.66666667%; }
  .je-col--md-offset-11 { margin-left: 45.83333333%; }
  .je-col--md-offset-12 { margin-left: 50%; }
  .je-col--md-offset-13 { margin-left: 54.16666667%; }
  .je-col--md-offset-14 { margin-left: 58.33333333%; }
  .je-col--md-offset-15 { margin-left: 62.5%; }
  .je-col--md-offset-16 { margin-left: 66.66666667%; }
  .je-col--md-offset-17 { margin-left: 70.83333333%; }
  .je-col--md-offset-18 { margin-left: 75%; }
  .je-col--md-offset-19 { margin-left: 79.16666667%; }
  .je-col--md-offset-20 { margin-left: 83.33333333%; }
  .je-col--md-offset-21 { margin-left: 87.5%; }
  .je-col--md-offset-22 { margin-left: 91.66666667%; }
  .je-col--md-offset-23 { margin-left: 95.83333333%; }
  .je-col--md-offset-24 { margin-left: 100%; }
}

/* ---- lg：≥ 1200px ---- */
@media (min-width: 1200px) {
  .je-col--lg-1 { width: 4.16666667%; }
  .je-col--lg-2 { width: 8.33333333%; }
  .je-col--lg-3 { width: 12.5%; }
  .je-col--lg-4 { width: 16.66666667%; }
  .je-col--lg-5 { width: 20.83333333%; }
  .je-col--lg-6 { width: 25%; }
  .je-col--lg-7 { width: 29.16666667%; }
  .je-col--lg-8 { width: 33.33333333%; }
  .je-col--lg-9 { width: 37.5%; }
  .je-col--lg-10 { width: 41.66666667%; }
  .je-col--lg-11 { width: 45.83333333%; }
  .je-col--lg-12 { width: 50%; }
  .je-col--lg-13 { width: 54.16666667%; }
  .je-col--lg-14 { width: 58.33333333%; }
  .je-col--lg-15 { width: 62.5%; }
  .je-col--lg-16 { width: 66.66666667%; }
  .je-col--lg-17 { width: 70.83333333%; }
  .je-col--lg-18 { width: 75%; }
  .je-col--lg-19 { width: 79.16666667%; }
  .je-col--lg-20 { width: 83.33333333%; }
  .je-col--lg-21 { width: 87.5%; }
  .je-col--lg-22 { width: 91.66666667%; }
  .je-col--lg-23 { width: 95.83333333%; }
  .je-col--lg-24 { width: 100%; }

  .je-col--lg-offset-1 { margin-left: 4.16666667%; }
  .je-col--lg-offset-2 { margin-left: 8.33333333%; }
  .je-col--lg-offset-3 { margin-left: 12.5%; }
  .je-col--lg-offset-4 { margin-left: 16.66666667%; }
  .je-col--lg-offset-5 { margin-left: 20.83333333%; }
  .je-col--lg-offset-6 { margin-left: 25%; }
  .je-col--lg-offset-7 { margin-left: 29.16666667%; }
  .je-col--lg-offset-8 { margin-left: 33.33333333%; }
  .je-col--lg-offset-9 { margin-left: 37.5%; }
  .je-col--lg-offset-10 { margin-left: 41.66666667%; }
  .je-col--lg-offset-11 { margin-left: 45.83333333%; }
  .je-col--lg-offset-12 { margin-left: 50%; }
  .je-col--lg-offset-13 { margin-left: 54.16666667%; }
  .je-col--lg-offset-14 { margin-left: 58.33333333%; }
  .je-col--lg-offset-15 { margin-left: 62.5%; }
  .je-col--lg-offset-16 { margin-left: 66.66666667%; }
  .je-col--lg-offset-17 { margin-left: 70.83333333%; }
  .je-col--lg-offset-18 { margin-left: 75%; }
  .je-col--lg-offset-19 { margin-left: 79.16666667%; }
  .je-col--lg-offset-20 { margin-left: 83.33333333%; }
  .je-col--lg-offset-21 { margin-left: 87.5%; }
  .je-col--lg-offset-22 { margin-left: 91.66666667%; }
  .je-col--lg-offset-23 { margin-left: 95.83333333%; }
  .je-col--lg-offset-24 { margin-left: 100%; }
}

/* ---- xl：≥ 1920px ---- */
@media (min-width: 1920px) {
  .je-col--xl-1 { width: 4.16666667%; }
  .je-col--xl-2 { width: 8.33333333%; }
  .je-col--xl-3 { width: 12.5%; }
  .je-col--xl-4 { width: 16.66666667%; }
  .je-col--xl-5 { width: 20.83333333%; }
  .je-col--xl-6 { width: 25%; }
  .je-col--xl-7 { width: 29.16666667%; }
  .je-col--xl-8 { width: 33.33333333%; }
  .je-col--xl-9 { width: 37.5%; }
  .je-col--xl-10 { width: 41.66666667%; }
  .je-col--xl-11 { width: 45.83333333%; }
  .je-col--xl-12 { width: 50%; }
  .je-col--xl-13 { width: 54.16666667%; }
  .je-col--xl-14 { width: 58.33333333%; }
  .je-col--xl-15 { width: 62.5%; }
  .je-col--xl-16 { width: 66.66666667%; }
  .je-col--xl-17 { width: 70.83333333%; }
  .je-col--xl-18 { width: 75%; }
  .je-col--xl-19 { width: 79.16666667%; }
  .je-col--xl-20 { width: 83.33333333%; }
  .je-col--xl-21 { width: 87.5%; }
  .je-col--xl-22 { width: 91.66666667%; }
  .je-col--xl-23 { width: 95.83333333%; }
  .je-col--xl-24 { width: 100%; }

  .je-col--xl-offset-1 { margin-left: 4.16666667%; }
  .je-col--xl-offset-2 { margin-left: 8.33333333%; }
  .je-col--xl-offset-3 { margin-left: 12.5%; }
  .je-col--xl-offset-4 { margin-left: 16.66666667%; }
  .je-col--xl-offset-5 { margin-left: 20.83333333%; }
  .je-col--xl-offset-6 { margin-left: 25%; }
  .je-col--xl-offset-7 { margin-left: 29.16666667%; }
  .je-col--xl-offset-8 { margin-left: 33.33333333%; }
  .je-col--xl-offset-9 { margin-left: 37.5%; }
  .je-col--xl-offset-10 { margin-left: 41.66666667%; }
  .je-col--xl-offset-11 { margin-left: 45.83333333%; }
  .je-col--xl-offset-12 { margin-left: 50%; }
  .je-col--xl-offset-13 { margin-left: 54.16666667%; }
  .je-col--xl-offset-14 { margin-left: 58.33333333%; }
  .je-col--xl-offset-15 { margin-left: 62.5%; }
  .je-col--xl-offset-16 { margin-left: 66.66666667%; }
  .je-col--xl-offset-17 { margin-left: 70.83333333%; }
  .je-col--xl-offset-18 { margin-left: 75%; }
  .je-col--xl-offset-19 { margin-left: 79.16666667%; }
  .je-col--xl-offset-20 { margin-left: 83.33333333%; }
  .je-col--xl-offset-21 { margin-left: 87.5%; }
  .je-col--xl-offset-22 { margin-left: 91.66666667%; }
  .je-col--xl-offset-23 { margin-left: 95.83333333%; }
  .je-col--xl-offset-24 { margin-left: 100%; }
}
</style>
