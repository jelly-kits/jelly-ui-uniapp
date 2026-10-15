<script setup lang="ts">
/*
 * 组件详情页：步进器与评分（pages/demo/stepper-rate）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 步进器 / 评分 */
const quantity = ref(1)

const score = ref(4)

const scoreHalf = ref(3.5)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="步进器与评分" route="stepper-rate" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="步进器与评分" description="JeStepper + JeRate" inset>
            <je-cell title="数量">
              <je-stepper v-model="quantity" :min="1" :max="10" />
            </je-cell>
            <je-cell title="禁用">
              <je-stepper :model-value="3" disabled />
            </je-cell>
            <je-cell title="评分">
              <je-rate v-model="score" />
            </je-cell>
            <je-cell title="半星 · 可清零">
              <je-rate v-model="scoreHalf" allow-half clearable />
            </je-cell>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
