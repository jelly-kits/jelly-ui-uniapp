<script setup lang="ts">
import { computed, useSlots, type Component, type VNode } from 'vue'
import type { JeContainerDirection } from './types'

defineOptions({ name: 'JeContainer' })

const props = withDefaults(
  defineProps<{
    /** 子元素排列方向；留空时由子元素自动判定 */
    direction?: JeContainerDirection
  }>(),
  { direction: '' },
)

const slots = useSlots()

const isHeaderOrFooter = (node: VNode) => {
  const name = (node.type as Component | null)?.name
  return name === 'JeHeader' || name === 'JeFooter'
}

/**
 * 直接子元素里有顶栏或底栏就纵向排列，否则横向（与 element-plus 一致）。
 *
 * 小程序端拿不到插槽内容：uni-app 把 $slots 编译成「有没有这个插槽」的布尔标记
 * （`slots.default === true`），对它调用会抛 `e.call is not a function`。
 * 所以这里显式判断可调用性，小程序端退化为横向，需要纵向时用 direction 显式指定。
 */
const isVertical = computed(() => {
  if (props.direction) return props.direction === 'vertical'
  const slot = slots.default
  if (typeof slot !== 'function') return false
  return (slot() ?? []).some(isHeaderOrFooter)
})
</script>

<template>
  <section
    class="je-container"
    :class="isVertical ? 'je-container--vertical' : 'je-container--horizontal'"
  >
    <slot />
  </section>
</template>

<style scoped>
/* 纯布局容器：只负责排列方向，外观（背景 / 边框 / 内边距）交给使用方 */
.je-container {
  display: flex;
  flex: 1;
  flex-basis: auto;
  box-sizing: border-box;
  min-width: 0;
}

/* 子元素里含顶栏 / 底栏时纵向堆叠 */
.je-container--vertical {
  flex-direction: column;
}
</style>
