<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import JeIcon from '../je-icon/je-icon.vue'
import {
  addMonths,
  formatDate,
  isSameDay,
  isSameMonth,
  parseDate,
  startOfDay,
  startOfMonth,
  type JeDatePickerModelValue,
  type JeDatePickerType,
} from './types'

defineOptions({ name: 'JeDatePicker' })

interface DayCell {
  date: Date
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  isRangeStart: boolean
  isRangeEnd: boolean
  inRange: boolean
  isDisabled: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: JeDatePickerModelValue
    type?: JeDatePickerType
    placeholder?: string
    /** 展示 / 解析用的格式，datetime 默认 YYYY-MM-DD HH:mm */
    format?: string
    disabled?: boolean
    clearable?: boolean
    disabledDate?: (date: Date) => boolean
    /** 一周起始日，0 = 周日，1 = 周一 */
    weekStart?: number
  }>(),
  {
    modelValue: null,
    type: 'date',
    placeholder: '请选择日期',
    disabled: false,
    clearable: true,
    weekStart: 1,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeDatePickerModelValue]
  change: [value: JeDatePickerModelValue]
  clear: []
}>()

const uid = useUid('je-date')
/** 小程序端拿不到 DOM 引用，两列时间的位置靠 SelectorQuery 量；H5 下才是真实元素 */
const instance = getCurrentInstance()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

/**
 * 窄屏切底部弹出层。小程序端没有 window，恒按窄屏处理；
 * H5 在挂载时按视口宽判一次（口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

/* H5 锁 body 滚动；小程序端没有 body，锁屏交给遮罩层的 touchmove 阻断 */
// #ifdef H5
let previousOverflow = ''

const setBodyScrollLock = (locked: boolean) => {
  if (locked) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousOverflow
}
// #endif

const locked = computed(() => isMobile.value && isOpen.value)

// #ifdef H5
watch(locked, (value) => setBodyScrollLock(value))
// #endif

/* 抓手下拉关闭：位移只做视觉反馈，松手超过阈值才真正收起 */
const sheet = useSheetDrag(() => close())

const effectiveFormat = computed(
  () => props.format ?? (props.type === 'datetime' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'),
)

const parseValue = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getTime())
  return parseDate(value, effectiveFormat.value)
}

const singleValue = computed(() =>
  Array.isArray(props.modelValue) ? null : parseValue(props.modelValue),
)

const rangeStart = ref<Date | null>(null)
const rangeEnd = ref<Date | null>(null)

if (props.type === 'daterange' && Array.isArray(props.modelValue)) {
  rangeStart.value = parseValue(props.modelValue[0])
  rangeEnd.value = parseValue(props.modelValue[1])
}

const hourValue = ref(singleValue.value ? singleValue.value.getHours() : new Date().getHours())
const minuteValue = ref(
  singleValue.value ? singleValue.value.getMinutes() : new Date().getMinutes(),
)

/**
 * datetime 分两步：先定日期，再配时间。
 * 第二步里的日期与时 / 分都只是「待提交」状态，点确定才写回 v-model。
 */
const step = ref<'date' | 'time'>('date')
const pendingDate = ref<Date | null>(singleValue.value ? startOfDay(singleValue.value) : null)

const viewDate = ref(
  startOfMonth((props.type === 'daterange' ? rangeStart.value : singleValue.value) ?? new Date()),
)
const viewDateSecond = computed(() => addMonths(viewDate.value, 1))

const monthViews = computed(() => {
  const list = [viewDate.value]
  if (props.type === 'daterange') list.push(viewDateSecond.value)
  return list
})

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const weekdayLabels = computed(() => {
  const labels: string[] = []
  for (let index = 0; index < 7; index += 1) {
    labels.push(WEEK_LABELS[(props.weekStart + index) % 7] ?? '')
  }
  return labels
})

const pad2 = (value: number) => String(value).padStart(2, '0')

const hours = Array.from({ length: 24 }, (_, index) => index)
const minutes = Array.from({ length: 60 }, (_, index) => index)

/** 日历上高亮的日期：datetime 用待提交的那个，其余形态用已提交的值 */
const activeDate = computed(() =>
  props.type === 'datetime' ? pendingDate.value : singleValue.value,
)

