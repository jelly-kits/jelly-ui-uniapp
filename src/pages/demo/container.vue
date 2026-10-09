<script setup lang="ts">
/*
 * 组件详情页：布局容器（pages/demo/container）
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
        <text class="doc__title">布局容器</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="布局容器" inset>
            <view class="demo-block demo-col">
              <je-container direction="vertical">
                <je-header>
                  <je-text size="small">Header</je-text>
                </je-header>
                <je-main>
                  <je-text size="small">Main</je-text>
                </je-main>
                <je-footer>
                  <je-text size="small">Footer</je-text>
                </je-footer>
              </je-container>
              <je-divider />
              <je-container>
                <je-aside width="88">
                  <je-text size="small">Aside</je-text>
                </je-aside>
                <je-main>
                  <je-text size="small">Main</je-text>
                </je-main>
              </je-container>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
