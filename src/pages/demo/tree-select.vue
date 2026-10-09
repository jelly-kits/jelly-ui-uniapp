<script setup lang="ts">
/*
 * 组件详情页：树形选择（pages/demo/tree-select）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeTreeNode } from '../../components/je-tree'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

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

const treeSelectValue = ref<string | number | null>(null)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">树形选择</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="树形选择" description="JeTreeSelect（点开底部弹出树，选中后回填）" inset>
            <view class="demo-block">
              <je-tree-select v-model="treeSelectValue" :data="treeData" placeholder="请选择部门" />
            </view>
            <je-cell title="已选" :value="treeSelectValue === null ? '—' : String(treeSelectValue)" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
