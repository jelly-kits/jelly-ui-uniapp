<script setup lang="ts">
import { computed } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeTagEffect, JeTagSize, JeTagType } from './types'

defineOptions({ name: 'JeTag' })

const props = withDefaults(
  defineProps<{
    type?: JeTagType
    size?: JeTagSize
    effect?: JeTagEffect
    closable?: boolean
    round?: boolean
    disabled?: boolean
  }>(),
  {
    type: 'primary',
    size: 'default',
    effect: 'light',
    closable: false,
    round: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 关闭按钮点击 */
  close: [event: MouseEvent]
  /**
   * 点击标签本体。小程序端自定义组件的事件必须由组件内部 `emit` 出来，
   * 外面写的 `@click` 才会触发（宿主节点上的原生点击不会冒泡成组件事件）。
   */
  click: [event: MouseEvent]
}>()

/** 关闭图标随尺寸缩放，避免小标签里图标过大 */
const CLOSE_SIZE: Record<JeTagSize, number> = { small: 10, default: 12, large: 14 }
const closeSize = computed(() => CLOSE_SIZE[props.size])

const onClose = (event: MouseEvent) => {
  if (props.disabled) return
  emit('close', event)
}
</script>

<template>
  <span
    class="je-tag"
    :class="[
      `je-tag--${type}`,
      `je-tag--${size}`,
      `je-tag--${effect}`,
      { 'is-round': round, 'is-disabled': disabled },
    ]"
    @click="emit('click', $event)"
  >
    <span class="je-tag__content"><slot /></span>

    <button
      v-if="closable"
      type="button"
      class="je-tag__close"
      :disabled="disabled"
      aria-label="关闭"
      @click.stop="onClose"
    >
      <JeIcon name="close" :size="closeSize" />
    </button>
  </span>
</template>

<style scoped>
.je-tag {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: var(--je-radius-sm);
  transition: background var(--je-duration) ease, color var(--je-duration) ease,
    border-color var(--je-duration) ease;
}

/* 语义色统一挂到局部变量，effect 只决定这些颜色怎么用 */
.je-tag--primary {
  --je-tag-color: var(--je-primary);
}

.je-tag--success {
  --je-tag-color: var(--je-success);
}

.je-tag--info {
  --je-tag-color: var(--je-info);
}

.je-tag--warning {
  --je-tag-color: var(--je-warning);
}

.je-tag--danger {
  --je-tag-color: var(--je-danger);
}

.je-tag__content {
  overflow: hidden;
  text-overflow: ellipsis;
}

.je-tag__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity var(--je-duration) ease;
}

.je-tag__close:hover:not(:disabled) {
  opacity: 1;
}

.je-tag__close:focus-visible {
  border-radius: 3px;
  outline: 2px solid currentColor;
  outline-offset: 1px;
}

.je-tag__close:disabled {
  cursor: not-allowed;
}

/* 尺寸档位 */
.je-tag--small {
  height: 20px;
  padding: 0 8px;
  font-size: 11px;
}

.je-tag--default {
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
}

.je-tag--large {
  height: 32px;
  padding: 0 14px;
  font-size: 14px;
}

.je-tag.is-round {
  border-radius: 999px;
}

/* 浅色底：强调色低透明度铺底 */
.je-tag--light {
  color: var(--je-tag-color);
  background: color-mix(in srgb, var(--je-tag-color) 18%, transparent);
  border-color: color-mix(in srgb, var(--je-tag-color) 35%, transparent);
}

/* 实色底：语义色都是鲜艳色，前景固定用浅色 */
.je-tag--dark {
  color: var(--je-text-on-color);
  background: var(--je-tag-color);
  border-color: var(--je-tag-color);
}

/* 描边风格：透底 + 同色描边 */
.je-tag--plain {
  color: var(--je-tag-color);
  background: transparent;
  border-color: currentColor;
}

.je-tag.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 窄屏：小尺寸也保证一定的触控高度 */
@media (max-width: 768px) {
  .je-tag--small {
    height: 24px;
  }

  .je-tag--default {
    height: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-tag,
  .je-tag__close {
    transition: none;
  }
}
</style>
