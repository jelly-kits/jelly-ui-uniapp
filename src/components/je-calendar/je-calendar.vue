<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import {
  addMonths,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  type JeCalendarCell,
  type JeCalendarCellSlotProps,
} from './types'

defineOptions({ name: 'JeCalendar' })

const props = withDefaults(
  defineProps<{
    modelValue?: Date
    /** 区间高亮：[起点, 终点] */
    range?: [Date, Date]
  }>(),
  { modelValue: undefined, range: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [value: Date]
  change: [value: Date]
  'panel-change': [value: Date]
}>()

defineSlots<{ 'date-cell': (props: JeCalendarCellSlotProps) => unknown }>()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const viewDate = ref(startOfMonth(props.modelValue ?? props.range?.[0] ?? new Date()))

const title = computed(() => `${viewDate.value.getFullYear()}年${viewDate.value.getMonth() + 1}月`)

const rangeStart = computed(() => (props.range ? startOfDay(props.range[0]) : null))
const rangeEnd = computed(() => (props.range ? startOfDay(props.range[1]) : null))

/** 固定铺满 6 行 × 7 列；周一为一周起始 */
const cells = computed<JeCalendarCell[]>(() => {
  const monthView = viewDate.value
  const first = startOfMonth(monthView)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - offset)
  const today = new Date()
  const selected = props.modelValue ?? null
  const startTime = rangeStart.value ? rangeStart.value.getTime() : -Infinity
  const endTime = rangeEnd.value ? rangeEnd.value.getTime() : -Infinity
  const list: JeCalendarCell[] = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const time = date.getTime()
    list.push({
      date,
      inMonth: isSameMonth(date, monthView),
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selected),
      isRangeStart: !!rangeStart.value && time === startTime,
      isRangeEnd: !!rangeEnd.value && time === endTime,
      inRange: startTime !== -Infinity && endTime !== -Infinity && time > startTime && time < endTime,
    })
  }
  return list
})

const rows = computed(() => {
  const list: JeCalendarCell[][] = []
  for (let index = 0; index < cells.value.length; index += 7) {
    list.push(cells.value.slice(index, index + 7))
  }
  return list
})

/** 每组只有一天进入 Tab 序列，其余靠方向键移动焦点 */
const isTabStop = (cell: JeCalendarCell): boolean => {
  if (!cell.inMonth) return false
  if (cell.isSelected || cell.isRangeStart || cell.isRangeEnd) return true
  const flat = cells.value
  const available = flat.filter((item) => item.inMonth)
  const hasEndpoint = available.some(
    (item) => item.isSelected || item.isRangeStart || item.isRangeEnd,
  )
  if (hasEndpoint) return false
  const fallback = available.find((item) => item.isToday) ?? available[0]
  return fallback === cell
}

const dayLabel = (cell: JeCalendarCell) =>
  `${cell.date.getFullYear()}年${cell.date.getMonth() + 1}月${cell.date.getDate()}日`

const pick = (cell: JeCalendarCell) => {
  const date = startOfDay(cell.date)
  emit('update:modelValue', date)
  emit('change', date)
}

const shiftMonth = (amount: number) => {
  viewDate.value = addMonths(viewDate.value, amount)
}

const goToday = () => {
  const today = startOfDay(new Date())
  viewDate.value = startOfMonth(today)
  emit('update:modelValue', today)
  emit('change', today)
}

/* 键盘只存在于 H5：网格内方向键移动焦点，左右 ±1 天，上下 ±7 天。
   小程序端 keydown 永不触发，这里只做焦点搬运，不依赖全局 DOM */
const onGridKeydown = (event: KeyboardEvent) => {
  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  }
  const step = steps[event.key]
  if (!step) return
  event.preventDefault()
  const grid = event.currentTarget as HTMLElement
  const days = Array.from(grid.querySelectorAll<HTMLElement>('.je-calendar__day'))
  const index = days.indexOf(event.target as HTMLElement)
  days[index + step]?.focus()
}

watch(viewDate, (value) => {
  emit('panel-change', new Date(value.getTime()))
})

// 外部把选中值改到别的月份时，视图跟着翻过去
watch(
  () => props.modelValue,
  (value) => {
    if (value && !isSameMonth(value, viewDate.value)) {
      viewDate.value = startOfMonth(value)
    }
  },
)
</script>

