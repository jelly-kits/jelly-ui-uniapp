<script setup lang="ts">
/*
 * 组件详情页：自定义滚动条（pages/demo/scrollbar）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 导航与滚动交互批次：JeAffix / JeBacktop / JeScrollbar / JeAnchor / JeIndexBar / JeSidebar / JeCarousel */
/** 自定义滚动条：给够高度好让内容溢出 */
const scrollbarItems = Array.from({ length: 12 }, (_, index) => index + 1)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="自定义滚动条" route="scrollbar" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="自定义滚动条" description="JeScrollbar（滚轮 / 拖动滑块 / 点轨道）" inset>
            <view class="demo-block">
              <je-scrollbar :height="140">
                <je-cell v-for="item in scrollbarItems" :key="item" :title="`列表项 ${item}`" value="内容" />
              </je-scrollbar>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
