<script setup lang="ts">
/*
 * 组件详情页：表格 · 卡片形态（pages/demo/table-card）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import type { JeTableColumn, JeTableRow } from '../../components/je-table'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

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

/** 卡片形态只展示「列名 + 值」，勾选 / 序号 / 展开这些表头列没有对应行 */
const tableCardColumns = tableColumns.filter((column) => !column.type)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">表格 · 卡片形态</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="表格 · 卡片形态" description="JeTable（layout=card + cardLabelPosition=top）" inset>
            <view class="demo-table">
              <je-table
                :data="tableData"
                :columns="tableCardColumns"
                row-key="id"
                layout="card"
                card-label-position="top"
              />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
