<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useSpring } from '../../core/useSpring'
import { jePresets } from '../../core/presets'

defineOptions({ name: 'JePullRefresh' })

const props = withDefaults(
  defineProps<{
    /** 是否处于加载中，刷新完成后由调用方置回 false */
    modelValue?: boolean
    /** 禁用下拉手势 */
    disabled?: boolean
    /** 触发刷新需要的下拉距离 */
    headHeight?: number
    /** 刷新成功后提示的停留时长（毫秒） */
    successDuration?: number
    /** 下拉中提示 */
    pullingText?: string
    /** 达到阈值、可松手时的提示 */
    loosingText?: string
    /** 加载中提示 */
    loadingText?: string
    /** 刷新成功提示 */
    successText?: string
  }>(),
  {
    modelValue: false,
    disabled: false,
    headHeight: 50,
    successDuration: 500,
    pullingText: '下拉即可刷新',
    loosingText: '释放立即刷新',
    loadingText: '加载中...',
    successText: '刷新成功',
  },
)

const emit = defineEmits<{
  'update:modelValue': [loading: boolean]
  /** 下拉距离达到阈值并松手 */
  refresh: []
}>()

type PullStatus = 'normal' | 'pulling' | 'loosing' | 'loading' | 'success'

const rootRef = ref<HTMLElement | null>(null)
const status = ref<PullStatus>('normal')

const spring = useSpring(0, jePresets.release)
const distance = spring.value

/** 手指 / 鼠标下的位移，超过阈值后阻力递增 */
const damp = (delta: number) => {
  const base = delta * 0.5
  const max = props.headHeight * 1.5
  return base <= max ? base : max + (base - max) * 0.3
}

let startY = 0
let active = false
// 小程序端判断「是否到顶」是异步的，先记住起点，量完再决定要不要接管这次手势
let pendingY: number | null = null
let successTimer: ReturnType<typeof setTimeout> | null = null
let settleTimer: ReturnType<typeof setTimeout> | null = null

/* 只有最近的可滚动祖先（缺省为文档）已经到顶，才允许下拉 */
// #ifdef H5
const isAtTop = (el: HTMLElement | null) => {
  let node = el?.parentElement ?? null
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node.scrollTop <= 0
    }
    node = node.parentElement
  }
  return (document.scrollingElement?.scrollTop ?? 0) <= 0
}
// #endif

const begin = (y: number) => {
  if (props.disabled || props.modelValue || active) return
  // #ifdef H5
  if (!isAtTop(rootRef.value)) return
  startY = y
  active = true
  // #endif
  // #ifndef H5
  /* 小程序端拿不到 DOM，用 SelectorQuery 读页面滚动位置；量到顶了才接管本次手势 */
  pendingY = y
  uni
    .createSelectorQuery()
    .selectViewport()
    .scrollOffset((result) => {
      if (pendingY === null) return
      const top = Number((result as unknown as { scrollTop?: number } | null)?.scrollTop ?? 0)
      if (top <= 0) {
        startY = pendingY
        active = true
      }
      pendingY = null
    })
    .exec()
  // #endif
}

const update = (y: number) => {
  if (!active) return
  const delta = y - startY
  if (delta <= 0) {
    // 反向滑动：把这次下拉交还给原生滚动
    if (distance.value === 0) {
      active = false
      status.value = 'normal'
    }
    return
  }
  const value = damp(delta)
  spring.jump(value)
  status.value = value >= props.headHeight ? 'loosing' : 'pulling'
}

const finish = () => {
  pendingY = null
  if (!active) return
  active = false
  if (distance.value >= props.headHeight) {
    spring.set(props.headHeight, jePresets.settle)
    status.value = 'loading'
    emit('update:modelValue', true)
    emit('refresh')
  } else {
    spring.set(0, jePresets.release)
    status.value = 'normal'
  }
}

/* 触摸与鼠标各挂一套：只有触摸需要 preventDefault 拦住 H5 的原生 overscroll */
const onTouchStart = (event: TouchEvent) => {
  const touch = event.touches?.[0]
  if (touch) begin(touch.clientY)
}

const onTouchMove = (event: TouchEvent) => {
  if (!active) return
  const touch = event.touches?.[0]
  if (!touch) return
  // #ifdef H5
  if (touch.clientY - startY > 0) event.preventDefault()
  // #endif
  update(touch.clientY)
}

/*
 * 鼠标通道：mousedown 收在根元素上，mousemove / mouseup 挂到 document，
 * 不写条件编译——模板上同一个根元素同时绑了两套，砍掉任何一套都会让模板引用到
 * 不存在的绑定；小程序端 mousedown 永不触发。
 */
const onMouseDown = (event: MouseEvent) => begin(event.clientY)

// #ifdef H5
const onMouseMove = (event: MouseEvent) => update(event.clientY)
// #endif

const addMouseListeners = () => {
  // #ifdef H5
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', finish)
  // #endif
}

const removeMouseListeners = () => {
  // #ifdef H5
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', finish)
  // #endif
}

onMounted(addMouseListeners)
onBeforeUnmount(() => {
  removeMouseListeners()
  if (successTimer !== null) clearTimeout(successTimer)
  if (settleTimer !== null) clearTimeout(settleTimer)
})

/* 加载中由调用方通过 v-model 控制收起时机 */
watch(
  () => props.modelValue,
  (loading, previous) => {
    if (successTimer !== null) clearTimeout(successTimer)
    if (settleTimer !== null) clearTimeout(settleTimer)
    if (loading) {
      spring.set(props.headHeight, jePresets.settle)
      status.value = 'loading'
    } else if (previous) {
      status.value = 'success'
      successTimer = setTimeout(() => {
        successTimer = null
        spring.set(0, jePresets.release)
        settleTimer = setTimeout(() => {
          settleTimer = null
          status.value = 'normal'
        }, 300)
      }, props.successDuration)
    }
  },
)

const trackStyle = computed(() => ({ transform: `translate3d(0, ${distance.value}px, 0)` }))
const headStyle = computed(() => ({ height: `${props.headHeight}px` }))

const headText = computed(() => {
  switch (status.value) {
    case 'pulling':
      return props.pullingText
    case 'loosing':
      return props.loosingText
    case 'loading':
      return props.loadingText
    case 'success':
      return props.successText
    default:
      return ''
  }
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-pull-refresh"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="finish"
    @touchcancel="finish"
    @mousedown="onMouseDown"
  >
    <view class="je-pull-refresh__track" :style="trackStyle">
      <view class="je-pull-refresh__head" :style="headStyle">
        <slot :name="status" :distance="distance">
          <JeIcon
            v-if="status === 'loading'"
            class="je-pull-refresh__spinner"
            name="loading"
            spin
            :size="18"
          />
          <text class="je-pull-refresh__text">{{ headText }}</text>
        </slot>
      </view>

      <view class="je-pull-refresh__content">
        <slot />
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-pull-refresh {
  position: relative;
  overflow: hidden;
  font-family: inherit;
  /* 不设 touch-action：内部滚动交给原生，下拉方向靠 touchmove 的 preventDefault 拦截 */
}

.je-pull-refresh__head {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  font-size: 13px;
  color: var(--je-text-muted);
  /* 默认藏在内容区上方，轨道下移时滑入视野 */
  transform: translate3d(0, -100%, 0);
}

.je-pull-refresh__text {
  white-space: nowrap;
}

.je-pull-refresh__spinner {
  color: var(--je-primary);
}
</style>
