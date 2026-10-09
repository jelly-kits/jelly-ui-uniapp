<script setup lang="ts">
import { provide } from 'vue'
import { jeTimelineKey } from './types'

defineOptions({ name: 'JeTimeline' })

const props = withDefaults(defineProps<{ reverse?: boolean }>(), { reverse: false })

/** 子项要据此判断自己是不是视觉上的末项（首尾连线的隐藏规则不同） */
provide(jeTimelineKey, { getReverse: () => props.reverse })
</script>

<template>
  <ul class="je-timeline" :class="{ 'is-reverse': reverse }">
    <slot />
  </ul>
</template>

<style scoped>
.je-timeline {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  font-family: inherit;
  list-style: none;
}

/* 倒序：仅翻转显示顺序，节点竖线的起止仍由 DOM 首尾项决定 */
.je-timeline.is-reverse {
  flex-direction: column-reverse;
}
</style>
