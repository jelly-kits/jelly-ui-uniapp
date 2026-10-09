<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'

defineOptions({ name: 'JeTimePicker' })

const props = withDefaults(
  defineProps<{
    /** 形如 "HH:mm"，未选全时为 null */
    modelValue?: string | null
    /** 小时步长，默认 1（0-23） */
    hourStep?: number
    /** 分钟步长，默认 5（0-55） */
    minuteStep?: number
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    modelValue: null,
    hourStep: 1,
    minuteStep: 5,
    placeholder: '请选择时间',
    disabled: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uid = useUid('je-time')
/** 小程序端拿不到 DOM 引用，两列的位置靠 SelectorQuery 量；H5 下才是真实元素 */
const instance = getCurrentInstance()

const rootRef = ref<HTMLElement | null>(null)
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

/** 拖拽时用内联 transform 覆盖面板的滑入位移，松手后交还给 CSS 过渡 */
const panelStyle = computed(() => {
  if (!isMobile.value || !isOpen.value) return undefined
  return {
    transform: `translateY(${sheet.offset.value}px)`,
    transition: sheet.dragging.value ? 'none' : undefined,
  }
})

const pad = (n: number) => String(n).padStart(2, '0')
const buildRange = (end: number, step: number) => {
  const list: number[] = []
  for (let i = 0; i < end; i += step) list.push(i)
  return list
}

const hours = computed(() => buildRange(24, props.hourStep))
const minutes = computed(() => buildRange(60, props.minuteStep))

const parsed = /^(\d{1,2}):(\d{1,2})$/.exec(props.modelValue ?? '')
const hour = ref<number | null>(parsed ? Number(parsed[1]) : null)
const minute = ref<number | null>(parsed ? Number(parsed[2]) : null)

const hasValue = computed(() => hour.value !== null || minute.value !== null)

const triggerLabel = computed(() => {
  if (!hasValue.value) return ''
  const h = hour.value === null ? '--' : pad(hour.value)
  const m = minute.value === null ? '--' : pad(minute.value)
  return `${h}:${m}`
})

/**
 * 重播一次性 pop 动画。
 * 命令式改 class / 读 offsetWidth 强制重排在小程序端都不可用，改成响应式：
 * 先摘掉类、等一次渲染让动画被真正移除，再加回同一个类，动画就会从头播放。
 */
const popping = ref('')
let popTimer: ReturnType<typeof setTimeout> | undefined

const replayPop = (key: string) => {
  popping.value = ''
  nextTick(() => {
    popping.value = key
    if (popTimer) clearTimeout(popTimer)
    popTimer = setTimeout(() => {
      popping.value = ''
    }, 600)
  })
}

const commit = () => {
  if (hour.value !== null && minute.value !== null) {
    emit('update:modelValue', `${pad(hour.value)}:${pad(minute.value)}`)
  }
}

const selectHour = (value: number) => {
  hour.value = value
  replayPop(`h-${value}`)
  commit()
}

const selectMinute = (value: number) => {
  minute.value = value
  replayPop(`m-${value}`)
  commit()
  // 分钟选完即代表输入结束，直接收起，不需要再点一次关闭
  close()
}

/* ---- 滚轮：scroll-view 原生滚动，打开时把选中项滚到中间 ---- */

/** 每列的目标滚动位置，下发到 scroll-view 的 scroll-top；滚动时回写，保持与实际位置一致 */
const scrollTops = ref<number[]>([0, 0])
/** scroll-view 的两个布尔属性走 ref 下发（mp 端静态字面量 false 有丢失历史） */
const scrollWithAnimation = ref(true)
const showScrollbar = ref(false)

const onColumnScroll = (colIndex: number, event: any) => {
  const scrollTop = Number(event?.detail?.scrollTop ?? 0)
  // 只在确实偏了才回写，避免「赋值 → 触发 scroll → 再赋值」的空转
  if (scrollTops.value[colIndex] !== scrollTop) scrollTops.value[colIndex] = scrollTop
}

/** delta = 选中格相对列顶的偏移 − 列高的一半 + 格高的一半，叠加到当前滚动位置上 */
const applyCenter = (colIndex: number, colRect: any, cellRect: any) => {
  const colTop = Number(colRect?.top)
  const cellTop = Number(cellRect?.top)
  const colHeight = Number(colRect?.height)
  const cellHeight = Number(cellRect?.height)
  if (![colTop, cellTop, colHeight, cellHeight].every(Number.isFinite)) return
  const delta = cellTop - colTop - colHeight / 2 + cellHeight / 2
  scrollTops.value[colIndex] = Number(scrollTops.value[colIndex] ?? 0) + delta
}

/** 把一列滚到选中项居中，否则打开时只能看到 00:xx，得自己往下翻 */
const centerColumn = (colIndex: number) => {
  const value = colIndex === 0 ? hour.value : minute.value
  if (value === null) return
  const colId = `${uid}-${colIndex === 0 ? 'hour' : 'minute'}`
  const cellId = `${uid}-${colIndex === 0 ? 'h' : 'm'}-${value}`

  // #ifdef H5
  const colEl = document.querySelector(`#${colId}`) as HTMLElement | null
  const cellEl = document.querySelector(`#${cellId}`) as HTMLElement | null
  applyCenter(colIndex, colEl?.getBoundingClientRect(), cellEl?.getBoundingClientRect())
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
        applyCenter(colIndex, result?.[0], result?.[1])
      })
  }
  // #endif
}

