<script setup lang="ts">
/*
 * 组件详情页：通知栏（pages/demo/notice-bar）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

const clicked = ref(0)

/** 通知栏 */
const noticeText =
  'Jelly UI 通知栏：这段文案故意写得足够长，用来演示文字超出容器宽度后会横向循环滚动。'
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="通知栏" route="notice-bar" />

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
