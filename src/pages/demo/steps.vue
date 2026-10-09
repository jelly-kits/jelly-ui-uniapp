<script setup lang="ts">
/*
 * 组件详情页：步骤条（pages/demo/steps）
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

/** 步骤条 */
const stepActive = ref(1)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">步骤条</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="步骤条" inset>
            <view class="demo-block demo-col">
              <je-steps :active="stepActive">
                <je-step title="已下单" description="09:00" />
                <je-step title="配送中" description="10:30" />
                <je-step title="已送达" />
              </je-steps>
              <je-space>
                <je-tag type="primary" @click="stepActive = Math.max(0, stepActive - 1)">上一步</je-tag>
                <je-tag type="success" @click="stepActive = Math.min(2, stepActive + 1)">下一步</je-tag>
              </je-space>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
