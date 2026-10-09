<script setup lang="ts">
import { computed, getCurrentInstance, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { jeIndexBarKey, type JeIndexAnchorItem } from '../je-index-bar/types'

defineOptions({ name: 'JeIndexAnchor' })

const props = defineProps<{
  /** 对应索引栏里的索引值 */
  index: string | number
}>()

const instance = getCurrentInstance()
const bar = inject(jeIndexBarKey, null)
const anchorRef = ref<HTMLElement | null>(null)

/**
 * H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上。
 * 父级拿到实例直接量位置会报 getBoundingClientRect is not a function。
 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const isActive = computed(() => bar !== null && bar.active.value === props.index)

/** 只有当前锚点命中时才吸顶，否则头部会一直黏在容器上 */
const headerStyle = computed(() => {
  if (!bar || !bar.sticky.value || !isActive.value) return undefined
  return {
    position: 'sticky' as const,
    top: `${bar.stickyOffsetTop.value}px`,
    zIndex: 1,
  }
})

// #ifndef H5
/**
 * 小程序端父级查不到子组件内部的节点，锚点只能自己量：
 * 相对视口的 top 加上当前滚动量，就是它在页面里的绝对位置。
 */
const measureTop = (pageScrollTop: number, report: (top: number) => void) => {
  if (!instance?.proxy) return
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-index-anchor')
    .boundingClientRect((result) => {
      const rect = result as unknown as { top?: number } | null
      if (typeof rect?.top !== 'number') return
      report(rect.top + pageScrollTop)
    })
    .exec()
}
// #endif

const buildItem = (index: string | number): JeIndexAnchorItem => ({
  index,
  getEl: () => pick(anchorRef.value),
  // #ifndef H5
  measureTop,
  // #endif
})

const onHeaderClick = () => {
  bar?.select(props.index)
}

onMounted(() => bar?.register(buildItem(props.index)))
onBeforeUnmount(() => bar?.unregister(props.index))

watch(
  () => props.index,
  (value, prev) => {
    if (prev !== undefined) bar?.unregister(prev)
    if (bar) bar.register(buildItem(value))
  },
)
</script>

<template>
  <view ref="anchorRef" class="je-index-anchor">
    <view class="je-index-anchor__header" :style="headerStyle" @tap="onHeaderClick">
      <slot name="index">{{ index }}</slot>
    </view>
    <view class="je-index-anchor__content">
      <slot />
    </view>
  </view>
</template>

<style scoped>
.je-index-anchor {
  font-family: inherit;
}

.je-index-anchor__header {
  box-sizing: border-box;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--je-text-muted);
  cursor: pointer;
  background: var(--je-surface-hover);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.je-index-anchor__content {
  background: transparent;
}
</style>