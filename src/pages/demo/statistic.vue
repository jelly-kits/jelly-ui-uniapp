<script setup lang="ts">
/*
 * 组件详情页：统计数值（pages/demo/statistic）
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

/** 展示与轻反馈批次：JeStatistic / JeCountDown / JeBreadcrumb / JeDescriptions / JeCircle / JeImage / JeImagePreview */
/** 统计数值：数字滚动，点一下加一笔 */
const statisticValue = ref(12345.6789)

const bumpStatistic = () => {
  statisticValue.value = Math.round((statisticValue.value + 888.88) * 100) / 100
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">统计数值</text>
      </view>
    </view>

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
