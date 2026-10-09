<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 子项是 .je-sidebar__list 的 flex 子项，靠自身高度与 ::before 竖条承担选中态。
   * 小程序自定义组件默认多包一层宿主节点，flex 子项会变成宿主，按钮的高度与定位都落不到点上。
   * 声明 virtualHost 后宿主不再生成盒子，<button> 直接作为列表的 flex 子项。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject } from 'vue'
import JeBadge from '../je-badge/je-badge.vue'
import { jeSidebarKey } from '../je-sidebar/types'

defineOptions({ name: 'JeSidebarItem' })

const props = withDefaults(
  defineProps<{
    /** 唯一标识，对应父级的 modelValue */
    name: string | number
    /** 标题文字，也可以用默认插槽 */
    title?: string
    /** 角标内容 */
    badge?: string | number
    /** 只显示小圆点角标 */
    dot?: boolean
    disabled?: boolean
  }>(),
  {
    title: '',
    badge: undefined,
    dot: false,
    disabled: false,
  },
)

const sidebar = inject(jeSidebarKey, null)

const isActive = computed(() => sidebar !== null && sidebar.active.value === props.name)

const onClick = () => {
  if (props.disabled) return
  sidebar?.select(props.name)
}
</script>

<template>
  <button
    type="button"
    class="je-sidebar__item"
    :class="{ 'is-active': isActive, 'is-disabled': disabled }"
    role="tab"
    :aria-selected="isActive"
    :disabled="disabled"
    @tap="onClick"
  >
    <text class="je-sidebar__title">
      <slot>{{ title }}</slot>
    </text>
    <JeBadge v-if="badge !== undefined || dot" :value="badge" :is-dot="dot" />
  </button>
</template>

<style scoped>
.je-sidebar__item {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  min-height: 50px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 14px 10px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.35;
  color: var(--je-text-muted);
  text-align: center;
  cursor: pointer;
  background: transparent;
  border: none;
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease,
    font-weight var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-sidebar__item::after {
  border: none;
}

/* 选中态左侧的竖条指示器 */
.je-sidebar__item::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 20px;
  background: var(--je-primary);
  border-radius: 0 2px 2px 0;
  transform: translateY(-50%) scaleY(0);
  transition: transform var(--je-duration) var(--je-ease-out-back);
}

.je-sidebar__item:hover:not(.is-disabled) {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-sidebar__item.is-active {
  font-weight: 600;
  color: var(--je-primary);
  background: var(--je-surface-hover);
}

.je-sidebar__item.is-active::before {
  transform: translateY(-50%) scaleY(1);
}

.je-sidebar__item:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-sidebar__item.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.je-sidebar__title {
  overflow-wrap: break-word;
}

@media (max-width: 768px) {
  .je-sidebar__item {
    min-height: 52px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-sidebar__item,
  .je-sidebar__item::before {
    transition: none;
  }
}
</style>