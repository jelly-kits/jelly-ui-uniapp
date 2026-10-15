<script setup lang="ts">
/*
 * 组件详情页：日期选择（pages/demo/date-picker）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeDatePickerModelValue } from '../../components/je-date-picker'

/** 日期 / 日期时间 / 日期区间 */
const dateValue = ref<JeDatePickerModelValue>('2026-10-07')

const dateTimeValue = ref<JeDatePickerModelValue>('2026-10-07 09:30')

const dateRangeValue = ref<JeDatePickerModelValue>(['2026-10-01', '2026-10-07'])
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="日期选择" route="date-picker" />

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
