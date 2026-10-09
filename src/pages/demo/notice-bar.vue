<script setup lang="ts">
/*
 * 组件详情页：通知栏（pages/demo/notice-bar）
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

const clicked = ref(0)

/** 通知栏 */
const noticeText =
  'Jelly UI 通知栏：这段文案故意写得足够长，用来演示文字超出容器宽度后会横向循环滚动。'
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">通知栏</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="通知栏" description="JeNoticeBar" inset>
            <view class="demo-block demo-col">
              <je-notice-bar :text="noticeText" mode="link" @click="clicked += 1" />
              <je-notice-bar text="可换行的通知栏，文字超长时不再滚动而是折行展示。" wrapable />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
