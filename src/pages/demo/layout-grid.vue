<script setup lang="ts">
/*
 * 组件详情页：栅格（pages/demo/layout-grid）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">栅格</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="栅格" inset>
            <view class="demo-block demo-col">
              <je-row :gutter="8">
                <je-col :span="12">
                  <je-tag type="primary">span 12</je-tag>
                </je-col>
                <je-col :span="6">
                  <je-tag type="success">span 6</je-tag>
                </je-col>
                <je-col :span="6">
                  <je-tag type="warning">span 6</je-tag>
                </je-col>
              </je-row>
              <je-row :gutter="8">
                <je-col :span="8">
                  <je-tag type="info">8</je-tag>
                </je-col>
                <je-col :span="8" :offset="8">
                  <je-tag type="danger">8 + offset 8</je-tag>
                </je-col>
              </je-row>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
