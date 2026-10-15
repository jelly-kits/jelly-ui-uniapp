<script setup lang="ts">
/*
 * 组件详情页：进度条（pages/demo/progress）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="进度条" route="progress" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="进度条" inset>
            <view class="demo-block demo-col">
              <je-progress :percentage="62" />
              <je-progress :percentage="80" status="success" striped animated />
              <je-progress :percentage="35" type="circle" />
              <je-progress :percentage="70" type="circle" status="warning" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
