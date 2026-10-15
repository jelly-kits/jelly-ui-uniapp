<script setup lang="ts">
/*
 * 组件详情页：表格 · 表格形态（pages/demo/table-grid）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import type { JeTableColumn, JeTableRow } from '../../components/je-table'

/** 表格：一份数据同时覆盖卡片形态、表格形态与树形展开（子行挂在 children 上） */
const tableData: JeTableRow[] = [
  {
    id: 1,
    name: '总公司',
    owner: '林清',
    score: 96,
    status: '正常',
    children: [
      { id: 11, name: '研发部', owner: '周航', score: 92, status: '正常' },
      { id: 12, name: '设计部', owner: '陈屿', score: 88, status: '异常' },
    ],
  },
  { id: 2, name: '市场部', owner: '苏禾', score: 81, status: '正常' },
  { id: 3, name: '财务部', owner: '何以', score: 74, status: '正常' },
]

const tableColumns: JeTableColumn[] = [
  { type: 'selection', label: '' },
  { type: 'index', label: '序号', width: 72 },
  { type: 'expand', label: '' },
  { prop: 'name', label: '部门', minWidth: 160 },
  { prop: 'owner', label: '负责人', minWidth: 120 },
  { prop: 'score', label: '评分', width: 100, formatter: (row) => `${row.score} 分` },
  { prop: 'status', label: '状态', width: 100 },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="表格 · 表格形态" route="table-grid" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="表格 · 表格形态" description="JeTable（layout=table，列宽放不下时横向滚动）" inset>
            <view class="demo-table">
              <je-table :data="tableData" :columns="tableColumns" row-key="id" layout="table" border stripe />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
