<script setup lang="ts">
/*
 * 组件详情页：布局容器（pages/demo/container）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="布局容器" route="container" />

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
