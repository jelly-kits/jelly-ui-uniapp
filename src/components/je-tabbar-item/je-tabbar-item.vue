<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeTabbarItem 是 .je-tabbar 的 flex 子项，靠自身的 flex: 1 1 0 与同级均分宽度。
   * 小程序自定义组件默认多包一层宿主节点，flex 子项变成宿主，这层没有 flex: 1，
   * 各页签会按内容宽度排布而不是等分。
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
import JeBadge from '../je-badge/je-badge.vue'
import type { JeIconName } from '../je-icon/icons'
import { jeTabbarKey } from '../je-tabbar/types'

defineOptions({ name: 'JeTabbarItem' })

const props = withDefaults(
  defineProps<{
    /** 选中时回传给父级的值，必填 */
    name: string | number
    /** 未选中时的图标 */
    icon?: JeIconName
    /** 选中时的图标，不传则沿用 icon */
    activeIcon?: JeIconName
    /** 图标下方的文字 */
    text?: string
    /** 角标内容 */
    badge?: string | number
    /** 只显示小红点 */
    dot?: boolean
  }>(),
  {
    icon: undefined,
    activeIcon: undefined,
    text: undefined,
    badge: undefined,
    dot: false,
  },
)

const tabbar = inject(jeTabbarKey, null)

const active = computed(() => tabbar?.getActive() === props.name)
const iconName = computed(() => (active.value ? props.activeIcon ?? props.icon : props.icon))

const onClick = () => tabbar?.select(props.name)
</script>

<template>
  <button
    type="button"
    class="je-tabbar__item"
    :class="{ 'is-active': active }"
    role="tab"
    :aria-selected="active"
    @click="onClick"
  >
    <span class="je-tabbar__icon">
      <JeBadge v-if="badge !== undefined || dot" :value="badge" :is-dot="dot">
        <JeIcon v-if="iconName" :name="iconName" :size="22" />
      </JeBadge>
      <JeIcon v-else-if="iconName" :name="iconName" :size="22" />
    </span>

    <span v-if="text || $slots.default" class="je-tabbar__text">
      <slot>{{ text }}</slot>
    </span>
  </button>
</template>

<style scoped>
.je-tabbar__item {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 4px 2px;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.2;
  color: var(--je-text-faint);
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: color var(--je-duration) ease;
}

/* 选中态只改文字与图标颜色，不铺底色（与 JeMenuItem 约定一致） */
.je-tabbar__item.is-active {
  color: var(--je-primary);
}

.je-tabbar__item:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-tabbar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
}

.je-tabbar__text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  /* 触屏上把热区兜到 44px 以上 */
  .je-tabbar__item {
    min-height: 44px;
  }
}
</style>
