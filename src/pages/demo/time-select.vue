<script setup lang="ts">
/*
 * 组件详情页：时间下拉（pages/demo/time-select）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 时间下拉 */
const timeSelectValue = ref('09:30')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="时间下拉" route="time-select" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="时间下拉" description="JeTimeSelect" inset>
            <view class="demo-block">
              <je-time-select v-model="timeSelectValue" />
            </view>
            <je-cell title="已选" :value="timeSelectValue || '—'" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
