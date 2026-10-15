<script setup lang="ts">
/*
 * 组件详情页：穿梭框（pages/demo/transfer）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 穿梭框 */
const transferValue = ref<(string | number)[]>(['2'])

const transferData = [
  { key: '1', label: '选项一' },
  { key: '2', label: '选项二' },
  { key: '3', label: '选项三' },
  { key: '4', label: '选项四（禁用）', disabled: true },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="穿梭框" route="transfer" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="穿梭框" inset>
            <view class="demo-block demo-col">
              <je-transfer v-model="transferValue" :data="transferData" filterable />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
