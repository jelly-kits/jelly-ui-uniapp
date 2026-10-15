<script setup lang="ts">
/*
 * 组件详情页：组织架构（pages/demo/org-chart）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 组织架构：扁平节点数组（id + parentId） */
const orgNodes = [
  { id: 1, name: '总公司', title: 'CEO' },
  { id: 2, parentId: 1, name: '研发部', title: '技术' },
  { id: 3, parentId: 1, name: '市场部', title: '市场' },
  { id: 4, parentId: 2, name: '前端组', title: '前端' },
  { id: 5, parentId: 2, name: '后端组', title: '后端' },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="组织架构" route="org-chart" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="组织架构" description="JeOrgChart（可缩放拖动，点卡片选中）" inset>
            <view class="demo-org">
              <je-org-chart :nodes="orgNodes" :node-width="180" :node-height="68" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
