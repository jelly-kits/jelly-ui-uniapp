<script setup lang="ts">
/*
 * 组件详情页：浮动气泡（pages/demo/floating-bubble）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 浮动气泡：初始位置用同一个对象引用，避免每次重渲染都被 watch 拉回原点 */
const bubbleOffset = { x: 20, y: 320 }

const bubbleLog = ref('—')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="浮动气泡" route="floating-bubble" />

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
