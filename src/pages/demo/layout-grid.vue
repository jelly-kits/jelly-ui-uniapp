<script setup lang="ts">
/*
 * 组件详情页：栅格（pages/demo/layout-grid）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="栅格" route="layout-grid" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="栅格" inset>
            <view class="demo-block demo-col">
              <je-row :gutter="8">
                <je-col :span="12">
                  <je-tag type="primary">span 12</je-tag>
                </je-col>
                <je-col :span="6">
                  <je-tag type="success">span 6</je-tag>
                </je-col>
                <je-col :span="6">
                  <je-tag type="warning">span 6</je-tag>
                </je-col>
              </je-row>
              <je-row :gutter="8">
                <je-col :span="8">
                  <je-tag type="info">8</je-tag>
                </je-col>
                <je-col :span="8" :offset="8">
                  <je-tag type="danger">8 + offset 8</je-tag>
                </je-col>
              </je-row>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
