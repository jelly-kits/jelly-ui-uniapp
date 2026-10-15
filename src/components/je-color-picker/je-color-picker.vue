<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSheetDrag } from '../../core/useSheetDrag'
import { useUid } from '../../core/useUid'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeColorPickerSize } from './types'

defineOptions({ name: 'JeColorPicker' })

const props = withDefaults(
  defineProps<{
    /** 十六进制颜色，showAlpha 开启时为 8 位 #RRGGBBAA */
    modelValue?: string
    disabled?: boolean
    showAlpha?: boolean
    predefine?: string[]
    size?: JeColorPickerSize
  }>(),
  {
    modelValue: '#667eea',
    disabled: false,
    showAlpha: false,
    predefine: undefined,
    size: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [color: string]
  change: [color: string]
  'active-change': [color: string]
}>()

/** 尺寸：组件自身优先，再退回全局配置（JeConfigProvider）；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-color-picker--${size.value}`))

/** 右侧箭头随档位缩放，与其余表单控件同一套口径 */
const CONTROL_ICON: Record<JeConfigSize, number> = { small: 14, default: 16, large: 18 }
const iconSize = computed(() => CONTROL_ICON[size.value])

/* ---------- 颜色换算（纯函数，零依赖，与主库一致） ---------- */

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()

/** 支持 #RRGGBB 与 #RRGGBBAA，解析失败返回 null */
const hexToRgb = (hex: string): [number, number, number, number] | null => {
  const value = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) return null
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1,
  ]
}

const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2)
    else h = 60 * ((rn - gn) / delta + 4)
  }
  if (h < 0) h += 360
  return [Math.round(h), max === 0 ? 0 : delta / max, max]
}

/* ---------- 状态 ---------- */

const uid = useUid('je-color-picker')
const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const svRef = ref<HTMLElement | null>(null)
const hueRef = ref<HTMLElement | null>(null)
const alphaRef = ref<HTMLElement | null>(null)

/** 小程序端拿不到 DOM 引用，几何靠 SelectorQuery 量；H5 下才是真实元素 */
const instance = getCurrentInstance()

const hue = ref(230)
const sat = ref(0.5)
const val = ref(0.92)
const alpha = ref(1)
const hexDraft = ref('#667EEA')
const isOpen = ref(false)
const zIndex = ref(nextZIndex())

/** 当前拖拽的取色区域；null 表示未在拖拽 */
type DragTarget = 'sv' | 'hue' | 'alpha'
let draggingTarget: DragTarget | null = null

/** 拖拽期间缓存的区域几何（视口坐标系），避免每次移动都重新量 */
interface AreaRect {
  left: number
  top: number
  width: number
  height: number
}
let activeRect: AreaRect | null = null

const currentRgb = computed(() => hsvToRgb(hue.value, sat.value, val.value))

const currentColor = computed(() => {
  const hex = rgbToHex(currentRgb.value[0], currentRgb.value[1], currentRgb.value[2])
  if (!props.showAlpha) return hex
  return hex + Math.round(clamp(alpha.value, 0, 1) * 255).toString(16).padStart(2, '0').toUpperCase()
})

const hueColor = computed(() => {
  const rgb = hsvToRgb(hue.value, 1, 1)
  return rgbToHex(rgb[0], rgb[1], rgb[2])
})

const hexValid = computed(() => hexToRgb(hexDraft.value) !== null)

const svThumbStyle = computed(() => ({
  left: `${sat.value * 100}%`,
  top: `${(1 - val.value) * 100}%`,
  background: currentColor.value,
}))

/* 饱和度 / 明度底板的色相层直接写进内联 background，免去小程序端依赖 CSS 自定义属性 */
const svStyle = computed(() => ({
  background:
    `linear-gradient(to top, #000, transparent), ` +
    `linear-gradient(to right, #fff, transparent), ${hueColor.value}`,
}))

const hueThumbStyle = computed(() => ({ left: `${(hue.value / 360) * 100}%` }))
const alphaThumbStyle = computed(() => ({ left: `${clamp(alpha.value, 0, 1) * 100}%` }))

const alphaTrackStyle = computed(() => ({
  backgroundImage: `linear-gradient(to right, transparent, ${rgbToHex(
    currentRgb.value[0],
    currentRgb.value[1],
    currentRgb.value[2],
  )})`,
}))

