<script setup lang="ts">
/*
 * 组件详情页：步进器与评分（pages/demo/stepper-rate）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/** 步进器 / 评分 */
const quantity = ref(1)

const score = ref(4)

const scoreHalf = ref(3.5)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">步进器与评分</text>
      </view>
    </view>

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
