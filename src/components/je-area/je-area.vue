<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import { useJeLocale } from '../je-locale'
import type { JeAreaOption } from './types'

defineOptions({ name: 'JeArea' })

const props = withDefaults(
  defineProps<{
    /** 已选值，按「省 / 市 / 区」顺序 */
    modelValue?: (string | number)[]
    /** 省市区树形数据 */
    areaList?: JeAreaOption[]
    /** 面板标题 */
    title?: string
    /** 级数，一般 3 级 */
    columnsNum?: number
    /** 未选择时触发按钮上的占位文字 */
    placeholder?: string
    /** 未选择的标签页上的占位文字 */
    columnsPlaceholder?: string
    disabled?: boolean
    /** 确认按钮文字，未传时用语言包的 confirm 文案 */
    confirmText?: string
    /** 取消按钮文字，未传时用语言包的 cancel 文案 */
    cancelText?: string
    showToolbar?: boolean
    visibleItemCount?: number
    itemHeight?: number
    closeOnClickModal?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: () => [],
    areaList: () => [],
    title: '所在地区',
    columnsNum: 3,
    placeholder: '请选择所在地区',
    columnsPlaceholder: '请选择',
    disabled: false,
    confirmText: undefined,
    cancelText: undefined,
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
  change: [values: (string | number)[]]
  /** 点击确认 */
  confirm: [values: (string | number)[]]
  /** 点击取消或遮罩 */
  cancel: []
}>()

const { t } = useJeLocale()

/** 确认按钮文案：外部优先，未传时回退语言包的通用确定 */
const confirmText = computed(() => props.confirmText ?? t('confirm'))
/** 取消按钮文案：外部优先，未传时回退语言包的通用取消 */
const cancelText = computed(() => props.cancelText ?? t('cancel'))

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-area--${size.value}`))

/** 右侧箭头随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

const isOpen = ref(false)
const activeTab = ref(0)
const zIndex = ref(nextZIndex())

/** 打开期间的临时选择，确认才写回 modelValue */
const pending = ref<(string | number)[]>([])

/** 按「前 level 层已选值」推导第 level 层的候选列表 */
const optionsOf = (values: (string | number)[], level: number): JeAreaOption[] => {
  if (level === 0) return props.areaList
  const parent = optionsOf(values, level - 1).find((option) => option.value === values[level - 1])
  return parent?.children ?? []
}

const currentOptions = computed(() => optionsOf(pending.value, activeTab.value))

const selectedIndex = computed(() => {
  const index = currentOptions.value.findIndex(
    (option) => option.value === pending.value[activeTab.value],
  )
  return index >= 0 ? index : 0
})

/** 把外部传入的值规整成每一层都合法、且尽量保留原选择的数组 */
const normalize = (values: (string | number)[]) => {
  const next: (string | number)[] = []
  for (let level = 0; level < props.columnsNum; level += 1) {
    const options = optionsOf(next, level)
    const found = options.find((option) => option.value === values[level])
    next.push(found ? found.value : (options[0]?.value ?? ''))
  }
  return next
}

const tabLabels = computed(() =>
  Array.from({ length: props.columnsNum }, (_, level) => {
    const option = optionsOf(pending.value, level).find(
      (item) => item.value === pending.value[level],
    )
    return { text: option?.text ?? '', selected: Boolean(option) }
  }),
)

const triggerLabel = computed(() => {
  const parts: string[] = []
  for (let level = 0; level < props.columnsNum; level += 1) {
    const option = optionsOf(props.modelValue, level).find(
      (item) => item.value === props.modelValue[level],
    )
    if (option) parts.push(option.text)
  }
  return parts.join(' / ')
})

const hasValue = computed(() => triggerLabel.value !== '')

const scrollerStyle = computed(() => ({ height: `${props.itemHeight * props.visibleItemCount}px` }))
const spacerStyle = computed(() => ({
  height: `${(props.itemHeight * (props.visibleItemCount - 1)) / 2}px`,
}))
const itemStyle = computed(() => ({ height: `${props.itemHeight}px` }))
const indicatorStyle = computed(() => ({
  top: spacerStyle.value.height,
  height: `${props.itemHeight}px`,
}))

/* ---- 滚轮：scroll-view 原生滚动 + 停稳后按 scrollTop 反推并吸附 ---- */

/** 目标滚动位置，下发到 scroll-view 的 scroll-top */
const scrollTops = ref(0)
/** scroll-view 的两个布尔属性走 ref 下发（mp 端静态字面量 false 有丢失历史） */
const scrollWithAnimation = ref(true)
const showScrollbar = ref(false)

const syncScroll = () => {
  scrollTops.value = selectedIndex.value * props.itemHeight
}

/** 选中某一层后，把更深的层重置为该分支下的第一项 */
const resetDeeper = (base: (string | number)[], level: number) => {
  const next = [...base]
  for (let i = level + 1; i < props.columnsNum; i += 1) {
    const options = optionsOf(next, i)
    next[i] = options[0]?.value ?? ''
  }
  return next
}

let scrollTimer: ReturnType<typeof setTimeout> | undefined

/**
 * 滚动停下后：先按 scrollTop 反推最近的一格并吸附过去，再把它写成当前层的选中项。
 *
 * 吸附这一步是移动端必需的：小程序端的 scroll-view 既不吃 CSS scroll-snap，
 * 也不会自动对齐，只靠 scroll-snap 会停在两行之间。
 */
const onScroll = (event: any) => {
  const scrollTop = Number(event?.detail?.scrollTop ?? 0)
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const index = Math.round(scrollTop / props.itemHeight)
    const target = index * props.itemHeight
    // 只在确实偏了才回写，避免「赋值 → 触发 scroll → 再赋值」的空转
    if (scrollTops.value !== target) scrollTops.value = target

    const level = activeTab.value
    const option = currentOptions.value[index]
    if (!option || option.value === pending.value[level]) return
    const next = [...pending.value]
    next[level] = option.value
    pending.value = resetDeeper(next, level)
    emit('change', [...pending.value])
  }, 120)
}

const selectIndex = (index: number) => {
  const option = currentOptions.value[index]
  if (!option) return
  scrollTops.value = index * props.itemHeight
  const level = activeTab.value
  const next = [...pending.value]
  next[level] = option.value
  pending.value = resetDeeper(next, level)
  emit('change', [...pending.value])
}

const switchTab = (level: number) => {
  activeTab.value = level
  nextTick(syncScroll)
}

/* ---- 开关与工具栏 ---- */

const sheet = useSheetDrag(() => {
  sheet.reset()
  close()
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
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    onCancel()
  }
}
// #endif

const open = () => {
  if (props.disabled) return
  pending.value = normalize(props.modelValue)
  // 默认落在第一个还没选的层，减少一次点击
  const firstEmpty = pending.value.findIndex((_, level) => pending.value[level] === undefined)
  activeTab.value = firstEmpty > 0 ? firstEmpty : 0
  sheet.reset()
  zIndex.value = nextZIndex()
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
  emit('confirm', [...pending.value])
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

watch(isOpen, (value) => {
  // #ifdef H5
  setBodyScrollLock(value)
  if (value) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
  // #endif
})

watch(currentOptions, () => {
  nextTick(syncScroll)
})

onBeforeUnmount(() => {
  clearTimeout(scrollTimer)
  // #ifdef H5
  document.removeEventListener('keydown', onKeydown)
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view class="je-area" :class="[sizeClass, { 'is-open': isOpen, 'is-disabled': disabled }]">
    <button
      type="button"
      class="je-area__trigger"
      :class="{ 'has-value': hasValue }"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @tap="toggle"
    >
      <text class="je-area__label">{{ triggerLabel || placeholder }}</text>
      <JeIcon class="je-area__arrow" name="chevron-down" :size="iconSize" />
    </button>

    <view class="je-area__sheet" :class="{ 'is-open': isOpen }" :style="{ zIndex }">
      <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
      <view class="je-area__scrim" aria-hidden="true" @tap="onScrimClick" @touchmove.stop.prevent />

      <view
        class="je-area__panel"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="title || '地区选择'"
        :aria-hidden="!isOpen"
      >
        <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
        <view
          class="je-area__handle"
          aria-hidden="true"
          @touchstart="sheet.onTouchStart"
          @touchmove.stop.prevent="sheet.onTouchMove"
          @touchend="sheet.onTouchEnd"
          @touchcancel="sheet.onTouchCancel"
          @mousedown="sheet.onMouseDown"
        />

        <view v-if="showToolbar" class="je-area__toolbar">
          <button type="button" class="je-area__toolbar-btn" @tap="onCancel">
            {{ cancelText }}
          </button>
          <view class="je-area__title">{{ title }}</view>
          <button
            type="button"
            class="je-area__toolbar-btn je-area__toolbar-btn--confirm"
            @tap="onConfirm"
          >
            {{ confirmText }}
          </button>
        </view>

        <view class="je-area__tabs" role="tablist">
          <button
            v-for="(tab, level) in tabLabels"
            :key="level"
            type="button"
            class="je-area__tab"
            :class="{ 'is-active': level === activeTab, 'has-value': tab.selected }"
            role="tab"
            :aria-selected="level === activeTab"
            @tap="switchTab(level)"
          >
            {{ tab.selected ? tab.text : columnsPlaceholder }}
          </button>
        </view>

        <view class="je-area__wheel" :style="scrollerStyle">
          <view class="je-area__indicator" :style="indicatorStyle" aria-hidden="true" />

          <scroll-view
            class="je-area__scroller"
            :style="scrollerStyle"
            scroll-y
            role="listbox"
            :scroll-top="scrollTops"
            :scroll-with-animation="scrollWithAnimation"
            :show-scrollbar="showScrollbar"
            @scroll="onScroll"
          >
            <view class="je-area__spacer" :style="spacerStyle" aria-hidden="true" />

            <button
              v-for="(option, index) in currentOptions"
              :key="option.value"
              type="button"
              class="je-area__item"
              :class="{ 'is-selected': index === selectedIndex }"
              :style="itemStyle"
              role="option"
              :aria-selected="index === selectedIndex"
              @tap="selectIndex(index)"
            >
              {{ option.text }}
            </button>

            <view class="je-area__spacer" :style="spacerStyle" aria-hidden="true" />
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-area {
  position: relative;
  font-family: inherit;
}

.je-area__trigger {
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
.je-area--small .je-area__trigger {
  height: var(--je-touch-h-sm);
  padding: 0 12px;
  font-size: 14px;
}

.je-area--large .je-area__trigger {
  height: var(--je-touch-h-lg);
  padding: 0 20px;
  font-size: 17px;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-area__trigger::after,
.je-area__toolbar-btn::after,
.je-area__tab::after,
.je-area__item::after {
  border: none;
}

.je-area__trigger.has-value {
  color: var(--je-text);
}

.je-area__trigger:focus-visible,
.je-area.is-open .je-area__trigger {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-area__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-area__arrow {
  flex-shrink: 0;
  transition: transform var(--je-duration) ease;
}

.je-area.is-open .je-area__arrow {
  transform: rotate(180deg);
}

.je-area.is-disabled .je-area__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 浮层容器铺满视口，收起时必须放行点击 */
.je-area__sheet {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

.je-area__sheet.is-open {
  pointer-events: auto;
}

.je-area__scrim {
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

.je-area__sheet.is-open .je-area__scrim {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-area__panel {
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

.je-area__sheet.is-open .je-area__panel {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
}

.je-area__handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  /* 抓手是独立手势元素，可以独占 touch-action；滚轮列本身不能设 */
  touch-action: none;
}

.je-area__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

.je-area__toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px 6px;
}

.je-area__title {
  flex: 1 1 auto;
  margin: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-area__toolbar-btn {
  flex-shrink: 0;
  min-width: 56px;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.4;
  color: var(--je-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

.je-area__toolbar-btn:hover {
  background: var(--je-surface-hover);
}

.je-area__toolbar-btn:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-area__toolbar-btn--confirm {
  font-weight: 600;
  color: var(--je-primary);
}

.je-area__tabs {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  padding: 0 4px 8px;
}

.je-area__tab {
  flex: 1 1 0;
  min-width: 0;
  min-height: 36px;
  margin: 0;
  padding: 6px 8px;
  overflow: hidden;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  color: var(--je-text-faint);
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

.je-area__tab.has-value {
  color: var(--je-text);
}

.je-area__tab.is-active {
  font-weight: 600;
  color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 14%, transparent);
}

.je-area__tab:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-area__wheel {
  position: relative;
}

/* 中间选中行的提示条，压在选项下面 */
.je-area__indicator {
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

/* 列改成 scroll-view：小程序端 overflow 不滚动，滚轮手势交给原生滚动 */
.je-area__scroller {
  position: relative;
  z-index: 1;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.je-area__scroller::-webkit-scrollbar {
  display: none;
}

.je-area__spacer {
  width: 100%;
}

.je-area__item {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 0 8px;
  overflow: hidden;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4;
  color: var(--je-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  outline: none;
  scroll-snap-align: center;
  transition: color var(--je-duration) ease;
}

.je-area__item.is-selected {
  font-weight: 700;
  color: var(--je-text);
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-area__scrim,
  .je-area__panel,
  .je-area__arrow,
  .je-area__sheet.is-open .je-area__scrim,
  .je-area__sheet.is-open .je-area__panel {
    transition: none;
  }
}
</style>
