<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'JeSpace' })

const props = withDefaults(
  defineProps<{
    /** 排列方向 */
    direction?: 'horizontal' | 'vertical'
    /** 间距，数字按 px 处理；数组形式为 [主轴, 交叉轴] */
    size?: number | string | (number | string)[]
    /** 交叉轴对齐 */
    align?: 'start' | 'end' | 'center' | 'baseline'
    /** 主轴对齐 */
    justify?: 'start' | 'end' | 'center' | 'space-between' | 'space-around'
    /** 是否允许换行（窄屏下建议开启，避免横向溢出） */
    wrap?: boolean
    /** 撑满父级宽度 */
    fill?: boolean
  }>(),
  { direction: 'horizontal', size: 12, align: 'center', wrap: false, fill: false },
)

const ALIGN = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  baseline: 'baseline',
} as const

const JUSTIFY = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  'space-between': 'space-between',
  'space-around': 'space-around',
} as const

const toUnit = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

const style = computed(() => {
  const raw = Array.isArray(props.size) ? props.size : [props.size, props.size]
  const first = raw[0] ?? props.size
  const second = raw[1] ?? first
  const vertical = props.direction === 'vertical'
  return {
    flexDirection: vertical ? ('column' as const) : ('row' as const),
    flexWrap: props.wrap ? ('wrap' as const) : ('nowrap' as const),
    alignItems: ALIGN[props.align],
    justifyContent: props.justify ? JUSTIFY[props.justify] : undefined,
    columnGap: toUnit(vertical ? second : first),
    rowGap: toUnit(vertical ? first : second),
    width: props.fill ? '100%' : undefined,
  }
})
</script>

<template>
  <div class="je-space" :style="style">
    <slot />
  </div>
</template>

<style scoped>
.je-space {
  display: flex;
}
</style>