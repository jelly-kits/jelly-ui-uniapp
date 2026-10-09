<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'JeText' })

const props = withDefaults(
  defineProps<{
    type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
    size?: 'small' | 'default' | 'large'
    /**
     * 渲染标签，默认 span。
     * 小程序没有 div/span/p/h1 这些标签（编译期一律映射为 view，span 映射为 label），
     * 所以这里只按语义分两类：span → inline 的 text，其余 → block 的 view。
     */
    tag?: string
    bold?: boolean
    /** 单行省略 */
    truncated?: boolean
  }>(),
  { type: 'default', size: 'default', tag: 'span', bold: false, truncated: false },
)

/** 小程序不支持 <component :is="...">，改为静态双分支 */
const isInline = computed(() => props.tag === 'span')

const classes = computed(() => [
  'je-text',
  `je-text--${props.type}`,
  `je-text--${props.size}`,
  { 'is-bold': props.bold, 'is-truncated': props.truncated },
])
</script>

<template>
  <text v-if="isInline" :class="classes"><slot /></text>
  <view v-else :class="classes"><slot /></view>
</template>

<style scoped>
.je-text {
  color: var(--je-text-muted);
}

.je-text--primary {
  color: color-mix(in srgb, var(--je-primary) 70%, white);
}

.je-text--success {
  color: color-mix(in srgb, var(--je-success) 70%, white);
}

.je-text--warning {
  color: color-mix(in srgb, var(--je-warning) 75%, white);
}

.je-text--danger {
  color: color-mix(in srgb, var(--je-danger) 75%, white);
}

.je-text--info {
  color: color-mix(in srgb, var(--je-info) 70%, white);
}

.je-text--small {
  font-size: 12px;
}

.je-text--default {
  font-size: 14px;
}

.je-text--large {
  font-size: 16px;
}

.je-text.is-bold {
  font-weight: 600;
  color: var(--je-text);
}

.je-text.is-truncated {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>