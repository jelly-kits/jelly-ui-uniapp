<script setup lang="ts">
/*
 * 组件详情页：宫格（pages/demo/grid）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="宫格" route="grid" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="宫格" inset>
            <je-grid :column="4" square>
              <je-grid-item icon="user" text="用户" />
              <je-grid-item icon="search" text="搜索" :badge="3" />
              <je-grid-item icon="star" text="收藏" dot />
              <je-grid-item icon="setting" text="设置" />
            </je-grid>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
