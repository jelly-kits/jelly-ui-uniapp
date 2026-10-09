<script setup lang="ts">
import JeIcon from '../je-icon/je-icon.vue'
import type { JeAlertType } from './types'

defineOptions({ name: 'JeAlert' })

withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** 语义类型：success / info / warning / error */
    type?: JeAlertType
    /** 显示右上角关闭按钮 */
    closable?: boolean
    /** 显示左侧语义图标 */
    showIcon?: boolean
    /** 图标与文字居中 */
    center?: boolean
  }>(),
  {
    title: '',
    description: '',
    type: 'info',
    closable: false,
    showIcon: true,
    center: false,
  },
)

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="je-alert" :class="[`je-alert--${type}`, { 'is-center': center }]" role="alert">
    <JeIcon v-if="showIcon" class="je-alert__icon" :name="type" :size="20" />

    <div class="je-alert__content">
      <div v-if="title || $slots.title" class="je-alert__title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div v-if="description || $slots.description" class="je-alert__desc">
        <slot name="description">{{ description }}</slot>
      </div>
      <slot />
    </div>

    <button
      v-if="closable"
      type="button"
      class="je-alert__close"
      aria-label="关闭"
      @click="emit('close')"
    >
      <JeIcon name="close" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.je-alert {
  position: relative;
  display: flex;
  gap: 12px;
  box-sizing: border-box;
  padding: 14px 16px 14px 20px;
  overflow: hidden;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: var(--je-text-muted);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
}

/* 左侧色条：颜色由下方的类型修饰类决定 */
.je-alert::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--je-info);
}

.je-alert__icon {
  margin-top: 2px;
  color: var(--je-info);
  transition: color 0.2s ease;
}

.je-alert__content {
  flex: 1;
  min-width: 0;
}

.je-alert__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text);
}

.je-alert__desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--je-text-muted);
}

/*
 * 原实现是 `.je-alert__desc + :not(.je-alert__desc)`，但 WXSS 的复合选择器必须以
 * 类 / ID / 元素名开头，`+` 后面直接跟裸伪类会让 wxss 编译报错（error at token `:`）。
 * 语义等价改写成「desc 后面还有兄弟元素时，由 desc 自己留出下间距」。
 */
.je-alert__desc:not(:last-child) {
  margin-bottom: 6px;
}

.je-alert__close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: -2px -4px 0 0;
  color: var(--je-text-faint);
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: color 0.2s ease, background 0.2s ease;
}

.je-alert__close:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-alert__close:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 居中：内容水平中轴对齐 */
.je-alert.is-center {
  justify-content: center;
  text-align: center;
}

.je-alert.is-center .je-alert__content {
  flex: 0 1 auto;
}

/* 四种语义色：浅底与边框都在组件内由原始 token 现算 */
.je-alert--success {
  background: color-mix(in srgb, var(--je-success) 14%, transparent);
  border-color: color-mix(in srgb, var(--je-success) 40%, transparent);
}

.je-alert--success::before {
  background: var(--je-success);
}

.je-alert--success .je-alert__icon {
  color: var(--je-success);
}

.je-alert--info {
  background: color-mix(in srgb, var(--je-info) 14%, transparent);
  border-color: color-mix(in srgb, var(--je-info) 40%, transparent);
}

.je-alert--info::before {
  background: var(--je-info);
}

.je-alert--info .je-alert__icon {
  color: var(--je-info);
}

.je-alert--warning {
  background: color-mix(in srgb, var(--je-warning) 14%, transparent);
  border-color: color-mix(in srgb, var(--je-warning) 40%, transparent);
}

.je-alert--warning::before {
  background: var(--je-warning);
}

.je-alert--warning .je-alert__icon {
  color: var(--je-warning);
}

.je-alert--error {
  background: color-mix(in srgb, var(--je-danger) 14%, transparent);
  border-color: color-mix(in srgb, var(--je-danger) 40%, transparent);
}

.je-alert--error::before {
  background: var(--je-danger);
}

.je-alert--error .je-alert__icon {
  color: var(--je-danger);
}

/* 窄屏：关闭按钮热区放大到 44px */
@media (max-width: 768px) {
  .je-alert {
    padding: 12px 12px 12px 18px;
  }

  .je-alert__close {
    width: 44px;
    height: 44px;
    margin: -10px -10px 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-alert__icon,
  .je-alert__close {
    transition: none;
  }
}
</style>
