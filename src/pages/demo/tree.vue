<script setup lang="ts">
/*
 * 组件详情页：树形控件（pages/demo/tree）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import type { JeTreeNode } from '../../components/je-tree'

/** 树形控件：同一份数据供 JeTree 与 JeTreeSelect 复用 */
const treeData: JeTreeNode[] = [
  {
    key: 'company',
    label: '总公司',
    children: [
      {
        key: 'dev',
        label: '研发部',
        children: [
          { key: 'fe', label: '前端组' },
          { key: 'be', label: '后端组' },
        ],
      },
      { key: 'market', label: '市场部' },
      { key: 'hr', label: '人力资源部', disabled: true },
    ],
  },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="树形控件" route="tree" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="树形控件" description="JeTree（可展开 / 勾选，含一个禁用节点）" inset>
            <view class="demo-block">
              <je-tree :data="treeData" checkable default-expand-all />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
