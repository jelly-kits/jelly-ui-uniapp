<script setup lang="ts">
/*
 * 组件详情页：颜色选择（pages/demo/color-picker）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 颜色选择器：普通色 / 带透明度 / 预设色 */
const colorValue = ref('#667EEA')

const colorAlphaValue = ref('#667EEA80')

const colorPresets = ['#667EEA', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444']
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="颜色选择" route="color-picker" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="颜色选择" description="JeColorPicker（点色块展开面板，支持透明度与预设）" inset>
            <view class="demo-block demo-row">
              <je-color-picker v-model="colorValue" :predefine="colorPresets" />
              <je-color-picker v-model="colorAlphaValue" show-alpha />
              <je-color-picker v-model="colorValue" disabled />
            </view>
            <je-cell title="当前颜色" :value="colorValue" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
