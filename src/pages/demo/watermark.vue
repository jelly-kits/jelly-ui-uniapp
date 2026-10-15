<script setup lang="ts">
/*
 * 组件详情页：水印（pages/demo/watermark）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="水印" route="watermark" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="水印" description="JeWatermark（在包裹内容上平铺水印）" inset>
            <je-watermark content="Jelly UI 内部资料" :rotate="-20">
              <view class="demo-watermark">
                <text class="demo-watermark__title">内部资料</text>
                <text class="demo-watermark__desc">
                  这块内容被水印覆盖，水印会随内容一起滚动。内容区给到足够高度后，
                  可以清楚看到「Jelly UI 内部资料」按 -20° 倾斜平铺在整块区域上。
                </text>
                <text class="demo-watermark__desc">
                  水印层设置了 pointer-events: none，不会拦截这里文字的选中与点击。
                  把容器换成图片、表格或任意长内容，水印同样会铺满整个容器。
                </text>
              </view>
            </je-watermark>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
