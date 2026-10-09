<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 菜单项是 .je-menu 的 flex 子项（横向还靠 gap / align-items 排布）。小程序自定义组件
   * 默认多包一层宿主节点，真正参与 flex 排布的是宿主，项自身的 min-height / padding /
   * 折叠态宽度都落不到点上。声明 virtualHost 后宿主不再生成盒子，根节点直接作为菜单的
   * flex 子项，与 H5 表现一致。
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
import type { JeIconName } from '../je-icon/icons'
import JeTooltip from '../je-tooltip/je-tooltip.vue'
import { jeMenuKey, jeMenuParentKey, type JeMenuIndex } from '../je-menu/types'

defineOptions({ name: 'JeMenuItem' })

const props = withDefaults(
  defineProps<{
    index: JeMenuIndex
    disabled?: boolean
    icon?: JeIconName
  }>(),
  { disabled: false, icon: undefined },
)

const menu = inject(jeMenuKey)
const parent = inject(jeMenuParentKey, undefined)

const active = computed(() => menu?.activeIndex.value === props.index)
/** 折叠态只留图标；浮层内的项不受折叠影响 */
const collapsed = computed(
  () => !!menu && !menu.horizontal.value && menu.collapse.value && !(parent?.popup.value ?? false),
)

const indexPath = computed<JeMenuIndex[]>(() => [...(parent?.path.value ?? []), props.index])

const select = () => {
  if (props.disabled) return
  menu?.select(props.index, indexPath.value)
  if (parent?.popup.value) parent.closePopup()
}

/** 键盘只存在于 H5，这个绑定在小程序端永不触发 */
const onKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return
  // 空格键的 event.key 是单个空格字符
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    select()
  }
}
</script>

<template>
  <view
    class="je-menu-item"
    :class="{ 'is-active': active, 'is-disabled': disabled, 'is-collapse': collapsed }"
    role="menuitem"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || undefined"
    :aria-current="active ? 'page' : undefined"
    @tap="select"
    @keydown="onKeydown"
  >
    <!--
      提示层由宿主自己包一层：主库那套「class 直接挂 JeTooltip 组件根上量尺寸」在这里够不到，
      尺寸只能落在这层包装节点上。
    -->
    <view class="je-menu-item__tip">
      <JeTooltip placement="right" :disabled="!collapsed">
        <view class="je-menu-item__body">
          <view v-if="icon" class="je-menu-item__icon" :class="{ 'is-active': active }">
            <JeIcon :name="icon" :size="18" />
          </view>
          <text class="je-menu-item__label" :class="{ 'is-collapse': collapsed }">
            <slot name="title"><slot /></slot>
          </text>
        </view>
        <template #content><slot name="title"><slot /></slot></template>
      </JeTooltip>
    </view>
  </view>
</template>

<style scoped>
.je-menu-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease, color var(--je-duration) ease;
}

.je-menu-item:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-menu-item:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

/* 选中只换文字颜色，不铺背景：底色留给 hover，两者叠在一起会变成双层高亮 */
.je-menu-item.is-active {
  color: color-mix(in srgb, var(--je-primary) 70%, white);
  font-weight: 600;
}

.je-menu-item.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-menu-item__tip {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
}

.je-menu-item__body {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.je-menu-item__icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--je-text-faint);
  transition: color var(--je-duration) ease;
}

/*
 * 图标跟着文字一起变色，选中态与文字保持同一个色。
 * 状态类挂在图标自身而不是用后代选择器：图标在小程序端位于 JeTooltip 内部，父级的
 * `.je-menu-item.is-active .je-menu-item__icon` 跨不过组件样式边界。
 */
.je-menu-item__icon.is-active {
  color: color-mix(in srgb, var(--je-primary) 70%, white);
}

.je-menu-item:hover .je-menu-item__icon {
  color: var(--je-text);
}

.je-menu-item__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 折叠态：只剩图标居中显示（Tooltip 里的文字不受此规则影响） */
.je-menu-item.is-collapse {
  justify-content: center;
  padding: 10px 0;
}

.je-menu-item.is-collapse .je-menu-item__tip {
  flex: 0 0 auto;
}

/* 文字隐藏同样用挂在自身上的状态类：label 在 JeTooltip 插槽里，跨边界后代选择器不可靠 */
.je-menu-item__label.is-collapse {
  display: none;
}

@media (max-width: 768px) {
  .je-menu-item {
    min-height: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-menu-item,
  .je-menu-item__icon,
  .je-menu-item__icon.is-active {
    transition: none;
  }
}
</style>
