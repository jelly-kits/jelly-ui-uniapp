<script setup lang="ts">
import { computed, useSlots, watch } from 'vue'
import { jePresets } from '../../core/presets'
import { useSpring } from '../../core/useSpring'
import type { JeStatisticFormatOptions } from './types'

defineOptions({ name: 'JeStatistic' })

const props = withDefaults(
  defineProps<{
    value: number
    title?: string
    precision?: number
    prefix?: string
    suffix?: string
    useGroupSeparator?: boolean
    separator?: string
    /** value 变化时是否滚动到新值 */
    animation?: boolean
  }>(),
  {
    title: '',
    precision: 0,
    prefix: '',
    suffix: '',
    useGroupSeparator: true,
    separator: ',',
    animation: true,
  },
)

const slots = useSlots()

/**
 * 数字滚动走弹簧内核：和位移共用同一套积分与「减弱动效」处理。
 * 用 count 预设（不是 settle）——settle 实测过冲 51%，统计数字会先跳到 1.5 倍再回来。
 */
const spring = useSpring(props.value, jePresets.count)

watch(
  () => props.value,
  (next) => {
    if (props.animation) spring.set(next)
    else spring.jump(next)
  },
)

/** toFixed 定精度 + 正则插千分位；负号不会被当作数字分组 */
const format = (value: number, options: JeStatisticFormatOptions) => {
  const fixed = value.toFixed(Math.max(0, options.precision))
  const [integer = '0', decimal] = fixed.split('.')
  const grouped = options.useGroupSeparator
    ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, options.separator)
    : integer
  return decimal ? `${grouped}.${decimal}` : grouped
}

const displayValue = computed(() =>
  format(props.animation ? spring.value.value : props.value, {
    precision: props.precision,
    useGroupSeparator: props.useGroupSeparator,
    separator: props.separator,
  }),
)
</script>

<template>
  <view class="je-statistic">
    <view v-if="title || slots.title" class="je-statistic__title">
      <slot name="title">{{ title }}</slot>
    </view>

    <view class="je-statistic__value">
      <text v-if="prefix || slots.prefix" class="je-statistic__prefix">
        <slot name="prefix">{{ prefix }}</slot>
      </text>
      <text class="je-statistic__number">{{ displayValue }}</text>
      <text v-if="suffix || slots.suffix" class="je-statistic__suffix">
        <slot name="suffix">{{ suffix }}</slot>
      </text>
    </view>
  </view>
</template>

<style scoped>
.je-statistic {
  box-sizing: border-box;
  font-family: inherit;
}

.je-statistic__title {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--je-text-faint);
}

.je-statistic__value {
  display: flex;
  gap: 2px;
  align-items: baseline;
  color: var(--je-text);
}

.je-statistic__number {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.je-statistic__prefix,
.je-statistic__suffix {
  font-size: 15px;
  color: var(--je-text-muted);
}

@media (max-width: 768px) {
  .je-statistic__number {
    font-size: 24px;
  }
}
</style>