/** 两步式：第一步只显示日历，第二步只显示时间 */
const showCalendar = computed(() => props.type !== 'datetime' || step.value === 'date')
const showTimeStep = computed(() => props.type === 'datetime' && step.value === 'time')

const pendingDateLabel = computed(() => {
  const date = pendingDate.value
  if (!date) return '未选择日期'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
})

/** 固定铺满 6 行 × 7 列，跨月 / 跨年都由 Date 自身归一化 */
const cellsOf = (monthDate: Date): DayCell[] => {
  const first = startOfMonth(monthDate)
  const offset = (first.getDay() - props.weekStart + 7) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - offset)
  const today = new Date()
  const selected = activeDate.value
  const startTime = rangeStart.value ? startOfDay(rangeStart.value).getTime() : -Infinity
  const endTime = rangeEnd.value ? startOfDay(rangeEnd.value).getTime() : -Infinity
  const cells: DayCell[] = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const time = date.getTime()
    cells.push({
      date,
      inMonth: isSameMonth(date, monthDate),
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selected),
      isRangeStart: isSameDay(date, rangeStart.value),
      isRangeEnd: isSameDay(date, rangeEnd.value),
      inRange: startTime !== -Infinity && endTime !== -Infinity && time > startTime && time < endTime,
      isDisabled: props.disabledDate ? props.disabledDate(date) : false,
    })
  }
  return cells
}

const rowsOf = (cells: DayCell[]): DayCell[][] => {
  const rows: DayCell[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7))
  }
  return rows
}

const monthCellRows = computed(() => monthViews.value.map((month) => rowsOf(cellsOf(month))))

/** 每个格子里只有一天进入 Tab 序列，其余靠方向键移动焦点 */
const isTabStop = (cell: DayCell, monthIndex: number): boolean => {
  if (cell.isDisabled || !cell.inMonth) return false
  if (cell.isSelected || cell.isRangeStart || cell.isRangeEnd) return true
  const rows = monthCellRows.value[monthIndex]
  if (!rows) return false
  const flat = rows.flat()
  const available = flat.filter((item) => item.inMonth && !item.isDisabled)
  const hasEndpoint = available.some(
    (item) => item.isSelected || item.isRangeStart || item.isRangeEnd,
  )
  if (hasEndpoint) return false
  const fallback = available.find((item) => item.isToday) ?? available[0]
  return fallback === cell
}

const dayLabel = (cell: DayCell) =>
  `${cell.date.getFullYear()}年${cell.date.getMonth() + 1}月${cell.date.getDate()}日`