const syncScroll = () => {
  centerColumn(0)
  centerColumn(1)
}

const open = () => {
  sheet.reset()
  isOpen.value = true
  // 两列常驻 DOM（收起只是 visibility: hidden），所以打开时能直接量到位置
  void nextTick(syncScroll)
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

/** 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    close()
  }
}

/* 点选外部关闭只在 H5（桌面下拉形态）成立，小程序端靠遮罩点击 */
// #ifdef H5
const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node
  if (rootRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  close()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
// #endif

onBeforeUnmount(() => {
  if (popTimer) clearTimeout(popTimer)
  // #ifdef H5
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view ref="rootRef" class="je-time" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <button
      type="button"
      class="je-time__trigger"
      :class="{ 'has-value': hasValue }"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="`${uid}-panel`"
      @tap="toggle"
      @keydown="onKeydown"
    >
      <text class="je-time__label">{{ triggerLabel || placeholder }}</text>
      <view class="je-time__icon" aria-hidden="true" />
    </button>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-time__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="`${uid}-panel`"
      ref="panelRef"
      class="je-time__panel"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      role="dialog"
      aria-label="选择时间"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-time__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <view class="je-time__title">选择小时和分钟</view>

      <view class="je-time__wheel">
        <scroll-view
          :id="`${uid}-hour`"
          class="je-time__column"
          scroll-y
          role="listbox"
          aria-label="小时"
          :scroll-top="scrollTops[0] || 0"
          :scroll-with-animation="scrollWithAnimation"
          :show-scrollbar="showScrollbar"
          @scroll="onColumnScroll(0, $event)"
        >
          <view class="je-time__column-inner">
            <button
              v-for="value in hours"
              :id="`${uid}-h-${value}`"
              :key="`h-${value}`"
              type="button"
              class="je-time__cell"
              :class="{ 'is-selected': value === hour, 'is-popping': popping === `h-${value}` }"
              role="option"
              :aria-selected="value === hour"
              @tap="selectHour(value)"
            >
              {{ pad(value) }}
            </button>
          </view>
        </scroll-view>

        <view class="je-time__sep" aria-hidden="true">:</view>

        <scroll-view
          :id="`${uid}-minute`"
          class="je-time__column"
          scroll-y
          role="listbox"
          aria-label="分钟"
          :scroll-top="scrollTops[1] || 0"
          :scroll-with-animation="scrollWithAnimation"
          :show-scrollbar="showScrollbar"
          @scroll="onColumnScroll(1, $event)"
        >
          <view class="je-time__column-inner">
            <button
              v-for="value in minutes"
              :id="`${uid}-m-${value}`"
              :key="`m-${value}`"
              type="button"
              class="je-time__cell"
              :class="{ 'is-selected': value === minute, 'is-popping': popping === `m-${value}` }"
              role="option"
              :aria-selected="value === minute"
              @tap="selectMinute(value)"
            >
              {{ pad(value) }}
            </button>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-time {
  position: relative;
  font-family: inherit;
}

.je-time__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.4;
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
.je-time__trigger::after,
.je-time__cell::after {
  border: none;
}

.je-time__trigger.has-value {
  color: var(--je-text);
}

.je-time__trigger:focus-visible,
.je-time.is-open .je-time__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-time__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 用纯 CSS 画一个钟表图标，避免引资源 */
.je-time__icon {
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 2px solid var(--je-text-faint);
  border-radius: 50%;
}

.je-time__icon::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  width: 1.5px;
  height: 5px;
  background: var(--je-text-faint);
  transform: translateX(-50%);
}

.je-time__icon::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 4px;
  height: 1.5px;
  background: var(--je-text-faint);
}

.je-time__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 50;
  padding: 16px;
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top center;
  /* 收起后必须屏蔽点击，否则动画期间面板是「隐形可点」的 */
  pointer-events: none;
  will-change: transform, opacity;
  /* 默认态就是收起态。展开方向用 .is-open 里的回弹过渡，收起方向用这里的 ease-in 过渡 */
  opacity: 0;
  visibility: hidden;
  transform: scale(0.94) translateY(-6px);
  /* visibility 要等收起动画跑完再切，否则面板会当场消失、看不到收起过程 */
  transition: transform 0.28s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.28s;
}

.je-time__panel.is-open {
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
  transform: scale(1, 1) translateY(0);
  /* 展开即回弹，visibility 立即生效 */
  transition: transform 0.38s var(--je-ease-out-back), opacity 0.24s ease-out;
}

.je-time__scrim {
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

.je-time__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-time__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-time__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

.je-time__title {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--je-text-faint);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.je-time__wheel {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 列改成 scroll-view：小程序端 overflow 不滚动，滚轮手势交给原生滚动 */
.je-time__column {
  flex: 1 1 0;
  min-width: 0;
  max-height: 180px;
  scrollbar-width: thin;
  scrollbar-color: var(--je-border-color) transparent;
}

.je-time__column-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 4px;
}

.je-time__column::-webkit-scrollbar {
  width: 4px;
}

.je-time__column::-webkit-scrollbar-thumb {
  background: var(--je-border-color);
  border-radius: 2px;
}

.je-time__cell {
  min-width: 48px;
  margin: 0;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.4;
  color: var(--je-text-faint);
  background: none;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  will-change: transform;
  transition: background 0.2s ease, color 0.2s ease;
}

.je-time__cell:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

/* 选中态用独立的 state 类；pop 动画靠 :class 绑定重播，不能再让指令式改 className */
.je-time__cell.is-selected {
  font-weight: 700;
  /* 选中格压在品牌渐变上，文字固定浅色 */
  color: var(--je-text-on-color);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

.je-time__cell:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-time__sep {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--je-text-faint);
}

.je-time.is-disabled .je-time__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 点中时 1 → 1.15 → 1 */
.je-time__cell.is-popping {
  animation: je-time-pop 0.6s;
}

@keyframes je-time-pop {
  0% {
    transform: scale(1);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  40% {
    transform: scale(1.15);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  100% {
    transform: scale(1);
  }
}

/* 窄屏：面板改成贴底的弹出层，并预留给安全区 */
@media (max-width: 768px) {
  .je-time__panel {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 101;
    max-height: 72vh;
    overflow-y: auto;
    padding: 4px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    transform-origin: bottom center;
    /* 这里不能设 touch-action: none，否则小时 / 分钟列表在触屏上没法滚动；
       拖拽手势的 touch-action 由 .je-time__handle 单独承担 */
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-time__panel.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-time__wheel {
    gap: 20px;
  }

  .je-time__column {
    max-height: 42vh;
  }

  /* 触屏热区不小于 44px */
  .je-time__cell {
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 展开 / 收起都直接切到位，不做过渡 */
  .je-time__panel,
  .je-time__panel.is-open,
  .je-time__scrim {
    transition: none;
  }

  .je-time__cell.is-popping {
    animation: none;
  }
}
</style>
