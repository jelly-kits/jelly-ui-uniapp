<script setup lang="ts">
/*
 * 组件详情页：颜色选择（pages/demo/color-picker）
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

/** 颜色选择器：普通色 / 带透明度 / 预设色 */
const colorValue = ref('#667EEA')

const colorAlphaValue = ref('#667EEA80')

const colorPresets = ['#667EEA', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444']
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">颜色选择</text>
      </view>
    </view>

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
