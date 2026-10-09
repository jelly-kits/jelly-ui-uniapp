<script setup lang="ts">
/*
 * 组件详情页：穿梭框（pages/demo/transfer）
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

/** 穿梭框 */
const transferValue = ref<(string | number)[]>(['2'])

const transferData = [
  { key: '1', label: '选项一' },
  { key: '2', label: '选项二' },
  { key: '3', label: '选项三' },
  { key: '4', label: '选项四（禁用）', disabled: true },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">穿梭框</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="穿梭框" inset>
            <view class="demo-block demo-col">
              <je-transfer v-model="transferValue" :data="transferData" filterable />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
