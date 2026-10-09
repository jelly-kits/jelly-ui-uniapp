<script setup lang="ts">
/*
 * 组件详情页：日期选择（pages/demo/date-picker）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeDatePickerModelValue } from '../../components/je-date-picker'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/** 日期 / 日期时间 / 日期区间 */
const dateValue = ref<JeDatePickerModelValue>('2026-10-07')

const dateTimeValue = ref<JeDatePickerModelValue>('2026-10-07 09:30')

const dateRangeValue = ref<JeDatePickerModelValue>(['2026-10-01', '2026-10-07'])
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">日期选择</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="日期选择" description="JeDatePicker（date / datetime / daterange）" inset>
            <view class="demo-block">
              <je-date-picker v-model="dateValue" />
              <je-date-picker v-model="dateTimeValue" type="datetime" />
              <je-date-picker v-model="dateRangeValue" type="daterange" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
