<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JePickerColumn, JePickerOption } from './types'

defineOptions({ name: 'JePicker' })

const props = withDefaults(
  defineProps<{
    /** 每列已选中的值，长度与 columns 对应 */
    modelValue?: (string | number)[]
    /** 列定义 */
    columns?: JePickerColumn[]
    /** 面板标题 */
    title?: string
    /** 未选择时触发按钮上的占位文字 */
    placeholder?: string
    /** 禁用整个选择器 */
    disabled?: boolean
    /** 确认按钮文字 */
    confirmText?: string
    /** 取消按钮文字 */
    cancelText?: string
    /** 是否显示顶部工具栏（取消 / 标题 / 确认） */
    showToolbar?: boolean
    /** 每列可见的选项行数，建议用奇数 */
    visibleItemCount?: number
    /** 单行高度 */
    itemHeight?: number
    /** 点击遮罩关闭 */
    closeOnClickModal?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: () => [],
    columns: () => [],
    title: '',
    placeholder: '请选择',
    disabled: false,
    confirmText: '确认',
    cancelText: '取消',
    showToolbar: true,
    visibleItemCount: 5,
    itemHeight: 44,
    closeOnClickModal: true,
    size: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [values: (string | number)[]]
  /** 某一列滚动停下后 */
  change: [values: (string | number)[], options: (JePickerOption | undefined)[]]
  /** 点击确认 */
  confirm: [values: (string | number)[], options: (JePickerOption | undefined)[]]
  /** 点击取消或遮罩 */
  cancel: []
}>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-picker--${size.value}`))

/** 右侧箭头随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

const uid = useUid('je-picker')
const isOpen = ref(false)
const zIndex = ref(nextZIndex())

/** scroll-view 的两个布尔属性走 ref 下发（mp 端静态字面量 false 有丢失历史） */
const scrollWithAnimation = ref(true)
const showScrollbar = ref(false)

/** 打开期间的临时选择，确认才写回 modelValue */
const pending = ref<(string | number)[]>([])

const selectedIndexes = computed(() =>
  props.columns.map((column, index) => {
    const position = column.options.findIndex((option) => option.value === pending.value[index])
    return position >= 0 ? position : 0
  }),
)

const selectedOptions = computed(() =>
  props.columns.map((column, index) =>
    column.options.find((option) => option.value === pending.value[index]),
  ),
)

const triggerLabel = computed(() => {
  const texts = props.columns
    .map((column, index) => column.options.find((option) => option.value === props.modelValue[index])?.text)
    .filter((text): text is string => Boolean(text))
  return texts.join(' / ')
})

const hasValue = computed(() => triggerLabel.value !== '')

/* ---- 滚轮：scroll-view 原生滚动 + 停稳后按 scrollTop 反推并吸附 ---- */

/** 每一列的目标滚动位置，下发到 scroll-view 的 scroll-top */
const scrollTops = ref<number[]>([])
const scrollTimers: (ReturnType<typeof setTimeout> | undefined)[] = []

const scrollerStyle = computed(() => ({ height: `${props.itemHeight * props.visibleItemCount}px` }))
const spacerStyle = computed(() => ({
  height: `${(props.itemHeight * (props.visibleItemCount - 1)) / 2}px`,
}))
const itemStyle = computed(() => ({ height: `${props.itemHeight}px` }))
const indicatorStyle = computed(() => ({
  top: spacerStyle.value.height,
  height: `${props.itemHeight}px`,
}))

/** 首尾补半屏空白，使 scrollTop = i * itemHeight 时第 i 项正好居中 */
const syncScroll = () => {
  scrollTops.value = props.columns.map(
    (_, columnIndex) => selectedIndexes.value[columnIndex] * props.itemHeight,
  )
}

/**
 * 滚动停下后：先按 scrollTop 反推最近的一格并吸附过去，再把它写成当前列的选中项。
 *
 * 吸附这一步是移动端必需的：小程序端的 scroll-view 既不吃 CSS scroll-snap，
 * 也不会自动对齐，只靠 scroll-snap 会停在两行之间。
 */
const onColumnScroll = (columnIndex: number, event: any) => {
  const scrollTop = Number(event?.detail?.scrollTop ?? 0)
  clearTimeout(scrollTimers[columnIndex])
  scrollTimers[columnIndex] = setTimeout(() => {
    const index = Math.round(scrollTop / props.itemHeight)
    const target = index * props.itemHeight
    // 只在确实偏了才回写，避免「赋值 → 触发 scroll → 再赋值」的空转
    if (scrollTops.value[columnIndex] !== target) {
      scrollTops.value[columnIndex] = target
    }
    const option = props.columns[columnIndex]?.options[index]
    if (!option || option.value === pending.value[columnIndex]) return
    const next = [...pending.value]
    next[columnIndex] = option.value
    pending.value = next
    emit('change', [...next], selectedOptions.value)
  }, 120)
}

const selectIndex = (columnIndex: number, index: number) => {
  const option = props.columns[columnIndex]?.options[index]
  if (!option || option.disabled) return
  scrollTops.value[columnIndex] = index * props.itemHeight
  const next = [...pending.value]
  next[columnIndex] = option.value
  pending.value = next
  emit('change', [...next], selectedOptions.value)
}

/* ---- 开关与工具栏 ---- */

const sheet = useSheetDrag(() => {
  sheet.reset()
  close()
})

const open = () => {
  if (props.disabled) return
  pending.value = props.columns.map((column, index) => {
    const value = props.modelValue[index]
    if (value !== undefined && column.options.some((option) => option.value === value)) return value
    return column.options[0]?.value ?? ''
  })
  sheet.reset()
  isOpen.value = true
  nextTick(syncScroll)
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
}

const toggle = () => {
  if (props.disabled) return
  if (isOpen.value) close()
  else open()
}

const onConfirm = () => {
  emit('update:modelValue', [...pending.value])
  emit('confirm', [...pending.value], selectedOptions.value)
  close()
}

const onCancel = () => {
  emit('cancel')
  close()
}

const onScrimClick = () => {
  if (props.closeOnClickModal) onCancel()
}

const panelStyle = computed(() => {
  const base = { zIndex: zIndex.value }
  if (!sheet.dragging.value && !sheet.offset.value) return base
  return { ...base, transform: `translateY(${sheet.offset.value}px)` }
})

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

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.preventDefault()
  onCancel()
}
// #endif

watch(isOpen, (value) => {
  if (value) zIndex.value = nextZIndex()
  // #ifdef H5
  setBodyScrollLock(value)
  if (value) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
  // #endif
})

/*
 * 联动的父列换了选项之后，子列的 pending 可能落在新选项之外（例如把「城市」从北京切到杭州，
 * 区域还停在北京的「朝阳区」）。这里把每列失效的值归位到新列第一项，并重新吸附滚动位置，
 * 否则确认时会把一个已不存在的值回传出去。
 */
watch(
  () => props.columns,
  () => {
    const next = props.columns.map((column, index) => {
      const value = pending.value[index]
      if (value !== undefined && column.options.some((option) => option.value === value)) return value
      return column.options[0]?.value ?? ''
    })
    if (next.some((value, index) => value !== pending.value[index])) {
      pending.value = next
      emit('change', [...next], selectedOptions.value)
    }
    if (isOpen.value) nextTick(syncScroll)
  },
  { deep: true },
)

onBeforeUnmount(() => {
  scrollTimers.forEach((timer) => clearTimeout(timer))
  // #ifdef H5
  document.removeEventListener('keydown', onKeydown)
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view class="je-picker" :class="[sizeClass, { 'is-open': isOpen, 'is-disabled': disabled }]">
    <button
      type="button"
      class="je-picker__trigger"
      :class="{ 'has-value': hasValue }"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="`${uid}-panel`"
      @tap="toggle"
    >
      <text class="je-picker__label">{{ triggerLabel || placeholder }}</text>
      <JeIcon class="je-picker__arrow" name="chevron-down" :size="iconSize" />
    </button>

    <view class="je-picker__sheet" :class="{ 'is-open': isOpen }" :style="{ zIndex }">
      <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
      <view class="je-picker__scrim" aria-hidden="true" @tap="onScrimClick" @touchmove.stop.prevent />

      <view
        :id="`${uid}-panel`"
        class="je-picker__panel"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="title || '选择器'"
        :aria-hidden="!isOpen"
      >
        <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
        <view
          class="je-picker__handle"
          aria-hidden="true"
          @touchstart="sheet.onTouchStart"
          @touchmove.stop.prevent="sheet.onTouchMove"
          @touchend="sheet.onTouchEnd"
          @touchcancel="sheet.onTouchCancel"
          @mousedown="sheet.onMouseDown"
        />

        <view v-if="showToolbar" class="je-picker__toolbar">
          <button type="button" class="je-picker__toolbar-btn" @tap="onCancel">
            {{ cancelText }}
          </button>
          <text class="je-picker__title">{{ title }}</text>
          <button
            type="button"
            class="je-picker__toolbar-btn je-picker__toolbar-btn--confirm"
            @tap="onConfirm"
          >
            {{ confirmText }}
          </button>
        </view>

        <view class="je-picker__wheel">
          <view
            v-for="(column, columnIndex) in columns"
            :key="column.name ?? columnIndex"
            class="je-picker__column"
          >
            <view class="je-picker__indicator" :style="indicatorStyle" aria-hidden="true" />

            <scroll-view
              class="je-picker__scroller"
              :style="scrollerStyle"
              scroll-y
              :scroll-top="scrollTops[columnIndex] || 0"
              :scroll-with-animation="scrollWithAnimation"
              :show-scrollbar="showScrollbar"
              @scroll="onColumnScroll(columnIndex, $event)"
            >
              <view class="je-picker__spacer" :style="spacerStyle" aria-hidden="true" />

              <button
                v-for="(option, index) in column.options"
                :key="option.value"
                type="button"
                class="je-picker__item"
                :class="{
                  'is-selected': index === selectedIndexes[columnIndex],
                  'is-disabled': option.disabled,
                }"
                :style="itemStyle"
                :disabled="option.disabled"
                @tap="selectIndex(columnIndex, index)"
              >
                <text class="je-picker__item-text">{{ option.text }}</text>
                <text v-if="option.subText" class="je-picker__item-sub">{{ option.subText }}</text>
              </button>

              <view class="je-picker__spacer" :style="spacerStyle" aria-hidden="true" />
            </scroll-view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-picker {
  position: relative;
  font-family: inherit;
}

.je-picker__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  /* 定高 44px，与 je-input / je-select 同一档；宽度由左右内边距撑 */
  height: var(--je-touch-h);
  padding: 0 16px;
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

/* 尺寸三档：只覆盖高度 / 左右内边距 / 字号，配色、圆角、交互状态都沿用基础样式。
   三档与 je-input 同口径，同一表单行里的控件能对齐 */
.je-picker--small .je-picker__trigger {
  height: var(--je-touch-h-sm);
  padding: 0 12px;
  font-size: 14px;
}

.je-picker--large .je-picker__trigger {
  height: var(--je-touch-h-lg);
  padding: 0 20px;
  font-size: 17px;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-picker__trigger::after,
.je-picker__toolbar-btn::after,
.je-picker__item::after {
  border: none;
}

.je-picker__trigger.has-value {
  color: var(--je-text);
}

.je-picker__trigger:focus-visible,
.je-picker.is-open .je-picker__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-picker__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-picker__arrow {
  flex-shrink: 0;
  transition: transform var(--je-duration) ease;
}

.je-picker.is-open .je-picker__arrow {
  transform: rotate(180deg);
}

.je-picker.is-disabled .je-picker__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 浮层容器铺满视口，收起时必须放行点击 */
.je-picker__sheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

.je-picker__sheet.is-open {
  pointer-events: auto;
}

.je-picker__scrim {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-picker__sheet.is-open .je-picker__scrim {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-picker__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 8px calc(12px + env(safe-area-inset-bottom, 0px));
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 22px 22px 0 0;
  box-shadow: var(--je-shadow-popup);
  outline: none;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(100%);
  transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
}

.je-picker__sheet.is-open .je-picker__panel {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
}

.je-picker__handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  /* 抓手是独立手势元素，可以独占 touch-action；列本身不能设，否则滚不动 */
  touch-action: none;
}

.je-picker__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

.je-picker__toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px 10px;
}

.je-picker__title {
  flex: 1 1 auto;
  margin: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-picker__toolbar-btn {
  flex-shrink: 0;
  min-width: 56px;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.4;
  color: var(--je-text-muted);
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

.je-picker__toolbar-btn:hover {
  background: var(--je-surface-hover);
}

.je-picker__toolbar-btn:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-picker__toolbar-btn--confirm {
  font-weight: 600;
  color: var(--je-primary);
}

.je-picker__wheel {
  display: flex;
  gap: 4px;
}

.je-picker__column {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
}

/* 中间选中行的提示条，压在选项下面 */
.je-picker__indicator {
  position: absolute;
  right: 4px;
  left: 4px;
  z-index: 0;
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--je-primary) 30%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--je-primary) 30%, transparent);
  border-radius: var(--je-radius-sm);
  pointer-events: none;
}

/* 列本身不能设 touch-action，否则触屏滚不动；吸附由 scroll-snap（H5）+ 停稳回写兜底 */
.je-picker__scroller {
  position: relative;
  z-index: 1;
  scroll-snap-type: y mandatory;
}

.je-picker__spacer {
  width: 100%;
}

.je-picker__item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 0 8px;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4;
  color: var(--je-text-muted);
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  scroll-snap-align: center;
  outline: none;
  transition: color var(--je-duration) ease;
}

.je-picker__item.is-selected {
  font-weight: 700;
  color: var(--je-text);
}

.je-picker__item.is-disabled {
  color: var(--je-text-faint);
  cursor: not-allowed;
}

.je-picker__item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-picker__item-sub {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--je-text-faint);
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-picker__scrim,
  .je-picker__panel,
  .je-picker__arrow,
  .je-picker__sheet.is-open .je-picker__scrim,
  .je-picker__sheet.is-open .je-picker__panel {
    transition: none;
  }
}
</style>
