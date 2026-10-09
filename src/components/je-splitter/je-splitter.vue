<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 根节点靠 width / height: 100% 撑满父容器。小程序自定义组件默认多包一层宿主节点，
   * 百分比高度会相对这层「auto 高」的宿主解析而塌成内容高，分栏不再铺满。
   * 声明 virtualHost 后宿主不再生成盒子，根节点直接作为父容器的子项。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import {
  jeSplitterKey,
  type JeSplitterContext,
  type JeSplitterLayout,
  type JeSplitterPanelProvider,
} from './types'

defineOptions({ name: 'JeSplitter' })

const props = withDefaults(
  defineProps<{
    layout?: JeSplitterLayout
    /** 各面板尺寸（百分比），配合 v-model 使用 */
    modelValue?: number[]
  }>(),
  { layout: 'horizontal' },
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  resize: [index: number, sizes: number[]]
  resizeStart: []
  resizeEnd: []
}>()

const rootRef = ref<HTMLElement | null>(null)
const instance = getCurrentInstance()
const sizes = ref<number[]>([])
const count = ref(0)
const activeIndex = ref(-1)

const layout = computed(() => props.layout)

/** 面板按挂载顺序登记；卸载时置空，保持下标稳定 */
const providers: (JeSplitterPanelProvider | null)[] = []

const readState = (index: number) => {
  const provider = providers[index]
  return provider ? provider() : null
}

/** 依据面板 size 推导初始尺寸；未指定的面板均分剩余空间 */
const resetSizes = () => {
  const total = providers.length
  if (total === 0) return

  const raws = providers.map((provider) => {
    const size = provider ? provider().size : undefined
    return typeof size === 'number' && size > 0 ? size : 0
  })
  const assigned = raws.reduce((sum, value) => sum + value, 0)
  const unset = raws.filter((value) => value <= 0).length
  const share = unset > 0 ? Math.max(0, 100 - assigned) / unset : 0

  sizes.value = raws.map((value) => (value > 0 ? value : share))
}

const registerPanel = (provider: JeSplitterPanelProvider) => {
  const index = providers.length
  providers.push(provider)
  count.value = providers.length
  if (!props.modelValue || props.modelValue.length === 0) resetSizes()
  return index
}

const unregisterPanel = (index: number) => {
  if (index >= 0 && index < providers.length) providers[index] = null
}

const commit = (next: number[], index: number) => {
  sizes.value = next
  emit('update:modelValue', next)
  emit('resize', index, next)
}

/** 只挪动某一对相邻面板，其余保持不变 */
const applyPair = (index: number, base: number[], delta: number) => {
  const first = base[index]
  const second = base[index + 1]
  if (first === undefined || second === undefined) return

  const stateA = readState(index)
  const stateB = readState(index + 1)
  const pair = first + second
  const minA = stateA?.collapsible ? 0 : (stateA?.min ?? 0)
  const minB = stateB?.collapsible ? 0 : (stateB?.min ?? 0)
  const lower = Math.max(minA, pair - (stateB?.max ?? 100))
  const upper = Math.min(stateA?.max ?? 100, pair - minB)
  if (lower > upper) return

  const target = Math.min(upper, Math.max(lower, first + delta))
  const next = [...base]
  next[index] = target
  next[index + 1] = pair - target
  commit(next, index)
}

/* ------------------------------- 平台几何 ------------------------------- */

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/** 分栏主轴尺寸（换算百分比的基准） */
const rootSize = ref(0)

/**
 * H5 直接量根节点；小程序端没有 DOM，改用自己的组件树里的 SelectorQuery。
 * 拖拽依赖这个尺寸，所以挂载时先量一次，按下时再刷新一次。
 */
const measureRoot = () => {
  // #ifdef H5
  const el = pick(rootRef.value)
  if (el) rootSize.value = props.layout === 'horizontal' ? el.clientWidth : el.clientHeight
  // #endif
  // #ifndef H5
  if (!instance?.proxy) return
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-splitter')
    .boundingClientRect((result) => {
      const info = (Array.isArray(result) ? result[0] : result) as unknown as
        | { width?: number; height?: number }
        | undefined
      if (info) rootSize.value = (props.layout === 'horizontal' ? info.width : info.height) ?? 0
    })
    .exec()
  // #endif
}

/* --------------------------------- 拖拽 --------------------------------- */

/** 小程序端事件对象携带的触点 */
interface TouchPoint {
  clientX: number
  clientY: number
}

interface TouchCarrier {
  touches?: ArrayLike<TouchPoint>
  changedTouches?: ArrayLike<TouchPoint>
  detail?: { x?: number; y?: number }
}

/** 从触摸事件里取出第一个触点（touchmove 时 touches 为空则退回 changedTouches） */
const firstTouch = (event: unknown): TouchPoint | undefined => {
  const carrier = event as TouchCarrier | undefined
  return (carrier?.touches?.[0] ?? carrier?.changedTouches?.[0]) as TouchPoint | undefined
}

/** 取事件在分栏主轴上的坐标：H5 走指针事件，小程序端走触摸事件 */
const axisPoint = (event: unknown): number => {
  const horizontal = props.layout === 'horizontal'
  let value = 0
  // #ifdef H5
  const pointer = event as PointerEvent
  value = horizontal ? pointer.clientX : pointer.clientY
  // #endif
  // #ifndef H5
  const touch = firstTouch(event)
  const detail = (event as TouchCarrier | undefined)?.detail
  value = horizontal ? (touch?.clientX ?? detail?.x ?? 0) : (touch?.clientY ?? detail?.y ?? 0)
  // #endif
  return value
}

