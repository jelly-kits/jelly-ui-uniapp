<script setup lang="ts">
/*
 * 组件详情页：海报（pages/demo/poster）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import type { JePosterBackground, JePosterElement } from '../../components/je-poster'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/** 海报：一份设计稿配置（坐标 / 字号都按 400 × 240 书写） */
const posterBackground: JePosterBackground = { color: '#667EEA' }

const posterElements: JePosterElement[] = [
  { type: 'text', x: 24, y: 28, text: 'Jelly UI', fontSize: 36, fontWeight: 600, color: '#FFFFFF' },
  {
    type: 'text',
    x: 24,
    y: 80,
    text: '零依赖的 Vue 3 组件库',
    fontSize: 20,
    color: 'rgba(255,255,255,0.85)',
    width: 220,
  },
  { type: 'qrcode', x: 268, y: 124, value: 'https://jelly-ui.dev', size: 88, color: '#1F2937' },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">海报</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="海报" description="JePoster（按设计稿坐标摆放文本 / 二维码）" inset>
            <view class="demo-poster">
              <je-poster
                :width="400"
                :height="240"
                :background="posterBackground"
                :elements="posterElements"
              />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