const applyValue = (value: string) => {
  const parsed = hexToRgb(value)
  if (!parsed) return
  const [r, g, b, a] = parsed
  const [h, s, v] = rgbToHsv(r, g, b)
  // 灰度没有色相信息，保留当前色相，避免滑条无故跳回 0
  if (s > 0) hue.value = h
  sat.value = s
  val.value = v
  if (props.showAlpha) alpha.value = a
}

watch(() => props.modelValue, applyValue, { immediate: true })
watch(currentColor, (value) => {
  hexDraft.value = value
}, { immediate: true })

/* ---------- 面板开合 ---------- */

/**
 * 窄屏切底部弹出层。小程序端没有 window，恒按窄屏处理；
 * H5 在挂载时按视口宽判一次（口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)

const locked = computed(() => isMobile.value && isOpen.value)

/* H5 锁 body 滚动；小程序端没有 body，锁屏交给遮罩层的 touchmove 阻断 */
// #ifdef H5
let previousOverflow = ''

const setBodyScrollLock = (lockedNow: boolean) => {
  if (lockedNow) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousOverflow
}

watch(locked, (value) => setBodyScrollLock(value))
// #endif

/* 抓手下拉关闭：位移只做视觉反馈，松手超过阈值才真正收起 */
const sheet = useSheetDrag(() => close())

/** 拖拽时用内联 transform 覆盖面板的滑入位移，松手后交还给 CSS 过渡 */
const panelStyle = computed(() => {
  const style: Record<string, string | number> = { zIndex: zIndex.value }
  // 收起态交给 CSS 的 translateY(100%)，这里不能写 inline transform，否则会盖掉收起位移
  if (isMobile.value && isOpen.value) {
    style.transform = `translateY(${sheet.offset.value}px)`
    if (sheet.dragging.value) style.transition = 'none'
  }
  return style
})

