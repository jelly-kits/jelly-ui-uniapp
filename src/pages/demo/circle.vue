<script setup lang="ts">
/*
 * 组件详情页：环形进度（pages/demo/circle）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 环形进度 */
const circleValue = ref(68)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="环形进度" route="circle" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="环形进度" description="JeCircle" inset>
            <view class="demo-block demo-row">
              <je-circle :model-value="circleValue" :size="96" text="描边" />
              <je-circle :model-value="82" :size="96" fill="gradient" text="渐变填充" />
            </view>
            <je-cell title="调整当前值">
              <je-stepper v-model="circleValue" :min="0" :max="100" />
            </je-cell>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