const titleOf = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`

const monthTitles = computed(() => monthViews.value.map((month) => titleOf(month)))

const displayText = computed(() => {
  if (props.type === 'daterange') {
    if (!rangeStart.value) return ''
    const start = formatDate(rangeStart.value, effectiveFormat.value)
    return rangeEnd.value
      ? `${start} ~ ${formatDate(rangeEnd.value, effectiveFormat.value)}`
      : `${start} ~ …`
  }
  const value = singleValue.value
  return value ? formatDate(value, effectiveFormat.value) : ''
})

const hasValue = computed(() =>
  props.type === 'daterange' ? rangeStart.value !== null : singleValue.value !== null,
)

/** 输入是字符串就回字符串，是 Date 就回 Date，保持绑定类型不变 */
const mirrorsString = computed(() => {
  const value = props.modelValue
  if (Array.isArray(value)) return typeof value[0] === 'string'
  return typeof value === 'string'
})

const toModel = (date: Date): Date | string =>
  mirrorsString.value ? formatDate(date, effectiveFormat.value) : date

const shiftMonth = (amount: number) => {
  viewDate.value = addMonths(viewDate.value, amount)
}

const shiftYear = (amount: number) => {
  viewDate.value = addMonths(viewDate.value, amount * 12)
}

const emitRange = (complete: boolean) => {
  const value: [Date | string | null, Date | string | null] = [
    rangeStart.value ? toModel(rangeStart.value) : null,
    rangeEnd.value ? toModel(rangeEnd.value) : null,
  ]
  emit('update:modelValue', value)
  if (complete) emit('change', value)
}

const pickRange = (day: Date) => {
  const date = startOfDay(day)
  // 还没起点、或区间已选满时，重新开始选起点
  if (!rangeStart.value || rangeEnd.value) {
    rangeStart.value = date
    rangeEnd.value = null
    emitRange(false)
    return
  }
  if (date.getTime() < rangeStart.value.getTime()) {
    rangeEnd.value = rangeStart.value
    rangeStart.value = date
  } else {
    rangeEnd.value = date
  }
  emitRange(true)
  close()
}

/* ---- 第二步时间滚轮：scroll-view 原生滚动，进入时把选中项滚到中间 ---- */

/** 每列的目标滚动位置，下发到 scroll-view 的 scroll-top；滚动时回写，保持与实际位置一致 */
const timeScrolls = ref<number[]>([0, 0])
/** scroll-view 的两个布尔属性走 ref 下发（mp 端静态字面量 false 有丢失历史） */
const scrollWithAnimation = ref(true)
const showScrollbar = ref(false)

const onTimeScroll = (colIndex: number, event: any) => {
  const scrollTop = Number(event?.detail?.scrollTop ?? 0)
  // 只在确实偏了才回写，避免「赋值 → 触发 scroll → 再赋值」的空转
  if (timeScrolls.value[colIndex] !== scrollTop) timeScrolls.value[colIndex] = scrollTop
}

/** delta = 选中格相对列顶的偏移 − 列高的一半 + 格高的一半，叠加到当前滚动位置上 */
const applyTimeCenter = (colIndex: number, colRect: any, cellRect: any) => {
  const colTop = Number(colRect?.top)
  const cellTop = Number(cellRect?.top)
  const colHeight = Number(colRect?.height)
  const cellHeight = Number(cellRect?.height)
  if (![colTop, cellTop, colHeight, cellHeight].every(Number.isFinite)) return
  const delta = cellTop - colTop - colHeight / 2 + cellHeight / 2
  timeScrolls.value[colIndex] = Number(timeScrolls.value[colIndex] ?? 0) + delta
}

/** 把一列滚到选中项居中，省得进第二步还要自己找 */
const centerTimeColumn = (colIndex: number) => {
  const value = colIndex === 0 ? hourValue.value : minuteValue.value
  const colId = `${uid}-${colIndex === 0 ? 'hour' : 'minute'}`
  const cellId = `${uid}-${colIndex === 0 ? 'h' : 'm'}-${value}`

  // #ifdef H5
  const colEl = document.querySelector(`#${colId}`) as HTMLElement | null
  const cellEl = document.querySelector(`#${cellId}`) as HTMLElement | null
  applyTimeCenter(colIndex, colEl?.getBoundingClientRect(), cellEl?.getBoundingClientRect())
  // #endif
  // #ifndef H5
  if (instance?.proxy) {
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select(`#${colId}`)
      .boundingClientRect()
      .select(`#${cellId}`)
      .boundingClientRect()
      .exec((result) => {
        applyTimeCenter(colIndex, result?.[0], result?.[1])
      })
  }
  // #endif
}

const syncTimeScroll = () => {
  if (!showTimeStep.value) return
  centerTimeColumn(0)
  centerTimeColumn(1)
}

/** 进入第二步：滚到当前时 / 分，并把焦点交给当前小时（键盘 Tab 不会跑回文档开头） */
const goTimeStep = () => {
  step.value = 'time'
  void nextTick(() => {
    syncTimeScroll()
    // #ifdef H5
    document
      .querySelector<HTMLElement>(`#${uid}-h-${hourValue.value}`)
      ?.focus({ preventScroll: true })
    // #endif
  })
}

const pick = (cell: DayCell) => {
  if (props.disabled || cell.isDisabled) return
  if (props.type === 'daterange') {
    pickRange(cell.date)
    return
  }
  if (props.type === 'datetime') {
    // 第一步只记下日期，时间留到第二步再配
    pendingDate.value = startOfDay(cell.date)
    goTimeStep()
    return
  }
  const next = toModel(startOfDay(cell.date))
  emit('update:modelValue', next)
  emit('change', next)
  close()
}