const open = () => {
  if (props.disabled) return
  sheet.reset()
  zIndex.value = nextZIndex()
  isOpen.value = true
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

/** 键盘只在 H5 存在；小程序端该绑定永不触发 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.preventDefault()
  close()
}

/* H5 点外部关闭（桌面浮层形态）；小程序端没有 document，靠透明遮罩 */
// #ifdef H5
/** H5 下模板 ref 指向的是 uni-view 实例，真实 DOM 挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const root = pick(rootRef.value)
  const target = event.target as Node | null
  if (root && target && root.contains(target)) return
  close()
}
// #endif

/* ---------- 取色交互 ---------- */

const commit = () => {
  emit('update:modelValue', currentColor.value)
  emit('change', currentColor.value)
}

const targetRef = (target: DragTarget) => {
  if (target === 'sv') return svRef
  if (target === 'hue') return hueRef
  return alphaRef
}

const targetSelector = (target: DragTarget) =>
  target === 'sv'
    ? '.je-color-picker__sv'
    : target === 'hue'
      ? '.je-color-picker__hue'
      : '.je-color-picker__alpha'

/**
 * 原库用 getBoundingClientRect 把 clientX/Y 换算成比例，小程序端没有 DOM。
 * H5 走真实元素、小程序端走 SelectorQuery，量到的都是「视口坐标系下的区域」，换算结果一致。
 */
const measureTarget = (target: DragTarget, done: (rect: AreaRect) => void) => {
  // #ifdef H5
  const el = pick(targetRef(target).value)
  const rect = el?.getBoundingClientRect?.()
  if (rect) {
    done({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
  }
  // #endif
  // #ifndef H5
  if (instance?.proxy) {
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select(targetSelector(target))
      .boundingClientRect((result) => {
        const info = (Array.isArray(result) ? result[0] : result) as unknown as AreaRect | undefined
        if (info && typeof info.left === 'number' && typeof info.width === 'number') {
          done(info)
        }
      })
      .exec()
  }
  // #endif
}

const applyPick = (target: DragTarget, clientX: number, clientY: number, rect: AreaRect) => {
  if (!rect.width) return
  if (target === 'sv') {
    sat.value = clamp((clientX - rect.left) / rect.width, 0, 1)
    val.value = rect.height ? 1 - clamp((clientY - rect.top) / rect.height, 0, 1) : val.value
  } else if (target === 'hue') {
    hue.value = clamp((clientX - rect.left) / rect.width, 0, 1) * 360
  } else {
    alpha.value = clamp((clientX - rect.left) / rect.width, 0, 1)
  }
  emit('active-change', currentColor.value)
}

const startDrag = (target: DragTarget, clientX: number, clientY: number) => {
  draggingTarget = target
  measureTarget(target, (rect) => {
    if (draggingTarget !== target) return
    activeRect = rect
    applyPick(target, clientX, clientY, rect)
  })
}

const moveDrag = (clientX: number, clientY: number) => {
  if (!draggingTarget || !activeRect) return
  applyPick(draggingTarget, clientX, clientY, activeRect)
}

const endDrag = () => {
  if (!draggingTarget) return
  draggingTarget = null
  activeRect = null
  commit()
}

const onAreaMouseDown = (target: DragTarget, event: MouseEvent) => {
  if (props.disabled) return
  event.preventDefault()
  startDrag(target, event.clientX, event.clientY)
}

const onAreaTouchStart = (target: DragTarget, event: TouchEvent) => {
  if (props.disabled) return
  const touch = event.touches?.[0]
  if (!touch) return
  startDrag(target, touch.clientX, touch.clientY)
}

const onAreaTouchMove = (event: TouchEvent) => {
  const touch = event.touches?.[0]
  if (!touch) return
  moveDrag(touch.clientX, touch.clientY)
}

const onAreaEnd = () => endDrag()

/** H5 桌面拖动：按下收在区域上，移动 / 抬起挂到 document，划出区域也能继续取色 */
// #ifdef H5
const onDocMouseMove = (event: MouseEvent) => {
  if (!draggingTarget) return
  moveDrag(event.clientX, event.clientY)
}

const onDocMouseUp = () => endDrag()
// #endif

const pickPredefine = (color: string) => {
  if (props.disabled) return
  applyValue(color)
  emit('active-change', currentColor.value)
  commit()
}

const onHexInput = (event: Event) => {
  const detail = (event as unknown as { detail?: { value?: string } }).detail
  hexDraft.value = detail?.value ?? ''
  if (hexToRgb(hexDraft.value)) emit('active-change', hexDraft.value.trim().toUpperCase())
}

/** 小程序没有原生 change，用「软键盘完成 / 失焦」代它做提交语义 */
const commitHex = () => {
  if (!hexToRgb(hexDraft.value)) {
    hexDraft.value = currentColor.value
    return
  }
  applyValue(hexDraft.value)
  hexDraft.value = currentColor.value
  commit()
}

/* ------------------------------------------------------------------ 生命周期 */

onMounted(() => {
  // #ifdef H5
  isMobile.value = window.innerWidth <= 768
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
  setBodyScrollLock(false)
  // #endif
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-color-picker"
    :class="[sizeClass, { 'is-disabled': disabled, 'is-open': isOpen }]"
    @keydown="onKeydown"
  >
    <view
      class="je-color-picker__trigger"
      role="button"
      :tabindex="disabled ? -1 : 0"
      :aria-label="`选择颜色，当前 ${currentColor}`"
      :aria-expanded="isOpen"
      :aria-controls="`${uid}-panel`"
      @tap="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <view class="je-color-picker__swatch" :style="{ background: currentColor }" aria-hidden="true" />
      <text class="je-color-picker__value">{{ currentColor }}</text>
      <JeIcon name="chevron-down" :size="iconSize" class="je-color-picker__arrow" />
    </view>

    <!-- 遮罩层同时吞掉穿透的滚动：小程序端没有 body，锁屏只能靠这里 -->
    <view
      v-if="isMobile"
      class="je-color-picker__scrim"
      :class="{ 'is-open': isOpen }"
      aria-hidden="true"
      @tap="close"
      @touchmove.stop.prevent
    />

    <view
      :id="`${uid}-panel`"
      ref="panelRef"
      class="je-color-picker__panel"
      :class="{ 'is-open': isOpen }"
      :style="panelStyle"
      role="dialog"
      aria-label="颜色选择"
      :aria-hidden="!isOpen"
    >
      <!-- 抓手是独立的手势元素，触摸与鼠标两套通道都绑在它上面 -->
      <view
        v-if="isMobile"
        class="je-color-picker__handle"
        aria-hidden="true"
        @touchstart="sheet.onTouchStart"
        @touchmove.stop.prevent="sheet.onTouchMove"
        @touchend="sheet.onTouchEnd"
        @touchcancel="sheet.onTouchCancel"
        @mousedown="sheet.onMouseDown"
      />

      <view
        ref="svRef"
        class="je-color-picker__sv"
        :style="svStyle"
        @mousedown="onAreaMouseDown('sv', $event)"
        @touchstart="onAreaTouchStart('sv', $event)"
        @touchmove.stop.prevent="onAreaTouchMove"
        @touchend="onAreaEnd"
        @touchcancel="onAreaEnd"
      >
        <view class="je-color-picker__thumb" :style="svThumbStyle" />
      </view>

      <view
        ref="hueRef"
        class="je-color-picker__hue"
        @mousedown="onAreaMouseDown('hue', $event)"
        @touchstart="onAreaTouchStart('hue', $event)"
        @touchmove.stop.prevent="onAreaTouchMove"
        @touchend="onAreaEnd"
        @touchcancel="onAreaEnd"
      >
        <view class="je-color-picker__thumb" :style="hueThumbStyle" />
      </view>

      <view
        v-if="showAlpha"
        ref="alphaRef"
        class="je-color-picker__alpha"
        @mousedown="onAreaMouseDown('alpha', $event)"
        @touchstart="onAreaTouchStart('alpha', $event)"
        @touchmove.stop.prevent="onAreaTouchMove"
        @touchend="onAreaEnd"
        @touchcancel="onAreaEnd"
      >
        <view class="je-color-picker__alpha-track" :style="alphaTrackStyle" />
        <view class="je-color-picker__thumb" :style="alphaThumbStyle" />
      </view>

      <view v-if="predefine && predefine.length > 0" class="je-color-picker__predefine">
        <button
          v-for="color in predefine"
          :key="color"
          type="button"
          class="je-color-picker__pre"
          :class="{ 'is-active': currentColor === color.toUpperCase() }"
          :style="{ background: color }"
          :aria-label="`预设颜色 ${color}`"
          @tap="pickPredefine(color)"
        />
      </view>

      <view class="je-color-picker__field">
        <text class="je-color-picker__prefix" aria-hidden="true">HEX</text>
        <input
          class="je-color-picker__hex"
          :class="{ 'is-invalid': !hexValid }"
          type="text"
          :value="hexDraft"
          :disabled="disabled"
          aria-label="十六进制颜色值"
          @input="onHexInput"
          @confirm="commitHex"
          @blur="commitHex"
        >
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-color-picker {
  position: relative;
  display: inline-block;
  font-family: inherit;
}

.je-color-picker__trigger {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  gap: 8px;
  /* 定高三档，与 je-input / je-select 同一套 token；宽度由左右内边距撑 */
  height: var(--je-touch-h);
  padding: 0 12px;
  font-size: 14px;
  color: var(--je-text);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  cursor: pointer;
  outline: none;
  transition: border-color var(--je-duration) ease, box-shadow var(--je-duration) ease;
}

.je-color-picker__trigger:hover {
  background: var(--je-surface-hover);
}

.je-color-picker__trigger:focus-visible,
.je-color-picker.is-open .je-color-picker__trigger {
  border-color: var(--je-primary);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

.je-color-picker--small .je-color-picker__trigger {
  height: var(--je-touch-h-sm);
  padding: 0 10px;
  font-size: 13px;
}

.je-color-picker--large .je-color-picker__trigger {
  height: var(--je-touch-h-lg);
  padding: 0 14px;
  font-size: 15px;
}

.je-color-picker__swatch {
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  border: 1px solid var(--je-border-color);
  border-radius: 5px;
}

.je-color-picker--large .je-color-picker__swatch {
  width: 22px;
  height: 22px;
}

.je-color-picker__value {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.je-color-picker__arrow {
  color: var(--je-text-faint);
  transition: transform var(--je-duration) var(--je-ease-overshoot);
}

.je-color-picker.is-open .je-color-picker__arrow {
  transform: rotate(180deg);
}

.je-color-picker.is-disabled .je-color-picker__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 面板常驻 DOM，收起态只用 visibility，过渡才不会被 display 打断 */
.je-color-picker__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 2000;
  box-sizing: border-box;
  width: 240px;
  padding: 12px;
  font-family: inherit;
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top left;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.94) translateY(-6px);
  transition: transform 0.26s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.26s;
}

.je-color-picker__panel.is-open {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: scale(1) translateY(0);
  transition: transform 0.36s var(--je-ease-out-back), opacity 0.22s ease-out;
}

/* 饱和度 / 明度二维网格（色相层由内联 background 覆盖，这里只兜底） */
.je-color-picker__sv {
  position: relative;
  height: 140px;
  margin-bottom: 10px;
  background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent),
    #f00;
  border-radius: var(--je-radius-sm);
  cursor: crosshair;
  /* 取色面必须自己吃掉触摸手势，避免拖动时页面跟着滚 */
  touch-action: none;
}

.je-color-picker__hue {
  position: relative;
  height: 12px;
  margin-bottom: 10px;
  background: linear-gradient(
    to right,
    #f00 0%,
    #ff0 17%,
    #0f0 33%,
    #0ff 50%,
    #00f 67%,
    #f0f 83%,
    #f00 100%
  );
  border-radius: 999px;
  cursor: pointer;
  touch-action: none;
}

.je-color-picker__alpha {
  position: relative;
  height: 12px;
  margin-bottom: 10px;
  background-color: transparent;
  background-image: repeating-conic-gradient(rgba(255, 255, 255, 0.35) 0 25%, transparent 0 50%);
  background-size: 12px 12px;
  border-radius: 999px;
  cursor: pointer;
  touch-action: none;
}

/* 小程序不认 inset，拆成四边 */
.je-color-picker__alpha-track {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: 999px;
}

/* 取色点 */
.je-color-picker__thumb {
  position: absolute;
  top: 50%;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.je-color-picker__sv .je-color-picker__thumb {
  top: 0;
  left: 0;
}

.je-color-picker__predefine {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

/* 小程序端没有 aspect-ratio，用固定高代替正方形（面板窄时由 min-height 兜到 32px） */
.je-color-picker__pre {
  box-sizing: border-box;
  width: 100%;
  height: 22px;
  /* 两端原生 button 都自带 margin，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0;
  border: 1px solid var(--je-border-color);
  border-radius: 5px;
  cursor: pointer;
  transition: transform var(--je-duration) var(--je-ease-overshoot);
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-color-picker__pre::after {
  border: none;
}

.je-color-picker__pre:hover {
  transform: scale(1.15);
}

.je-color-picker__pre.is-active {
  border-color: var(--je-text);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--je-primary) 45%, transparent);
}

.je-color-picker__field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-color-picker__prefix {
  font-size: 11px;
  font-weight: 700;
  color: var(--je-text-faint);
}

.je-color-picker__hex {
  flex: 1 1 auto;
  min-width: 0;
  height: 20px;
  padding: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  color: var(--je-text);
  background: none;
  border: none;
  outline: none;
}

/* H5 下 uni 会把 <input> 包一层，真实控件要 :deep 才命中 */
:deep(.uni-input-input) {
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  background: none;
  border: none;
  outline: none;
}

.je-color-picker__hex.is-invalid {
  color: var(--je-danger);
}

.je-color-picker__scrim {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-color-picker__scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-color-picker__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.je-color-picker__handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: var(--je-border-color);
  border-radius: 999px;
}

/* 窄屏：底部弹出层，预留安全区；面板本身不设 touch-action，内部滚动不受影响 */
@media (max-width: 768px) {
  .je-color-picker__panel {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2001;
    width: 100%;
    padding: 4px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    transform-origin: bottom center;
    transform: translateY(100%);
    transition: transform 0.32s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.32s;
  }

  .je-color-picker__panel.is-open {
    transform: translateY(0);
    transition: transform 0.42s var(--je-ease-out-back), opacity 0.24s ease-out;
  }

  .je-color-picker__sv {
    height: 160px;
  }

  .je-color-picker__hue,
  .je-color-picker__alpha {
    height: 18px;
  }

  .je-color-picker__pre {
    min-height: 32px;
  }

  /* 触发器的高度不再挂 @media：uni 版只有触屏一个形态，上面三档就是触屏档 */

  /* 触屏没有 hover，预设色的放缩反馈交给按下态 */
  .je-color-picker__pre:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-color-picker__trigger,
  .je-color-picker__arrow,
  .je-color-picker__panel,
  .je-color-picker__panel.is-open,
  .je-color-picker__scrim,
  .je-color-picker__scrim.is-open,
  .je-color-picker__pre {
    transition: none;
  }
}
</style>
