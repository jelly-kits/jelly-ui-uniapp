<script setup lang="ts">
/*
 * 组件详情页：二维码（pages/demo/qrcode）
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
        <text class="doc__title">二维码</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="二维码" description="JeQrcode（方块 / 圆点 / 渐变）" inset>
            <view class="demo-block demo-row">
              <je-qrcode value="https://jelly-ui.dev" :size="140" />
              <je-qrcode value="https://jelly-ui.dev" :size="140" shape="dot" />
              <je-qrcode value="https://jelly-ui.dev" :size="140" :gradient="['#667EEA', '#764BA2']" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