/** 第二步的确定：把待提交的日期 + 时 / 分合成一个值写回，然后收起 */
const confirmTime = () => {
  const base = pendingDate.value ?? startOfDay(singleValue.value ?? new Date())
  const date = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hourValue.value,
    minuteValue.value,
  )
  const next = toModel(date)
  emit('update:modelValue', next)
  emit('change', next)
  close()
}

// 时 / 分只改待提交状态，不再边点边提交、也不再点分钟就自动关闭
const pickHour = (value: number) => {
  hourValue.value = value
}

const pickMinute = (value: number) => {
  minuteValue.value = value
}

const open = () => {
  sheet.reset()
  const base = props.type === 'daterange' ? rangeStart.value : singleValue.value
  // 打开时把视图对齐到当前选中值所在的月份
  viewDate.value = startOfMonth(base ?? new Date())
  if (props.type === 'datetime') {
    // 每次都从第一步开始，并把已有的时 / 分带进来当初始值
    step.value = 'date'
    pendingDate.value = base ? startOfDay(base) : null
    if (base) {
      hourValue.value = base.getHours()
      minuteValue.value = base.getMinutes()
    }
  }
  isOpen.value = true
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

const clear = () => {
  rangeStart.value = null
  rangeEnd.value = null
  const empty: [null, null] = [null, null]
  emit('update:modelValue', props.type === 'daterange' ? empty : null)
  emit('clear')
}

/* 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onTriggerKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
    event.preventDefault()
    if (!isOpen.value) open()
    return
  }
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    close()
  }
}

/** 网格内方向键移动焦点：左右 ±1 天，上下 ±7 天（仅 H5 有真实焦点） */
const onGridKeydown = (event: KeyboardEvent) => {
  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  }
  const amount = steps[event.key]
  if (!amount) return
  event.preventDefault()
  const grid = event.currentTarget as HTMLElement
  const days = Array.from(grid.querySelectorAll<HTMLElement>('.je-date-picker__day:not([disabled])'))
  const index = days.indexOf(event.target as HTMLElement)
  days[index + amount]?.focus()
}

/* 点选外部关闭与页面级 Esc 只在 H5（桌面下拉形态）成立，小程序端靠遮罩点击 */
// #ifdef H5
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  close()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node
  if (rootRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  close()
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
// #endif

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  setBodyScrollLock(false)
  // #endif
})

watch(
  () => props.modelValue,
  (value) => {
    if (props.type === 'daterange') {
      if (Array.isArray(value)) {
        rangeStart.value = parseValue(value[0])
        rangeEnd.value = parseValue(value[1])
      } else {
        rangeStart.value = null
        rangeEnd.value = null
      }
      return
    }
    const parsed = parseValue(Array.isArray(value) ? null : value)
    if (parsed) {
      hourValue.value = parsed.getHours()
      minuteValue.value = parsed.getMinutes()
    }
  },
)

