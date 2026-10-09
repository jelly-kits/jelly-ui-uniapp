<script setup lang="ts">
import { computed, onMounted, provide, ref, useSlots } from 'vue'
import {
  jeDescriptionsKey,
  type JeDescriptionsContext,
  type JeDescriptionsDirection,
  type JeDescriptionsSize,
} from './types'

defineOptions({ name: 'JeDescriptions' })

const props = withDefaults(
  defineProps<{
    title?: string
    column?: number
    border?: boolean
    direction?: JeDescriptionsDirection
    size?: JeDescriptionsSize
    labelWidth?: string | number
  }>(),
  {
    title: '',
    column: 3,
    border: false,
    direction: 'horizontal',
    size: 'default',
    labelWidth: undefined,
  },
)

const slots = useSlots()

/**
 * 窄屏切单列。小程序端没有 window，恒按窄屏处理；
 * H5 在挂载时按视口宽判一次（口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

/** 窄屏降为单列，避免标签与内容被挤成两行 */
const actualColumn = computed(() => (isMobile.value ? 1 : Math.max(1, props.column)))

provide(
  jeDescriptionsKey,
  computed<JeDescriptionsContext>(() => ({
    column: actualColumn.value,
    border: props.border,
    direction: props.direction,
    size: props.size,
    labelWidth: props.labelWidth,
  })),
)
</script>

<template>
  <view class="je-descriptions" :class="[`je-descriptions--${size}`, { 'is-border': border }]">
    <view v-if="title || slots.title" class="je-descriptions__title">
      <slot name="title">{{ title }}</slot>
    </view>

    <view class="je-descriptions__body" :style="{ '--je-descriptions-column': actualColumn }">
      <slot />
    </view>
  </view>
</template>

<style scoped>
.je-descriptions {
  box-sizing: border-box;
  font-family: inherit;
  color: var(--je-text-muted);
}

.je-descriptions__title {
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--je-text);
}

.je-descriptions__body {
  display: grid;
  grid-template-columns: repeat(var(--je-descriptions-column, 1), minmax(0, 1fr));
  gap: 14px 24px;
}

/* 描边模式：父容器补左 / 上两条线，单元格各自画右 / 下，拼出完整表格 */
.je-descriptions.is-border .je-descriptions__body {
  gap: 0;
  overflow: hidden;
  border-top: var(--je-border);
  border-left: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-descriptions--small {
  font-size: 12px;
}

.je-descriptions--small .je-descriptions__body {
  gap: 10px 18px;
}

.je-descriptions--large {
  font-size: 16px;
}

.je-descriptions--large .je-descriptions__body {
  gap: 18px 28px;
}
</style>