let dragStart = 0
let dragBase: number[] = []

const onBarPointerDown = (index: number, event: unknown) => {
  const state = readState(index)
  if (!state || !state.resizable) return

  dragStart = axisPoint(event)
  dragBase = [...sizes.value]
  activeIndex.value = index
  measureRoot()
  emit('resizeStart')
}

const onBarPointerMove = (event: unknown) => {
  if (activeIndex.value < 0 || rootSize.value <= 0) return
  applyPair(activeIndex.value, dragBase, ((axisPoint(event) - dragStart) / rootSize.value) * 100)
}

const onBarPointerUp = () => {
  if (activeIndex.value < 0) return
  activeIndex.value = -1
  dragBase = []
  emit('resizeEnd')
}

/* ---------------------------- H5 原生指针通道 ---------------------------- */

/*
 * uni-app H5 会把内置组件（view）上的 DOM 事件归一化成跨端事件对象，只保留
 * type / target / detail，clientX、clientY 在这条链路上会丢失，于是 axisPoint 恒为
 * undefined，拖动写坏成 NaN。这里绕开模板绑定，直接给根节点挂原生监听，
 * 拿真实的 PointerEvent / KeyboardEvent。
 *
 * 指针在按下时用 setPointerCapture 捕获到分割条上，后续 move / up 仍会冒泡到根节点，
 * 因此三个监听都能挂在同一个根节点上。
 */
// #ifdef H5
/** 命中分割条：事件目标必须落在本组件的分割条上 */
const hitBar = (target: EventTarget | null): HTMLElement | null => {
  const el = (target as HTMLElement | null)?.closest?.('.je-splitter__bar') as HTMLElement | null
  if (!el) return null
  const root = pick(rootRef.value)
  return root && root.contains(el) ? el : null
}

/** 分割条在文档中的顺序即面板下标 */
const barIndexOf = (bar: HTMLElement): number => {
  const root = pick(rootRef.value)
  if (!root) return -1
  return Array.prototype.indexOf.call(root.querySelectorAll('.je-splitter__bar'), bar)
}

const onNativePointerDown = (event: PointerEvent) => {
  // 桌面端只认左键
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const bar = hitBar(event.target)
  if (!bar) return
  const index = barIndexOf(bar)
  if (index < 0) return
  // 捕获指针：分割条命中区很窄，拖出它之外还要继续收到 move / up。指针已失效时抛错，忽略即可。
  try {
    bar.setPointerCapture(event.pointerId)
  } catch {
    /* noop */
  }
  event.preventDefault()
  onBarPointerDown(index, event)
}

const onNativePointerMove = (event: PointerEvent) => onBarPointerMove(event)

const onNativePointerUp = () => onBarPointerUp()

/** 键盘微调：模板绑定的 keydown 同样拿不到真实的 key，一并走原生 */
const onNativeKeydown = (event: KeyboardEvent) => {
  const bar = hitBar(event.target)
  if (!bar) return
  const index = barIndexOf(bar)
  const state = readState(index)
  if (index < 0 || !state?.resizable) return

  const horizontal = props.layout === 'horizontal'
  const step = event.shiftKey ? 10 : 2
  const forward = horizontal ? 'ArrowRight' : 'ArrowDown'
  const backward = horizontal ? 'ArrowLeft' : 'ArrowUp'

  if (event.key === forward) {
    event.preventDefault()
    nudge(index, step)
  } else if (event.key === backward) {
    event.preventDefault()
    nudge(index, -step)
  }
}
// #endif

const nudge = (index: number, delta: number) => {
  applyPair(index, sizes.value, delta)
}

const context: JeSplitterContext = {
  layout,
  sizes,
  count,
  activeIndex,
  registerPanel,
  unregisterPanel,
  onBarPointerDown,
  onBarPointerMove,
  onBarPointerUp,
  nudge,
}
provide(jeSplitterKey, context)

onMounted(() => {
  measureRoot()
  // #ifdef H5
  const el = pick(rootRef.value)
  if (el) {
    el.addEventListener('pointerdown', onNativePointerDown)
    el.addEventListener('pointermove', onNativePointerMove)
    el.addEventListener('pointerup', onNativePointerUp)
    el.addEventListener('pointercancel', onNativePointerUp)
    el.addEventListener('keydown', onNativeKeydown)
  }
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  const el = pick(rootRef.value)
  if (el) {
    el.removeEventListener('pointerdown', onNativePointerDown)
    el.removeEventListener('pointermove', onNativePointerMove)
    el.removeEventListener('pointerup', onNativePointerUp)
    el.removeEventListener('pointercancel', onNativePointerUp)
    el.removeEventListener('keydown', onNativeKeydown)
  }
  // #endif
})

watch(() => props.layout, measureRoot)

watch(
  () => props.modelValue,
  (value) => {
    if (value && value.length) sizes.value = [...value]
  },
  { immediate: true },
)
</script>

<template>
  <view
    ref="rootRef"
    class="je-splitter"
    :class="[`je-splitter--${layout}`, { 'is-dragging': activeIndex >= 0 }]"
  >
    <slot />
  </view>
</template>

<style scoped>
.je-splitter {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  font-family: inherit;
}

.je-splitter--horizontal {
  flex-direction: row;
}

.je-splitter--vertical {
  flex-direction: column;
}

/* 拖拽期间禁止选中文字，避免拖出蓝色选区 */
.je-splitter.is-dragging {
  user-select: none;
  -webkit-user-select: none;
}
</style>
