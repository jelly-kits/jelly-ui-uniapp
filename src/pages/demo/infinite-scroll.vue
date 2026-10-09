<script setup lang="ts">
/*
 * 组件详情页：无限滚动（pages/demo/infinite-scroll）
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

/** 无限滚动 */
const infiniteLoading = ref(false)

const infiniteFinished = ref(false)

const infiniteItems = ref<number[]>(Array.from({ length: 6 }, (_, index) => index + 1))

const onInfiniteLoad = () => {
  if (infiniteLoading.value || infiniteFinished.value) return
  infiniteLoading.value = true
  setTimeout(() => {
    const start = infiniteItems.value.length
    infiniteItems.value = [...infiniteItems.value, ...Array.from({ length: 5 }, (_, i) => start + i + 1)]
    infiniteLoading.value = false
    if (infiniteItems.value.length >= 21) infiniteFinished.value = true
  }, 800)
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">无限滚动</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="无限滚动" description="JeInfiniteScroll（滚到页面底部自动加载）" inset>
            <je-infinite-scroll
              :loading="infiniteLoading"
              :finished="infiniteFinished"
              @load="onInfiniteLoad"
            >
              <je-cell
                v-for="item in infiniteItems"
                :key="item"
                :title="`第 ${item} 条数据`"
                value="加载更多"
              />
            </je-infinite-scroll>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