/** 拖拽时用内联 transform 覆盖面板的滑入位移，松手后交还给 CSS 过渡 */
const panelStyle = computed(() => {
  if (!isMobile.value || !isOpen.value) return undefined
  return {
    transform: `translateY(${sheet.offset.value}px)`,
    transition: sheet.dragging.value ? 'none' : undefined,
  }
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-date-picker"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled }"
  >
    <view
      ref="triggerRef"
      class="je-date-picker__trigger"
      :class="{ 'has-value': hasValue }"
      role="combobox"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="`${uid}-panel`"
      :tabindex="disabled ? -1 : 0"
      @tap="toggle"
      @keydown="onTriggerKeydown"
    >
      <text class="je-date-picker__label">{{ displayText || placeholder }}</text>
      <button
        v-if="clearable && hasValue && !disabled"
        type="button"
        class="je-date-picker__clear"
        aria-label="清除"
        @tap.stop="clear"
      >
        <JeIcon name="close" :size="14" />
      </button>
      <text class="je-date-picker__arrow" aria-hidden="true" />
    </view>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-date-picker__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="`${uid}-panel`"
      ref="panelRef"
      class="je-date-picker__panel"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      role="dialog"
      aria-label="选择日期"
      :aria-hidden="!isOpen"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-date-picker__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <view class="je-date-picker__body" :class="{ 'is-range': type === 'daterange' }">
        <!-- 第一步：日历。date / daterange 形态一直停在它上面 -->
        <template v-if="showCalendar">
          <view
            v-for="(rows, monthIndex) in monthCellRows"
            :key="monthIndex"
            class="je-date-picker__month"
          >
            <view class="je-date-picker__header">
              <button type="button" class="je-date-picker__nav" aria-label="上一年" @tap="shiftYear(-1)">
                <JeIcon name="chevrons-left" :size="16" />
              </button>
              <button type="button" class="je-date-picker__nav" aria-label="上一月" @tap="shiftMonth(-1)">
                <JeIcon name="chevron-left" :size="16" />
              </button>
              <text class="je-date-picker__title">{{ monthTitles[monthIndex] }}</text>
              <button type="button" class="je-date-picker__nav" aria-label="下一月" @tap="shiftMonth(1)">
                <JeIcon name="chevron-right" :size="16" />
              </button>
              <button type="button" class="je-date-picker__nav" aria-label="下一年" @tap="shiftYear(1)">
                <JeIcon name="chevrons-right" :size="16" />
              </button>
            </view>

            <view
              class="je-date-picker__grid"
              role="grid"
              :aria-label="monthTitles[monthIndex]"
              @keydown="onGridKeydown"
            >
              <view class="je-date-picker__week" role="row">
                <text
                  v-for="(label, index) in weekdayLabels"
                  :key="index"
                  class="je-date-picker__weekday"
                  role="columnheader"
                >
                  {{ label }}
                </text>
              </view>

              <view
                v-for="(row, rowIndex) in rows"
                :key="rowIndex"
                class="je-date-picker__row"
                role="row"
              >
                <button
                  v-for="cell in row"
                  :key="cell.date.getTime()"
                  type="button"
                  class="je-date-picker__day"
                  role="gridcell"
                  :class="{
                    'is-outside': !cell.inMonth,
                    'is-today': cell.isToday,
                    'is-selected': cell.isSelected,
                    'is-range-start': cell.isRangeStart,
                    'is-range-end': cell.isRangeEnd,
                    'in-range': cell.inRange,
                  }"
                  :disabled="cell.isDisabled"
                  :tabindex="isTabStop(cell, monthIndex) ? 0 : -1"
                  :aria-selected="cell.isSelected || cell.isRangeStart || cell.isRangeEnd"
                  :aria-current="cell.isToday ? 'date' : undefined"
                  :aria-label="dayLabel(cell)"
                  @tap="pick(cell)"
                >
                  {{ cell.date.getDate() }}
                </button>
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- 第二步：时间。改时 / 分只动待提交状态，点确定才写回 v-model -->
      <view v-if="showTimeStep" class="je-date-picker__time">
        <view class="je-date-picker__time-title">选择时间 · {{ pendingDateLabel }}</view>
        <view class="je-date-picker__time-wheel">
          <scroll-view
            :id="`${uid}-hour`"
            class="je-date-picker__time-col"
            scroll-y
            role="listbox"
            aria-label="小时"
            :scroll-top="timeScrolls[0] || 0"
            :scroll-with-animation="scrollWithAnimation"
            :show-scrollbar="showScrollbar"
            @scroll="onTimeScroll(0, $event)"
          >
            <view class="je-date-picker__time-col-inner">
              <button
                v-for="value in hours"
                :id="`${uid}-h-${value}`"
                :key="`h-${value}`"
                type="button"
                class="je-date-picker__time-cell"
                :class="{ 'is-selected': value === hourValue }"
                role="option"
                :aria-selected="value === hourValue"
                @tap="pickHour(value)"
              >
                {{ pad2(value) }}
              </button>
            </view>
          </scroll-view>

          <view class="je-date-picker__time-sep" aria-hidden="true">:</view>

          <scroll-view
            :id="`${uid}-minute`"
            class="je-date-picker__time-col"
            scroll-y
            role="listbox"
            aria-label="分钟"
            :scroll-top="timeScrolls[1] || 0"
            :scroll-with-animation="scrollWithAnimation"
            :show-scrollbar="showScrollbar"
            @scroll="onTimeScroll(1, $event)"
          >
            <view class="je-date-picker__time-col-inner">
              <button
                v-for="value in minutes"
                :id="`${uid}-m-${value}`"
                :key="`m-${value}`"
                type="button"
                class="je-date-picker__time-cell"
                :class="{ 'is-selected': value === minuteValue }"
                role="option"
                :aria-selected="value === minuteValue"
                @tap="pickMinute(value)"
              >
                {{ pad2(value) }}
              </button>
            </view>
          </scroll-view>
        </view>

        <view class="je-date-picker__footer">
          <button type="button" class="je-date-picker__action" @tap="step = 'date'">
            上一步
          </button>
          <button type="button" class="je-date-picker__action is-primary" @tap="confirmTime">
            确定
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-date-picker {
  position: relative;
  font-family: inherit;
  user-select: none;
}

.je-date-picker__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  color: var(--je-text-faint);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  cursor: pointer;
  outline: none;
  transition: border-color var(--je-duration) ease, background var(--je-duration) ease,
    box-shadow var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-date-picker__clear::after,
.je-date-picker__nav::after,
.je-date-picker__day::after,
.je-date-picker__time-cell::after,
.je-date-picker__action::after {
  border: none;
}

.je-date-picker__trigger.has-value {
  color: var(--je-text);
}

/* 聚焦与展开共用同一套高亮 */
.je-date-picker__trigger:focus-visible,
.je-date-picker.is-open .je-date-picker__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-date-picker__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-date-picker__clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  color: var(--je-text-faint);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.je-date-picker__clear:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-date-picker__arrow {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-top: -4px;
  border-right: 2px solid var(--je-text-faint);
  border-bottom: 2px solid var(--je-text-faint);
  transform: rotate(45deg);
  transition: transform 0.4s var(--je-ease-overshoot), margin-top 0.4s var(--je-ease-overshoot),
    border-color var(--je-duration) ease;
}

.je-date-picker.is-open .je-date-picker__arrow {
  margin-top: 4px;
  border-color: var(--je-text);
  transform: rotate(-135deg);
}

.je-date-picker.is-disabled .je-date-picker__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 桌面端就地挂在触发按钮左下；小程序端没有 body，不能靠 teleport + fixed 定位 */
.je-date-picker__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  box-sizing: border-box;
  /* 日历里一天的格子尺寸；第二步只有时间，靠它撑住面板宽度 */
  --je-date-picker-day: 34px;
  padding: 14px;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top left;
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.94) translateY(-6px);
  transition: transform 0.28s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.28s;
}

