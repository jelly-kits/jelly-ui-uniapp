<script setup lang="ts">
/*
 * 组件详情页：复选框 / 单选框（pages/demo/checkbox-radio）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { computed, ref } from 'vue'

/** 复选框 / 单选框 */
const checkedFruits = ref<(string | number)[]>(['apple'])

const fruitOptions = [
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
]

const pickedSize = ref<string | number | null>('m')

const sizeOptions = [
  { label: 'S', value: 's' },
  { label: 'M', value: 'm' },
  { label: 'L', value: 'l' },
]

const checkedFruitsText = computed(() => checkedFruits.value.join('、') || '—')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="复选框 / 单选框" route="checkbox-radio" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="复选框 / 单选框" description="JeCheckboxGroup + JeRadioGroup" inset>
            <je-cell title="复选">
              <je-checkbox-group v-model="checkedFruits" :options="fruitOptions" />
            </je-cell>
            <je-cell title="已选" :value="checkedFruitsText" />
            <je-cell title="单选">
              <je-radio-group v-model="pickedSize" :options="sizeOptions" />
            </je-cell>
            <je-cell title="已选" :value="pickedSize === null ? '—' : String(pickedSize)" />
            <je-cell title="禁用">
              <je-radio-group v-model="pickedSize" :options="sizeOptions" disabled />
            </je-cell>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
