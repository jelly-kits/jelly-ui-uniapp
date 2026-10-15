<script setup lang="ts">
/*
 * 组件详情页：描述列表（pages/demo/descriptions）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="描述列表" route="descriptions" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="描述列表" description="JeDescriptions + JeDescriptionsItem" inset>
            <view class="demo-block">
              <je-descriptions title="用户信息" :column="2" border>
                <je-descriptions-item label="昵称">Jelly</je-descriptions-item>
                <je-descriptions-item label="手机号">138****8000</je-descriptions-item>
                <je-descriptions-item label="城市">杭州</je-descriptions-item>
                <je-descriptions-item label="简介" :span="2">一套零依赖的 Vue 3 组件库</je-descriptions-item>
              </je-descriptions>
              <je-divider />
              <je-descriptions direction="vertical" :column="3" size="small">
                <je-descriptions-item label="订单号">20261007001</je-descriptions-item>
                <je-descriptions-item label="金额">￥128.50</je-descriptions-item>
                <je-descriptions-item label="状态">已发货</je-descriptions-item>
              </je-descriptions>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
