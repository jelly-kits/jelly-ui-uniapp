<script setup lang="ts">
/*
 * 组件详情页：气泡卡片（pages/demo/popover）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 气泡卡片：受控开合 */
const popoverVisible = ref(false)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="气泡卡片" route="popover" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group
        title="气泡卡片"
        description="JePopover（#content 自定义，可受控）"
        inset
        padded
      >
        <view class="demo-row">
          <je-popover v-model="popoverVisible" title="受控展开" trigger="click" placement="bottom-start">
            <je-button size="small">点我切换</je-button>
            <template #content>
              <text class="demo-pop__text">这个气泡由 v-model 控制，点外面或再点按钮都会收起。</text>
            </template>
          </je-popover>
          <je-popover title="悬停触发" placement="top">
            <je-button size="small" variant="ghost">悬停 / 点我</je-button>
            <template #content>
              <text class="demo-pop__text">不传 v-model 时组件自己管开合状态。</text>
            </template>
          </je-popover>
        </view>
      </je-cell-group>
    </scroll-view>
  </view>
</template>
