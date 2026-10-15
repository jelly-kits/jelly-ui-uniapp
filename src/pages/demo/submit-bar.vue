<script setup lang="ts">
/*
 * 组件详情页：提交栏（pages/demo/submit-bar）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

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
    <doc-demo-bar title="提交栏" route="submit-bar" />

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
