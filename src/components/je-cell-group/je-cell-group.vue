<script setup lang="ts">
import { provide, ref } from 'vue'
import { jeCellGroupKey } from './types'

defineOptions({ name: 'JeCellGroup' })

withDefaults(
  defineProps<{
    /** 分组标题 */
    title?: string
    /** 分组标题下方的说明 */
    description?: string
    /** 内嵌模式：整体收成一张带边框和圆角的卡片，并在左右留白 */
    inset?: boolean
    /** 分组内容区是否铺一层底色 */
    surface?: boolean
    /** 内容区自带 16px 内边距：演示页里就不用再套一层 .demo-block 的 <view> */
    padded?: boolean
  }>(),
  { title: undefined, description: undefined, inset: false, surface: true, padded: false },
)

/**
 * 子项按挂载顺序登记 uid（挂载顺序即 DOM 顺序），用来判定谁是组内最后一项。
 * 小程序端样式隔离，父组件 wxss 里的 `> .je-cell:last-child::after` 匹配不到子组件
 * 内部的节点，末项的分隔线只能由子项自己按这里下发的结论隐藏。
 */
const cellUids = ref<number[]>([])

provide(jeCellGroupKey, {
  register: (uid) => {
    cellUids.value = [...cellUids.value, uid]
  },
  unregister: (uid) => {
    cellUids.value = cellUids.value.filter((item) => item !== uid)
  },
  isLast: (uid) => cellUids.value[cellUids.value.length - 1] === uid,
})
</script>

<template>
  <section class="je-cell-group" :class="{ 'is-inset': inset }">
    <h3 v-if="title || $slots.title" class="je-cell-group__title">
      <slot name="title">{{ title }}</slot>
    </h3>
    <p v-if="description" class="je-cell-group__desc">{{ description }}</p>

    <div class="je-cell-group__body" :class="{ 'has-surface': surface, 'is-padded': padded }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.je-cell-group {
  font-family: inherit;
}

.je-cell-group__title {
  margin: 0 0 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--je-text-faint);
}

.je-cell-group__desc {
  margin: 0 0 8px;
  padding: 0 16px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--je-text-faint);
}

.je-cell-group__body {
  border-radius: var(--je-radius-lg);
}

.je-cell-group__body.has-surface {
  background: var(--je-surface);
}

/* 演示页用：内容区自己带内边距，页面里就不用再套一层 .demo-block 的 <view> */
.je-cell-group__body.is-padded {
  padding: 16px;
}

/* 内嵌模式：卡片自带边框，并在左右留出边距 */
.je-cell-group.is-inset {
  margin: 0 16px;
}

.je-cell-group.is-inset .je-cell-group__body {
  border: var(--je-border);
}
</style>
