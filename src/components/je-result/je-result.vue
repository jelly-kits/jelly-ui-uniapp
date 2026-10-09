<script setup lang="ts">
import JeIcon from '../je-icon/je-icon.vue'
import type { JeResultIcon } from './types'

defineOptions({ name: 'JeResult' })

withDefaults(
  defineProps<{
    /** 结果图标：success / warning / info / error */
    icon?: JeResultIcon
    /** 主标题 */
    title?: string
    /** 副标题（说明文案） */
    subTitle?: string
  }>(),
  { icon: 'info', title: '', subTitle: '' },
)
</script>

<template>
  <div class="je-result" role="status">
    <div class="je-result__icon" :class="`je-result__icon--${icon}`">
      <slot name="icon">
        <JeIcon :name="icon" :size="34" />
      </slot>
    </div>

    <div v-if="title || $slots.title" class="je-result__title">
      <slot name="title">{{ title }}</slot>
    </div>

    <div v-if="subTitle || $slots.subTitle" class="je-result__subtitle">
      <slot name="subTitle">{{ subTitle }}</slot>
    </div>

    <div v-if="$slots.extra" class="je-result__extra">
      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped>
.je-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  padding: 40px 20px;
  font-family: inherit;
  text-align: center;
}

/* 圆底与图标色都由语义 token 现算 */
.je-result__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  color: var(--je-info);
  background: color-mix(in srgb, var(--je-info) 16%, transparent);
  border-radius: 50%;
}

.je-result__icon--success {
  color: var(--je-success);
  background: color-mix(in srgb, var(--je-success) 16%, transparent);
}

.je-result__icon--warning {
  color: var(--je-warning);
  background: color-mix(in srgb, var(--je-warning) 16%, transparent);
}

.je-result__icon--error {
  color: var(--je-danger);
  background: color-mix(in srgb, var(--je-danger) 16%, transparent);
}

.je-result__title {
  margin-top: 18px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--je-text);
}

.je-result__subtitle {
  max-width: 480px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--je-text-faint);
}

.je-result__extra {
  margin-top: 24px;
}

/* 窄屏：整体内边距与字号收紧 */
@media (max-width: 768px) {
  .je-result {
    padding: 28px 12px;
  }

  .je-result__icon {
    width: 56px;
    height: 56px;
  }

  .je-result__title {
    font-size: 18px;
  }
}
</style>
