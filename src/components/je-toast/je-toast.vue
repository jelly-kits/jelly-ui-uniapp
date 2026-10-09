<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'

defineOptions({ name: 'JeToast' })

const props = withDefaults(
  defineProps<{
    /** 是否显示，配 v-model 使用 */
    modelValue?: boolean
    /** 自动消失的延迟（毫秒） */
    duration?: number
    /** 不传插槽时的文本 */
    message?: string
    /**
     * 皮肤。default / success / warning / danger / info 与 JeButton 的语义色一一对应，
     * primary 是品牌渐变。
     */
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  }>(),
  { modelValue: false, duration: 1800, message: '', variant: 'primary' },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

/** 与 Message / Notification 同一套层级游标，保证提示条压得住页面固定头栏 */
const zIndex = ref(nextZIndex())

let timer: ReturnType<typeof setTimeout> | null = null

const clearTimer = () => {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    clearTimer()
    if (visible) {
      zIndex.value = nextZIndex()
      timer = setTimeout(() => {
        timer = null
        emit('update:modelValue', false)
      }, props.duration)
    }
  },
  { immediate: true },
)

onBeforeUnmount(clearTimer)
</script>

<template>
  <div
    class="je-toast"
    :class="[`je-toast--${variant}`, { 'is-visible': modelValue }]"
    :style="{ zIndex }"
    role="status"
    aria-live="polite"
  >
    <slot>{{ message }}</slot>
  </div>
</template>

<style scoped>
.je-toast {
  position: fixed;
  top: 32px;
  left: 50%;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 600;
  /* 皮肤默认取品牌色；具体 variant 会覆盖下面这几个变量 */
  --jt-from: var(--je-primary);
  --jt-to: var(--je-primary-end);
  /* 胶囊压在彩色渐变上，文字一律浅色，不随明暗翻转 */
  --jt-solid: var(--je-text-on-color);
  color: var(--jt-solid);
  background: linear-gradient(135deg, var(--jt-from), var(--jt-to));
  border-radius: 999px;
  box-shadow: 0 12px 32px color-mix(in srgb, var(--jt-from) 40%, transparent);
  pointer-events: none;
  will-change: transform, opacity;
  opacity: 0;
  transform: translateX(-50%) scale(0);
  transition: transform 0.35s var(--je-ease-out-back), opacity 0.25s ease;
}

/* 每个语义皮肤只声明渐变的两端色；端点色在这里现算才能跟着主题 token 一起换肤 */
.je-toast--default {
  --jt-from: color-mix(in srgb, var(--je-popup) 85%, #fff);
  --jt-to: var(--je-popup);
  /* 中性底：文字跟着正文色走 */
  --jt-solid: var(--je-text);
}

.je-toast--primary {
  --jt-from: var(--je-primary);
  --jt-to: var(--je-primary-end);
}

.je-toast--success {
  --jt-from: var(--je-success);
  --jt-to: color-mix(in srgb, var(--je-success) 62%, #000);
}

.je-toast--warning {
  --jt-from: var(--je-warning);
  --jt-to: color-mix(in srgb, var(--je-warning) 62%, #000);
}

.je-toast--danger {
  --jt-from: var(--je-danger);
  --jt-to: color-mix(in srgb, var(--je-danger) 62%, #000);
}

.je-toast--info {
  --jt-from: var(--je-info);
  --jt-to: color-mix(in srgb, var(--je-info) 62%, #000);
}

.je-toast.is-visible {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .je-toast {
    transition: none;
  }
}
</style>