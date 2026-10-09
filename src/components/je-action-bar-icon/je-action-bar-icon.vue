<script setup lang="ts">
import { computed } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'

defineOptions({ name: 'JeActionBarIcon' })

const props = withDefaults(
  defineProps<{
    /** 图标名 */
    icon?: JeIconName
    /** 图标下方的文字 */
    text?: string
    /** 角标内容 */
    badge?: string | number
    /** 是否显示小红点 */
    dot?: boolean
    /** 图标与文字颜色，缺省用次级文字色 */
    color?: string
    /** 图标尺寸，数字按 px 处理 */
    iconSize?: number | string
    /** 禁用后不可点击且变淡 */
    disabled?: boolean
  }>(),
  {
    icon: undefined,
    text: '',
    badge: undefined,
    dot: false,
    color: '',
    iconSize: 20,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 点击图标按钮（禁用时不触发） */
  click: []
}>()

const showBadge = computed(() => !props.dot && props.badge !== undefined && props.badge !== '')

const onClick = () => {
  if (props.disabled) return
  emit('click')
}
</script>

<template>
  <button
    type="button"
    class="je-action-bar-icon"
    :class="{ 'is-disabled': disabled }"
    :disabled="disabled"
    :style="color ? { color } : undefined"
    @tap="onClick"
  >
    <view class="je-action-bar-icon__icon">
      <slot>
        <JeIcon v-if="icon" :name="icon" :size="iconSize" />
      </slot>
      <view v-if="dot" class="je-action-bar-icon__dot" aria-hidden="true" />
      <view v-else-if="showBadge" class="je-action-bar-icon__badge">
        <text>{{ badge }}</text>
      </view>
    </view>
    <text v-if="text" class="je-action-bar-icon__text">{{ text }}</text>
  </button>
</template>

<style scoped>
.je-action-bar-icon {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 48px;
  min-height: 44px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 4px 8px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.2;
  color: var(--je-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-action-bar-icon::after {
  border: none;
}

.je-action-bar-icon:hover:not(:disabled) {
  color: var(--je-text);
}

.je-action-bar-icon:active:not(:disabled) {
  background: var(--je-surface-hover);
}

.je-action-bar-icon.is-disabled,
.je-action-bar-icon:disabled {
  color: var(--je-text-faint);
  cursor: not-allowed;
  opacity: 0.5;
}

.je-action-bar-icon:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-action-bar-icon__icon {
  position: relative;
  display: inline-flex;
}

/* 小程序端 <text> 是行内元素，需要块级化才能让 margin / 居中生效 */
.je-action-bar-icon__text {
  display: block;
  white-space: nowrap;
}

.je-action-bar-icon__badge {
  position: absolute;
  top: -6px;
  right: -10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  /* 红色实底上固定浅色文字 */
  color: var(--je-text-on-color);
  background: var(--je-danger);
  border-radius: 999px;
}

.je-action-bar-icon__dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 8px;
  height: 8px;
  background: var(--je-danger);
  border-radius: 50%;
}
</style>