<template>
  <view class="je-calendar">
    <view class="je-calendar__header">
      <button
        type="button"
        class="je-calendar__nav"
        aria-label="上一月"
        @tap="shiftMonth(-1)"
      >
        <JeIcon name="chevron-left" :size="16" />
      </button>
      <text class="je-calendar__title">{{ title }}</text>
      <button
        type="button"
        class="je-calendar__nav"
        aria-label="下一月"
        @tap="shiftMonth(1)"
      >
        <JeIcon name="chevron-right" :size="16" />
      </button>
      <button type="button" class="je-calendar__today" @tap="goToday">今天</button>
    </view>

    <!-- 窄屏时格子会撑到 44px，放不下就横向滚动；小程序端 view 不滚动，用 scroll-view -->
    <scroll-view class="je-calendar__scroll" scroll-x>
      <view class="je-calendar__grid" role="grid" :aria-label="title" @keydown="onGridKeydown">
        <view class="je-calendar__week" role="row">
          <text
            v-for="(label, index) in weekdays"
            :key="index"
            class="je-calendar__weekday"
            role="columnheader"
          >
            {{ label }}
          </text>
        </view>

        <view v-for="(row, rowIndex) in rows" :key="rowIndex" class="je-calendar__row" role="row">
          <button
            v-for="cell in row"
            :key="cell.date.getTime()"
            type="button"
            class="je-calendar__day"
            role="gridcell"
            :class="{
              'is-outside': !cell.inMonth,
              'is-today': cell.isToday,
              'is-selected': cell.isSelected,
              'is-range-start': cell.isRangeStart,
              'is-range-end': cell.isRangeEnd,
              'in-range': cell.inRange,
            }"
            :tabindex="isTabStop(cell) ? 0 : -1"
            :aria-selected="cell.isSelected"
            :aria-current="cell.isToday ? 'date' : undefined"
            :aria-label="dayLabel(cell)"
            @tap="pick(cell)"
          >
            <slot name="date-cell" :date="cell.date" :data="cell">{{ cell.date.getDate() }}</slot>
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.je-calendar {
  box-sizing: border-box;
  max-width: 380px;
  padding: 14px;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-lg);
}

.je-calendar__header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.je-calendar__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: 0;
  padding: 0;
  color: var(--je-text-muted);
  background: none;
  border: none;
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: color 0.2s ease, background 0.2s ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-calendar__nav::after,
.je-calendar__today::after,
.je-calendar__day::after {
  border: none;
}

.je-calendar__nav:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-calendar__nav:focus-visible,
.je-calendar__today:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-calendar__title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.je-calendar__today {
  flex-shrink: 0;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12px;
  color: var(--je-text-muted);
  background: none;
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: color 0.2s ease, background 0.2s ease;
}

.je-calendar__today:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

/* 窄屏时日期格子会撑到 44px，放不下就横向滚动 */
.je-calendar__scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.je-calendar__week,
.je-calendar__row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.je-calendar__week {
  margin-bottom: 4px;
}

.je-calendar__weekday {
  padding: 4px 0;
  font-size: 12px;
  color: var(--je-text-faint);
  text-align: center;
}

.je-calendar__day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 1px auto;
  padding: 0;
  font-family: inherit;
  font-size: 13px;
  color: var(--je-text-muted);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  outline: none;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.je-calendar__day:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-calendar__day.is-outside {
  color: var(--je-text-faint);
  opacity: 0.5;
}

.je-calendar__day.is-today {
  font-weight: 700;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--je-primary) 70%, transparent);
}

.je-calendar__day.in-range {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 18%, transparent);
  border-radius: var(--je-radius-sm);
}

.je-calendar__day.is-selected,
.je-calendar__day.is-range-start,
.je-calendar__day.is-range-end {
  font-weight: 700;
  /* 选中日期压在品牌渐变上，文字固定浅色 */
  color: var(--je-text-on-color);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--je-primary) 40%, transparent);
}

.je-calendar__day:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 1px;
}

@media (max-width: 768px) {
  .je-calendar {
    max-width: 100%;
  }

  .je-calendar__week,
  .je-calendar__row {
    grid-template-columns: repeat(7, minmax(44px, 1fr));
  }

  .je-calendar__day {
    width: 44px;
    height: 44px;
    margin: 0 auto;
    font-size: 15px;
  }

  .je-calendar__nav {
    width: 36px;
    height: 36px;
  }

  .je-calendar__today {
    padding: 10px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-calendar__day,
  .je-calendar__nav,
  .je-calendar__today {
    transition: none;
  }
}
</style>
