<script setup lang="ts">
/*
 * 组件详情页：空状态（pages/demo/empty）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="空状态" route="empty" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="空状态" inset>
            <je-empty description="暂无数据" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
