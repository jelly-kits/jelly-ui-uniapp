<script setup lang="ts">
/*
 * 组件详情页：滑块（pages/demo/slider）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { computed, ref } from 'vue'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/** 滑块：单值与区间共用一个组件，modelValue 的形态决定模式 */
const sliderSingle = ref<number | number[]>(40)

const sliderRange = ref<number | number[]>([20, 60])

const sliderStepped = ref<number | number[]>(4)

const sliderSingleText = computed(() => String(sliderSingle.value))

const sliderRangeText = computed(() =>
  Array.isArray(sliderRange.value) ? sliderRange.value.join(' ~ ') : String(sliderRange.value),
)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">滑块</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="滑块" description="JeSlider" inset>
            <view class="demo-block">
              <je-slider v-model="sliderSingle" />
              <je-slider v-model="sliderRange" />
              <je-slider v-model="sliderStepped" :min="0" :max="10" :step="2" />
              <je-slider :model-value="40" disabled />
            </view>
            <je-cell title="单值" :value="sliderSingleText" />
            <je-cell title="区间" :value="sliderRangeText" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
