<script setup lang="ts">
/*
 * 组件详情页：滚轮选择器（pages/demo/picker）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { computed, ref } from 'vue'
import type { JePickerColumn } from '../../components/je-picker'

/** 滚轮选择器：确认才写回 v-model */
const pickerValue = ref<(string | number)[]>(['bj', 'cy'])

const cityOptions = [
  { text: '杭州', value: 'hz' },
  { text: '上海', value: 'sh' },
  { text: '北京', value: 'bj' },
  { text: '深圳', value: 'sz', subText: '新一线' },
]

/** 区域按城市分组，父列选中哪座城市，子列就只展示该城市的区域 */
const areaMap: Record<string, { text: string; value: string }[]> = {
  hz: [
    { text: '西湖区', value: 'xh' },
    { text: '拱墅区', value: 'gs' },
    { text: '滨江区', value: 'binjiang' },
  ],
  sh: [
    { text: '黄浦区', value: 'hp' },
    { text: '浦东新区', value: 'pd' },
    { text: '徐汇区', value: 'xuhui' },
  ],
  bj: [
    { text: '朝阳区', value: 'cy' },
    { text: '海淀区', value: 'hd' },
    { text: '东城区', value: 'dc' },
  ],
  sz: [
    { text: '南山区', value: 'ns' },
    { text: '福田区', value: 'ft' },
    { text: '罗湖区', value: 'lh' },
  ],
}

/** 当前滚轮停在的城市（change 事件回传），用它驱动「区域」列的候选 */
const pickerCity = ref('bj')

const pickerColumns = computed<JePickerColumn[]>(() => [
  { name: 'city', title: '城市', options: cityOptions },
  { name: 'area', title: '区域', options: areaMap[pickerCity.value] ?? [] },
])

/** 某一列停下后同步父列选择，切城市时区域列会跟着换 */
const onPickerChange = (values: (string | number)[]) => {
  pickerCity.value = String(values[0] ?? pickerCity.value)
}

const pickerText = computed(
  () =>
    pickerColumns.value
      .map((column, index) => column.options.find((option) => option.value === pickerValue.value[index])?.text)
      .filter(Boolean)
      .join(' / ') || '—',
)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="滚轮选择器" route="picker" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="滚轮选择器" description="JePicker" inset>
            <view class="demo-block">
              <je-picker v-model="pickerValue" :columns="pickerColumns" title="选择地区" @change="onPickerChange" />
            </view>
            <je-cell title="已确认" :value="pickerText" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
