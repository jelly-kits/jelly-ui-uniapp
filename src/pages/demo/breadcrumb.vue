<script setup lang="ts">
/*
 * 组件详情页：面包屑（pages/demo/breadcrumb）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="面包屑" route="breadcrumb" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="面包屑" description="JeBreadcrumb + JeBreadcrumbItem" inset>
            <view class="demo-block">
              <je-breadcrumb>
                <je-breadcrumb-item>首页</je-breadcrumb-item>
                <je-breadcrumb-item>组件</je-breadcrumb-item>
                <je-breadcrumb-item>面包屑</je-breadcrumb-item>
              </je-breadcrumb>
              <je-divider />
              <je-breadcrumb separator-icon="chevron-right">
                <je-breadcrumb-item>首页</je-breadcrumb-item>
                <je-breadcrumb-item>展示类</je-breadcrumb-item>
                <je-breadcrumb-item>面包屑</je-breadcrumb-item>
              </je-breadcrumb>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
