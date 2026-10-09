<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 小程序自定义组件默认会在外面多包一层宿主节点。父级 .je-descriptions__body 是 grid，
   * 真正参与排布的子项会变成宿主节点，`gridColumn: span N` 与 span 逻辑都落不到点上。
   * 声明 virtualHost 后宿主不再生成盒子，根节点直接作为网格子项。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { jeDescriptionsKey, type JeDescriptionsContext } from '../je-descriptions/types'

defineOptions({ name: 'JeDescriptionsItem' })

const props = withDefaults(defineProps<{ label?: string; span?: number }>(), {
  label: '',
  span: 1,
})

const parent = inject(jeDescriptionsKey)

/** 未包在父级里时用一套默认值，组件仍可单独渲染 */
const context = computed<JeDescriptionsContext>(
  () =>
    parent?.value ?? {
      column: 1,
      border: false,
      direction: 'horizontal',
      size: 'default',
      labelWidth: undefined,
    },
)

/** span 不能超过实际列数，否则网格会被撑出多余列 */
const spanCount = computed(() => Math.min(Math.max(1, props.span), context.value.column))

const labelStyle = computed(() => {
  const width = context.value.labelWidth
  if (width === undefined) return undefined
  return { flexBasis: typeof width === 'number' ? `${width}px` : width }
})
</script>

<template>
  <view
    class="je-descriptions-item"
    :class="[
      `je-descriptions-item--${context.direction}`,
      `je-descriptions-item--${context.size}`,
      { 'is-border': context.border },
    ]"
    :style="{ gridColumn: `span ${spanCount}` }"
  >
    <view class="je-descriptions-item__label" :style="labelStyle">
      <slot name="label">{{ label }}</slot>
    </view>
    <view class="je-descriptions-item__content"><slot /></view>
  </view>
</template>

<style scoped>
.je-descriptions-item {
  box-sizing: border-box;
  display: flex;
  min-width: 0;
}

.je-descriptions-item--horizontal {
  flex-direction: row;
  gap: 8px;
  align-items: baseline;
}

.je-descriptions-item--vertical {
  flex-direction: column;
  gap: 4px;
}

.je-descriptions-item__label {
  flex-shrink: 0;
  color: var(--je-text-faint);
}

.je-descriptions-item__content {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--je-text);
  word-break: break-word;
}

/* 描边模式：单元格画右 / 下细线，标签与内容之间再加一条分隔线 */
.je-descriptions-item.is-border {
  gap: 0;
  padding: 10px 14px;
  border-right: var(--je-border);
  border-bottom: var(--je-border);
}

.je-descriptions-item.is-border.je-descriptions-item--horizontal {
  align-items: center;
}

.je-descriptions-item.is-border .je-descriptions-item__label {
  padding-right: 12px;
  border-right: var(--je-border);
}

.je-descriptions-item.is-border.je-descriptions-item--vertical .je-descriptions-item__label {
  padding-right: 0;
  border-right: none;
}

.je-descriptions-item.is-border .je-descriptions-item__content {
  padding-left: 12px;
}

.je-descriptions-item.is-border.je-descriptions-item--vertical .je-descriptions-item__content {
  padding-left: 0;
}
</style>
