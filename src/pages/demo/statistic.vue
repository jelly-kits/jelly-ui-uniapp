<script setup lang="ts">
/*
 * 组件详情页：统计数值（pages/demo/statistic）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 展示与轻反馈批次：JeStatistic / JeCountDown / JeBreadcrumb / JeDescriptions / JeCircle / JeImage / JeImagePreview */
/** 统计数值：数字滚动，点一下加一笔 */
const statisticValue = ref(12345.6789)

const bumpStatistic = () => {
  statisticValue.value = Math.round((statisticValue.value + 888.88) * 100) / 100
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="统计数值" route="statistic" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="统计数值" description="JeStatistic（数字滚动）" inset>
            <view class="demo-block">
              <je-statistic
                :value="statisticValue"
                title="本月销售额"
                prefix="￥"
                suffix="元"
                :precision="2"
              />
            </view>
            <je-space>
              <je-button size="small" @click="bumpStatistic">加一笔</je-button>
            </je-space>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
