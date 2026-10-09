<script setup lang="ts">
import { computed } from 'vue'
import type { JeBadgeType } from './types'

defineOptions({ name: 'JeBadge' })

const props = withDefaults(
  defineProps<{
    value?: string | number
    max?: number
    isDot?: boolean
    type?: JeBadgeType
    hidden?: boolean
    color?: string
  }>(),
  {
    value: undefined,
    max: 99,
    isDot: false,
    type: 'danger',
    hidden: false,
    color: undefined,
  },
)

/** 数字超过 max 时折叠成「max+」 */
const text = computed(() => {
  const value = props.value
  if (typeof value === 'number' && value > props.max) return `${props.max}+`
  return value === undefined ? '' : String(value)
})

const isHidden = computed(
  () => props.hidden || (!props.isDot && (props.value === undefined || props.value === '')),
)

/** color 优先于语义色，直接以内联背景覆盖 */
const supStyle = computed(() => (props.color ? { backgroundColor: props.color } : undefined))
</script>

<template>
  <span
    class="je-badge"
    :class="[`je-badge--${type}`, { 'is-dot': isDot, 'is-standalone': !$slots.default }]"
  >
    <slot />
    <sup v-if="!isHidden" class="je-badge__sup" :style="supStyle">
      <template v-if="!isDot">{{ text }}</template>
    </sup>
  </span>
</template>

<style scoped>
.je-badge {
  position: relative;
  display: inline-flex;
  font-family: inherit;
  vertical-align: middle;
}

.je-badge--primary {
  --je-badge-color: var(--je-primary);
}

.je-badge--success {
  --je-badge-color: var(--je-success);
}

.je-badge--warning {
  --je-badge-color: var(--je-warning);
}

.je-badge--danger {
  --je-badge-color: var(--je-danger);
}

.je-badge--info {
  --je-badge-color: var(--je-info);
}

.je-badge__sup {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  /* 角标底色都是鲜艳的语义色，文字固定浅色 */
  color: var(--je-text-on-color);
  white-space: nowrap;
  background: var(--je-badge-color);
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transform: translate(50%, -50%);
  animation: je-badge-in 0.24s ease both;
}

.je-badge.is-dot .je-badge__sup {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
}

/* 没有包裹内容时角标独立显示，不再需要定位偏移 */
.je-badge.is-standalone .je-badge__sup {
  position: static;
  transform: none;
}

@keyframes je-badge-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-badge__sup {
    animation: none;
  }
}
</style>