.je-date-picker__panel.is-open {
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: transform 0.38s var(--je-ease-out-back), opacity 0.24s ease-out;
}

.je-date-picker__body {
  display: flex;
  gap: 18px;
  /* 与日历同宽（7 列 × 每天 34px + 2px 外边距），切到时间步骤时面板不会忽宽忽窄 */
  min-width: calc(var(--je-date-picker-day) * 7 + 14px);
}

.je-date-picker__month {
  flex: 0 0 auto;
}

.je-date-picker__header {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 8px;
}

.je-date-picker__nav {
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

.je-date-picker__nav:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-date-picker__nav:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-date-picker__title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text);
  text-align: center;
  white-space: nowrap;
}

.je-date-picker__week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.je-date-picker__weekday {
  padding: 4px 0;
  font-size: 12px;
  color: var(--je-text-faint);
  text-align: center;
}

.je-date-picker__row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.je-date-picker__day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--je-date-picker-day);
  height: 34px;
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

.je-date-picker__day:hover:not(:disabled) {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-date-picker__day.is-outside {
  color: var(--je-text-faint);
  opacity: 0.5;
}

.je-date-picker__day.is-today {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--je-primary) 70%, transparent);
}

.je-date-picker__day.in-range {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 18%, transparent);
  border-radius: var(--je-radius-sm);
}

.je-date-picker__day.is-selected,
.je-date-picker__day.is-range-start,
.je-date-picker__day.is-range-end {
  font-weight: 700;
  /* 选中日期压在品牌渐变上，文字固定浅色 */
  color: var(--je-text-on-color);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--je-primary) 40%, transparent);
}

.je-date-picker__day:disabled {
  color: var(--je-text-faint);
  cursor: not-allowed;
  opacity: 0.35;
}

