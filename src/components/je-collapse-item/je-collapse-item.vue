<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 相邻项之间的上边框靠 `.je-collapse-item + .je-collapse-item` 判定。小程序自定义组件
   * 默认多包一层宿主节点，真正的兄弟是宿主而不是 .je-collapse-item，相邻选择器匹配不到，
   * 折叠项之间会一条分隔线都没有。声明 virtualHost 后根节点直接作为 .je-collapse 的子项。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { jeCollapseKey } from '../je-collapse/types'
import { useUid } from '../../core/useUid'

defineOptions({ name: 'JeCollapseItem' })

const props = withDefaults(
  defineProps<{
    name: string | number
    title?: string
    disabled?: boolean
  }>(),
  { title: '', disabled: false },
)

const context = inject(jeCollapseKey)
const uid = useUid('je-collapse-item')

const active = computed(() => context?.isActive(props.name) ?? false)

const toggle = () => {
  if (props.disabled) return
  context?.toggle(props.name)
}

/** 头部是自定义的 role="button"，需要手动接管 Enter / Space */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  toggle()
}
</script>

<template>
  <div class="je-collapse-item" :class="{ 'is-active': active, 'is-disabled': disabled }">
    <div
      :id="`${uid}-header`"
      class="je-collapse-item__header"
      role="button"
      :tabindex="disabled ? -1 : 0"
      :aria-expanded="active"
      :aria-disabled="disabled || undefined"
      :aria-controls="`${uid}-panel`"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="je-collapse-item__title">
        <slot name="title">{{ title }}</slot>
      </span>
      <span v-if="$slots.extra" class="je-collapse-item__extra"><slot name="extra" /></span>
      <JeIcon class="je-collapse-item__arrow" name="chevron-right" :size="16" />
    </div>

    <div
      :id="`${uid}-panel`"
      class="je-collapse-item__body"
      role="region"
      :aria-labelledby="`${uid}-header`"
    >
      <div class="je-collapse-item__content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.je-collapse-item + .je-collapse-item {
  border-top: var(--je-border);
}

.je-collapse-item__header {
  display: flex;
  gap: 12px;
  align-items: center;
  box-sizing: border-box;
  min-height: 48px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--je-text);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

.je-collapse-item__header:hover {
  background: var(--je-surface-hover);
}

.je-collapse-item__header:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-collapse-item__title {
  flex: 1 1 auto;
  min-width: 0;
}

.je-collapse-item__extra {
  flex-shrink: 0;
  color: var(--je-text-faint);
}

.je-collapse-item__arrow {
  flex-shrink: 0;
  color: var(--je-text-faint);
  transition: transform var(--je-duration) var(--je-ease-overshoot), color var(--je-duration) ease;
}

.je-collapse-item.is-active .je-collapse-item__arrow {
  color: var(--je-text);
  transform: rotate(90deg);
}

/*
 * 展开动画用 grid-template-rows: 0fr → 1fr，高度自适应且无需测量 scrollHeight。
 * 收起时同时把 visibility 置为 hidden，确保内容不进入焦点顺序 / 无障碍树。
 */
.je-collapse-item__body {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition: grid-template-rows 0.3s ease, opacity 0.25s ease, visibility 0s linear 0.3s;
}

.je-collapse-item.is-active .je-collapse-item__body {
  grid-template-rows: 1fr;
  opacity: 1;
  visibility: visible;
  transition: grid-template-rows 0.32s var(--je-ease-out-back), opacity 0.28s ease;
}

.je-collapse-item__content {
  min-height: 0;
  padding: 0 16px 16px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.7;
  color: var(--je-text-muted);
}

.je-collapse-item.is-disabled .je-collapse-item__header {
  color: var(--je-text-faint);
  cursor: not-allowed;
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .je-collapse-item__header,
  .je-collapse-item__arrow,
  .je-collapse-item__body,
  .je-collapse-item.is-active .je-collapse-item__body {
    transition: none;
  }
}
</style>
