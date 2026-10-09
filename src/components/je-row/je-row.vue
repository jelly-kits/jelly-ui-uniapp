<script setup lang="ts">
import { computed, provide } from 'vue'
import { jeRowKey, type JeGutter, type JeRowAlign, type JeRowJustify } from './types'

defineOptions({ name: 'JeRow' })

const props = withDefaults(
  defineProps<{
    gutter?: JeGutter
    justify?: JeRowJustify
    align?: JeRowAlign
    wrap?: boolean
    /**
     * 渲染标签，默认 div。
     * 小程序不支持动态组件（<component :is>），这里只按语义分两类：
     * 默认 div 归 block 的 view，span 归 inline 的 text。
     */
    tag?: string
  }>(),
  { gutter: 0, justify: 'start', align: 'top', wrap: true, tag: 'div' },
)

/** 小程序不支持 <component :is="...">，改为静态双分支 */
const isInline = computed(() => props.tag === 'span')

const JUSTIFY: Record<JeRowJustify, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  'space-around': 'space-around',
  'space-between': 'space-between',
  'space-evenly': 'space-evenly',
}

const ALIGN: Record<JeRowAlign, string> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
  stretch: 'stretch',
}

/** 把 gutter 原样下发，由 Col 减半成左右内边距 */
provide(jeRowKey, computed(() => props.gutter))

const style = computed(() => {
  const { gutter } = props
  const horizontal = Array.isArray(gutter) ? (gutter[0] ?? 0) : gutter
  const vertical = Array.isArray(gutter) ? (gutter[1] ?? 0) : 0

  return {
    justifyContent: JUSTIFY[props.justify],
    alignItems: ALIGN[props.align],
    flexWrap: props.wrap ? ('wrap' as const) : ('nowrap' as const),
    // 负 margin 抵消子项内边距，保证首尾与容器对齐
    marginLeft: horizontal ? `${-horizontal / 2}px` : undefined,
    marginRight: horizontal ? `${-horizontal / 2}px` : undefined,
    rowGap: vertical ? `${vertical}px` : undefined,
  }
})
</script>

<template>
  <view v-if="!isInline" class="je-row" :style="style"><slot /></view>
  <text v-else class="je-row" :style="style"><slot /></text>
</template>

<style scoped>
.je-row {
  display: flex;
  box-sizing: border-box;
  width: 100%;
}
</style>
