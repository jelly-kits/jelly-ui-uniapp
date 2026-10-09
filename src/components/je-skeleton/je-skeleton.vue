<script setup lang="ts">
import { provide } from 'vue'
import JeSkeletonItem from '../je-skeleton-item/je-skeleton-item.vue'
import { jeSkeletonKey } from './types'

defineOptions({ name: 'JeSkeleton' })

const props = withDefaults(
  defineProps<{
    /** 是否处于加载中：true 显示骨架，false 显示默认插槽 */
    loading?: boolean
    /** 微光动画 */
    animated?: boolean
    /** 文本行数 */
    rows?: number
    /** 左侧头像占位 */
    avatar?: boolean
    /** 顶部标题占位 */
    title?: boolean
    /** 圆角化，用于圆角卡片内 */
    round?: boolean
  }>(),
  {
    loading: true,
    animated: true,
    rows: 3,
    avatar: false,
    title: true,
    round: false,
  },
)

/** 固定的宽度数组，让各行有长短错落感，避免随机导致 SSR 水合不一致 */
const ROW_WIDTHS = ['100%', '92%', '96%', '88%', '94%']

/**
 * 小程序端样式隔离，父组件 wxss 里的 `:deep(.je-skeleton__item)` 够不到
 * 子组件内部的节点，动画开关与圆角改由这里下发、子项自己落地。
 */
provide(jeSkeletonKey, {
  getAnimated: () => props.animated,
  getRound: () => props.round,
})
</script>

<template>
  <div
    v-if="loading"
    class="je-skeleton"
    :class="{ 'is-animated': animated, 'is-round': round }"
    aria-hidden="true"
  >
    <div v-if="avatar" class="je-skeleton__avatar">
      <JeSkeletonItem variant="circle" :width="48" :height="48" />
    </div>

    <div class="je-skeleton__content">
      <JeSkeletonItem v-if="title" variant="text" width="42%" :height="18" />
      <JeSkeletonItem
        v-for="row in rows"
        :key="row"
        variant="text"
        :width="ROW_WIDTHS[(row - 1) % ROW_WIDTHS.length]"
      />
    </div>
  </div>

  <slot v-else />
</template>

<style scoped>
.je-skeleton {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  width: 100%;
  font-family: inherit;
}

.je-skeleton__avatar {
  flex-shrink: 0;
}

.je-skeleton__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding-top: 2px;
}

/* animated / round 对子项的作用由 jeSkeletonKey 下发，见 je-skeleton-item.vue */

/* 窄屏：头像缩小、行距收紧，避免占满整屏 */
@media (max-width: 768px) {
  .je-skeleton {
    gap: 12px;
  }

  .je-skeleton__content {
    gap: 10px;
  }
}
</style>
