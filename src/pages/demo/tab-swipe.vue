<script setup lang="ts">
/*
 * 组件详情页：可滑动标签页（pages/demo/tab-swipe）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 可滑动标签页：JeTab + JeTabItem */
const jeTabActive = ref<string | number>('overview')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="可滑动标签页" route="tab-swipe" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="可滑动标签页" description="JeTab + JeTabItem（line 下划线跟随、内容可左右滑动）" inset>
            <je-tab v-model="jeTabActive">
              <je-tab-item name="overview" title="概览">
                <view class="demo-block"><text>概览面板的内容。</text></view>
              </je-tab-item>
              <je-tab-item name="detail" title="详情" badge="6">
                <view class="demo-block"><text>详情面板的内容，标题带角标。</text></view>
              </je-tab-item>
              <je-tab-item name="notice" title="通知" dot>
                <view class="demo-block"><text>通知面板的内容，标题带小红点。</text></view>
              </je-tab-item>
              <je-tab-item name="blocked" title="禁用" disabled>
                <view class="demo-block"><text>禁用页签点不开。</text></view>
              </je-tab-item>
            </je-tab>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
