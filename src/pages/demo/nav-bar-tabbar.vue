<script setup lang="ts">
/*
 * 组件详情页：顶部导航 / 底部导航（pages/demo/nav-bar-tabbar）
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

/** 底部导航 */
const tab = ref<string | number>('home')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">顶部导航 / 底部导航</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="顶部导航 / 底部导航" inset>
            <je-nav-bar title="页面标题" description="副标题" left-text="返回" right-text="更多" />
            <je-tabbar v-model="tab" :fixed="false">
              <je-tabbar-item name="home" icon="home" text="首页" />
              <je-tabbar-item name="search" icon="search" text="搜索" :badge="2" />
              <je-tabbar-item name="user" icon="user" text="我的" />
            </je-tabbar>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
