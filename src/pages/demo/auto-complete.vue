<script setup lang="ts">
/*
 * 组件详情页：自动补全（pages/demo/auto-complete）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeAutoCompleteOption } from '../../components/je-auto-complete'

/** 自动补全：同步返回候选，演示防抖与外层 Popup 交互 */
const acValue = ref('')

const acCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安']

const fetchSuggestions = (query: string): JeAutoCompleteOption[] =>
  acCities
    .filter((city) => city.includes(query))
    .map((city) => ({ value: city, label: city }))
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="自动补全" route="auto-complete" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="自动补全" description="JeAutoComplete" inset>
            <view class="demo-block">
              <je-auto-complete
                v-model="acValue"
                :fetch-suggestions="fetchSuggestions"
                placeholder="输入城市名，如「杭」"
              />
            </view>
            <je-cell title="已选" :value="acValue || '—'" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
