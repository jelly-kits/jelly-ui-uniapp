<script setup lang="ts">
/*
 * 组件详情页：下拉选择（pages/demo/select）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeSelectOption } from '../../components/je-select'

/** 表单选择器批次：JeSelect / JeTimePicker / JeTimeSelect / JeArea / JeCascader / JeDatePicker / JeAutoComplete / JeCalendar */
/** 下拉选择 */
const selectValue = ref<string | number | null>('hz')

const selectOptions: JeSelectOption[] = [
  { label: '杭州', value: 'hz' },
  { label: '上海', value: 'sh' },
  { label: '北京', value: 'bj' },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="下拉选择" route="select" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="下拉选择" description="JeSelect" inset>
            <view class="demo-block">
              <je-select v-model="selectValue" :options="selectOptions" placeholder="请选择城市" />
            </view>
            <je-cell title="已选" :value="selectValue === null ? '—' : String(selectValue)" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
