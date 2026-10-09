<script setup lang="ts">
/*
 * 组件详情页：组织架构（pages/demo/org-chart）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

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
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">组织架构</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="组织架构" description="JeOrgChart（可缩放拖动，点卡片选中）" inset>
            <view class="demo-org">
              <je-org-chart :nodes="orgNodes" :node-width="180" :node-height="68" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
