<script setup lang="ts">
/*
 * 组件详情页：单元格（pages/demo/cell）
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

const clicked = ref(0)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">单元格</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="单元格" description="JeCell + JeCellGroup">
            <je-cell title="普通项" value="内容" />
            <je-cell title="带图标" icon="chevron-right" value="icon" />
            <je-cell title="可点击" is-link @click="clicked += 1" />
            <je-cell title="点击次数" :value="clicked" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
