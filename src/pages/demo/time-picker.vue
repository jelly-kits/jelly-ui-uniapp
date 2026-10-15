<script setup lang="ts">
/*
 * 组件详情页：时间选择（pages/demo/time-picker）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 时 / 分滚轮 */
const timeValue = ref<string | null>('09:30')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="时间选择" route="time-picker" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="时间选择" description="JeTimePicker（时 / 分两列滚轮）" inset>
            <view class="demo-block">
              <je-time-picker v-model="timeValue" />
            </view>
            <je-cell title="已选" :value="timeValue || '—'" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
