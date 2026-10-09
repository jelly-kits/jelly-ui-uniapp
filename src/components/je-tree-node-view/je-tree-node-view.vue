<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 树节点是父级（.je-tree 或 .je-tree__children）的块级子项，纵向排布；节点行自身还靠
   * padding-left 承担层级缩进。小程序自定义组件默认多包一层宿主节点，宿主会把这层
   * 「节点行 + 子节点容器」结构多套一级、缩进与整行点选区域落不到真正的行上。声明
   * virtualHost 后宿主不再生成盒子，根节点直接作为父级的子项，与 H5 表现一致。
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
import { jeTreeKey, type JeTreeNode } from '../je-tree/types'

defineOptions({ name: 'JeTreeNodeView' })

const props = withDefaults(defineProps<{ node: JeTreeNode; level?: number }>(), { level: 1 })

const ctx = inject(jeTreeKey)!

const checkable = ctx.checkable
const hasChildren = computed(() => !!props.node.children?.length)
const isExpanded = computed(() => ctx.isExpanded(props.node.key))
const isSelected = computed(() => ctx.isSelected(props.node.key))
const isChecked = computed(() => ctx.isChecked(props.node.key))
const isIndeterminate = computed(() => ctx.isIndeterminate(props.node))
const isActive = computed(() => ctx.isActive(props.node.key))

/** 层级缩进由 padding-left 承担，行本身始终占满整行便于点选 */
const rowStyle = computed(() => ({ paddingLeft: `${(props.level - 1) * 18 + 10}px` }))
</script>

<template>
  <view class="je-tree__item" role="none">
    <view
      class="je-tree__node"
      :class="{ 'is-selected': isSelected, 'is-disabled': node.disabled }"
      :data-tree-key="node.key"
      role="treeitem"
      :aria-level="level"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      :aria-selected="isSelected"
      :aria-checked="checkable ? (isChecked ? true : isIndeterminate ? 'mixed' : false) : undefined"
      :aria-disabled="node.disabled || undefined"
      :tabindex="isActive ? 0 : -1"
      :style="rowStyle"
      @tap="ctx.onNodeClick(node)"
      @focus="ctx.setActive(node.key)"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="je-tree__arrow"
        :class="{ 'is-expanded': isExpanded }"
        tabindex="-1"
        :aria-label="isExpanded ? `收起 ${node.label}` : `展开 ${node.label}`"
        @tap.stop="ctx.toggleExpand(node)"
      >
        <JeIcon name="chevron-right" :size="14" />
      </button>
      <view v-else class="je-tree__arrow is-placeholder" aria-hidden="true" />

      <view
        v-if="checkable"
        class="je-tree__checkbox"
        :class="{ 'is-checked': isChecked, 'is-indeterminate': isIndeterminate }"
        aria-hidden="true"
        @tap.stop="ctx.toggleCheck(node)"
      >
        <JeIcon v-if="isChecked" name="check" :size="12" />
        <view v-else-if="isIndeterminate" class="je-tree__checkbox-dash" />
      </view>

      <JeIcon v-if="node.icon" :name="node.icon" :size="16" class="je-tree__icon" />
      <text class="je-tree__label">{{ node.label }}</text>
    </view>

    <view v-if="hasChildren && isExpanded" class="je-tree__children" role="group">
      <!--
        递归渲染自身：标签必须写成 kebab 形式。小程序端编译器把 selfName 置空（不按文件名生成递归），
        PascalCase 自引用不会被识别成组件、也就不会写进 usingComponents（递归从第三层起直接断掉）；
        写成 kebab 后走 easycom 兜底解析，编译产物里会生成指向自身的 usingComponents 条目。
      -->
      <je-tree-node-view
        v-for="child in node.children ?? []"
        :key="child.key"
        :node="child"
        :level="level + 1"
      />
    </view>
  </view>
</template>

<style scoped>
/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-tree button::after {
  border: none;
}

.je-tree__node {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  min-height: 40px;
  padding-right: 10px;
  font-size: 14px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.je-tree__node:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-tree__node:active {
  background: color-mix(in srgb, var(--je-primary) 14%, transparent);
}

.je-tree__node.is-selected {
  font-weight: 600;
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 30%, transparent);
}

.je-tree__node:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-tree__node.is-disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.je-tree__arrow {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  /* 原生 button 自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0;
  line-height: 1;
  color: var(--je-text-faint);
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.25s var(--je-ease-overshoot), color 0.2s ease;
}

.je-tree__arrow.is-expanded {
  transform: rotate(90deg);
}

.je-tree__arrow.is-placeholder {
  cursor: default;
}

/* 自绘勾选框：勾选 / 半选都由主色现算 */
.je-tree__checkbox {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  /* 勾只在选中 / 半选（渐变底）时出现，固定浅色 */
  color: var(--je-text-on-color);
  border: 2px solid var(--je-border-color);
  border-radius: 6px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.je-tree__checkbox.is-checked,
.je-tree__checkbox.is-indeterminate {
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
}

.je-tree__checkbox-dash {
  width: 8px;
  height: 2px;
  /* 半选横杠压在渐变底上，固定浅色 */
  background: var(--je-text-on-color);
  border-radius: 2px;
}

.je-tree__icon {
  color: var(--je-text-faint);
}

.je-tree__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 窄屏：行高热区不小于 44px */
@media (max-width: 768px) {
  .je-tree__node {
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-tree__node,
  .je-tree__node.is-selected,
  .je-tree__arrow,
  .je-tree__arrow.is-expanded,
  .je-tree__checkbox,
  .je-tree__checkbox.is-checked,
  .je-tree__checkbox.is-indeterminate {
    transition: none;
  }
}
</style>
