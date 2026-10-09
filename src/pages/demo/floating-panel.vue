<script setup lang="ts">
/*
 * 组件详情页：浮动面板（pages/demo/floating-panel）
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

/** 浮动面板：开合与当前高度 */
const floatingPanelOpen = ref(false)

const floatingPanelHeight = ref(160)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">浮动面板</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="浮动面板" description="JeFloatingPanel（抓手拖拽吸附，内容区独立滚动）" inset>
            <view class="demo-block demo-row">
              <je-button size="small" @click="floatingPanelOpen = true">展开面板</je-button>
              <je-text size="small">当前高度：{{ floatingPanelHeight }}px</je-text>
            </view>
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-floating-panel
      v-if="floatingPanelOpen"
      v-model="floatingPanelHeight"
      title="浮动面板"
      closeable
      :anchors="[80, 160, 280]"
      @close="floatingPanelOpen = false"
    >
      <view class="demo-block">
        <je-text size="small">按住抓手上下拖动，松手吸附到最近的档位（80 / 160 / 280）。</je-text>
      </view>
    </je-floating-panel>
  </view>
</template>
