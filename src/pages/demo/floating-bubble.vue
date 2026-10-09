<script setup lang="ts">
/*
 * 组件详情页：浮动气泡（pages/demo/floating-bubble）
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

/** 浮动气泡：初始位置用同一个对象引用，避免每次重渲染都被 watch 拉回原点 */
const bubbleOffset = { x: 20, y: 320 }

const bubbleLog = ref('—')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">浮动气泡</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="浮动气泡" description="JeFloatingBubble（按住拖动，松手吸附到上 / 下边）" inset>
            <je-cell title="点击回显" :value="bubbleLog" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-floating-bubble
      icon="plus"
      :offset="bubbleOffset"
      :gap="16"
      magnetic="y"
      @click="bubbleLog = '气泡被点击了'"
    />
  </view>
</template>
