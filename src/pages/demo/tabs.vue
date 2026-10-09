<script setup lang="ts">
/*
 * 组件详情页：标签页（pages/demo/tabs）
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

/** 标签页：line 与 card 两套，card 那套可关闭 */
const tabsActive = ref<string | number>('overview')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">标签页</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="标签页" description="JeTabs + JeTabPane（含一个禁用页签）" inset>
            <je-tabs v-model="tabsActive">
              <je-tab-pane name="overview" label="概览">
                <view class="demo-block"><je-text size="small">概览面板的内容。</je-text></view>
              </je-tab-pane>
              <je-tab-pane name="detail" label="详情">
                <view class="demo-block"><je-text size="small">详情面板的内容。</je-text></view>
              </je-tab-pane>
              <je-tab-pane name="blocked" label="禁用" disabled>
                <view class="demo-block"><je-text size="small">禁用页签点不开。</je-text></view>
              </je-tab-pane>
            </je-tabs>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
