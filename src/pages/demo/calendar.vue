<script setup lang="ts">
/*
 * 组件详情页：日历（pages/demo/calendar）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { computed, ref } from 'vue'

/** 日历 */
const calendarValue = ref<Date>(new Date(2026, 9, 7))

const calendarText = computed(() => {
  const date = calendarValue.value
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
})
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="日历" route="calendar" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="日历" description="JeCalendar" inset>
            <view class="demo-block">
              <je-calendar v-model="calendarValue" />
            </view>
            <je-cell title="已选" :value="calendarText" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
