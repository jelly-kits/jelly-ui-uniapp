<script setup lang="ts">
/*
 * 组件详情页：表格（pages/demo/table）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
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

/** 表格：勾选结果，用来演示 selection-change */
const tableSelection = ref<JeTableRow[]>([])

const updateTableSelection = (rows: JeTableRow[]) => {
  tableSelection.value = rows
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="表格" route="table" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group
            title="表格"
            description="JeTable（窄屏自动切卡片；含勾选 / 序号 / 展开 / 树形，点行高亮）"
            inset
          >
            <view class="demo-table">
              <je-table
                :data="tableData"
                :columns="tableColumns"
                row-key="id"
                highlight-current-row
                @selection-change="updateTableSelection"
              >
                <template #cell="{ row, column, value }">
                  <text
                    :class="column.prop === 'status' ? (row.status === '正常' ? 'demo-table__ok' : 'demo-table__bad') : ''"
                  >{{ value }}</text>
                </template>
                <template #expand="{ row }">
                  <text class="demo-table__expand">负责人 {{ row.owner }}，评分 {{ row.score }}</text>
                </template>
              </je-table>
            </view>
            <je-cell title="已选行数" :value="String(tableSelection.length)" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
