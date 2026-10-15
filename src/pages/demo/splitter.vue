<script setup lang="ts">
/*
 * 组件详情页：分割面板（pages/demo/splitter）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="分割面板" route="splitter" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="分割面板" description="JeSplitter + JeSplitterPanel（拖动分割条改变占比）" inset>
            <view class="demo-splitter">
              <je-splitter>
                <je-splitter-panel :size="30">
                  <view class="demo-splitter__pane"><text>左侧 30%</text></view>
                </je-splitter-panel>
                <je-splitter-panel>
                  <view class="demo-splitter__pane"><text>右侧 70%，内容超出后可独立滚动。</text></view>
                </je-splitter-panel>
              </je-splitter>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
