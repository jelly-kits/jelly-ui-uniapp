<script setup lang="ts">
/*
 * 组件详情页：提交栏（pages/demo/submit-bar）
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

/** 提交栏 */
const submitLoading = ref(false)

const onSubmitBar = () => {
  submitLoading.value = true
  setTimeout(() => {
    submitLoading.value = false
  }, 1000)
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">提交栏</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="提交栏" description="JeSubmitBar" inset>
            <je-submit-bar
              :price="128.5"
              label="合计："
              tip="满 99 元包邮"
              tip-icon="star"
              :loading="submitLoading"
              button-text="提交订单"
              @submit="onSubmitBar"
            />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
