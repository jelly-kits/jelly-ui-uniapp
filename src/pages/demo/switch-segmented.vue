<script setup lang="ts">
/*
 * 组件详情页：开关与分段（pages/demo/switch-segmented）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 开关 / 分段控制器 */
const switched = ref(true)

const segmented = ref<string | number>('day')

const segmentedOptions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="开关与分段" route="switch-segmented" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="开关与分段" inset>
            <je-cell title="开关">
              <je-switch v-model="switched" active-text="开" inactive-text="关" />
            </je-cell>
            <view class="segmented-row">
              <je-segmented v-model="segmented" :options="segmentedOptions" block />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