.je-date-picker__day:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 1px;
}

/* 第二步独占面板，不需要再和日历分隔 */
.je-date-picker__time {
  margin-top: 0;
}

.je-date-picker__time-title {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--je-text-faint);
  text-align: center;
  white-space: nowrap;
}

.je-date-picker__time-wheel {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 列改成 scroll-view：小程序端 overflow 不滚动，滚轮手势交给原生滚动 */
.je-date-picker__time-col {
  flex: 1 1 0;
  min-width: 0;
  max-height: 160px;
  scrollbar-width: thin;
  scrollbar-color: var(--je-border-color) transparent;
}

.je-date-picker__time-col-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px;
}

.je-date-picker__time-col::-webkit-scrollbar {
  width: 4px;
}

.je-date-picker__time-col::-webkit-scrollbar-thumb {
  background: var(--je-border-color);
  border-radius: 2px;
}

.je-date-picker__time-cell {
  min-width: 52px;
  margin: 0;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  color: var(--je-text-faint);
  background: none;
  border: none;
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.je-date-picker__time-cell:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

/* 选中态用 state 类：小程序端不支持属性选择器 */
.je-date-picker__time-cell.is-selected {
  font-weight: 700;
  /* 选中时间格压在品牌渐变上，文字固定浅色 */
  color: var(--je-text-on-color);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

.je-date-picker__time-cell:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-date-picker__time-sep {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--je-text-faint);
}

/* 第二步的操作条：上一步 / 确定 */
.je-date-picker__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: var(--je-border);
}

.je-date-picker__action {
  margin: 0;
  padding: 8px 18px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  color: var(--je-text-muted);
  background: none;
  border: var(--je-border);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.je-date-picker__action:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-date-picker__action:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-date-picker__action.is-primary {
  font-weight: 600;
  /* 主操作按钮压在品牌渐变上，文字固定浅色 */
  color: var(--je-text-on-color);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
}

.je-date-picker__action.is-primary:hover {
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--je-primary) 45%, transparent);
}

.je-date-picker__scrim {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-date-picker__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-date-picker__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-date-picker__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

/* 窄屏：面板改成贴底弹出层，日期格子铺开到 44px 触控热区 */
@media (max-width: 768px) {
  .je-date-picker__panel {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 101;
    max-height: 84vh;
    overflow-y: auto;
    padding: 4px 16px calc(18px + env(safe-area-inset-bottom, 0px));
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    transform-origin: bottom center;
    /* 这里不能设 touch-action: none，否则日期网格在触屏上没法滚动；
       拖拽手势的 touch-action 由 .je-date-picker__handle 单独承担 */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-date-picker__panel.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-date-picker__body {
    width: 100%;
    min-width: 0;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
  }

  /*
   * 日历必须撑满面板宽度：否则 7 条 1fr 轨道会按内容的 max-content 收缩到 ~240px，
   * 每列只剩 34px 宽，而格子又被 min-height 顶到 44px 高 —— 看上去就是「纵向被拉伸」。
   */
  .je-date-picker__month {
    flex: 1 1 100%;
    width: 100%;
  }

  .je-date-picker__grid,
  .je-date-picker__week,
  .je-date-picker__row {
    width: 100%;
  }

  /*
   * 小程序端没有 aspect-ratio，用「宽 100% + max-width 44px + 固定高 44px」等价地拿正方形，
   * 既保证触控热区不小于 44px，也不会像靠 min-height 那样把窄格子拉成竖条。
   */
  .je-date-picker__day {
    width: 100%;
    max-width: 44px;
    height: 44px;
    margin: 0 auto;
    font-size: 15px;
  }

  .je-date-picker__nav {
    width: 38px;
    height: 44px;
  }

  .je-date-picker__clear {
    width: 32px;
    height: 32px;
  }

  .je-date-picker__time-col {
    flex: 1 1 0;
    max-height: 34vh;
  }

  .je-date-picker__time-cell {
    width: 100%;
    min-height: 44px;
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-date-picker__panel,
  .je-date-picker__panel.is-open,
  .je-date-picker__scrim,
  .je-date-picker__arrow {
    transition: none;
  }
}
</style>
