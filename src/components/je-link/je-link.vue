<script setup lang="ts">
defineOptions({ name: 'JeLink' })

const props = withDefaults(
  defineProps<{
    type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
    /** 下划线策略；触屏设备没有 hover，hover 会自动降级为常显 */
    underline?: 'always' | 'hover' | 'never'
    disabled?: boolean
    href?: string
    target?: string
    rel?: string
  }>(),
  { type: 'default', underline: 'hover', disabled: false },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const onClick = (event: MouseEvent) => {
  if (props.disabled) {
    // 小程序端的事件对象没有 preventDefault，只有 H5 的 <a> 需要拦默认跳转
    if (typeof event.preventDefault === 'function') event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <!-- #ifdef H5 -->
  <a
    class="je-link"
    :class="[`je-link--${type}`, `is-underline-${underline}`, { 'is-disabled': disabled }]"
    :href="disabled ? undefined : href"
    :target="href ? target : undefined"
    :rel="href ? rel : undefined"
    :tabindex="!href && !disabled ? 0 : undefined"
    :aria-disabled="disabled || undefined"
    @click="onClick"
  >
    <slot name="icon" />
    <span class="je-link__text"><slot /></span>
  </a>
  <!-- #endif -->

  <!-- #ifndef H5 -->
  <!-- 小程序端不跳转外链（不支持 <a> 的 href 跳转），只 emit click -->
  <view
    class="je-link"
    :class="[`je-link--${type}`, `is-underline-${underline}`, { 'is-disabled': disabled }]"
    :tabindex="!href && !disabled ? 0 : undefined"
    :aria-disabled="disabled || undefined"
    @click="onClick"
  >
    <slot name="icon" />
    <span class="je-link__text"><slot /></span>
  </view>
  <!-- #endif -->
</template>

<style scoped>
.je-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  font-size: 14px;
  color: var(--je-text-muted);
  text-decoration: none;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  transition: color 0.2s ease, filter 0.2s ease, opacity 0.2s ease;
}

.je-link__text {
  text-underline-offset: 3px;
  text-decoration: inherit;
}

.je-link.is-underline-always,
.je-link.is-underline-always .je-link__text {
  text-decoration: underline;
}

.je-link.is-underline-hover:hover .je-link__text {
  text-decoration: underline;
}

/* 触屏没有 hover，把 hover 下划线直接常显，保证链接可辨识 */
@media (hover: none) {
  .je-link.is-underline-hover .je-link__text {
    text-decoration: underline;
  }
}

.je-link--primary {
  color: color-mix(in srgb, var(--je-primary) 70%, white);
}

.je-link--success {
  color: color-mix(in srgb, var(--je-success) 70%, white);
}

.je-link--warning {
  color: color-mix(in srgb, var(--je-warning) 75%, white);
}

.je-link--danger {
  color: color-mix(in srgb, var(--je-danger) 75%, white);
}

.je-link--info {
  color: color-mix(in srgb, var(--je-info) 70%, white);
}

.je-link:hover:not(.is-disabled) {
  filter: brightness(1.18);
}

.je-link:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 3px;
}

.je-link.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
  text-decoration: none;
}
</style>
