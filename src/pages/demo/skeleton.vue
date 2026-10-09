<script setup lang="ts">
/*
 * 组件详情页：骨架屏与反馈（pages/demo/skeleton）
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

const toastVisible = ref(false)

/** 骨架屏：关闭微光动画的静态示例 */
const skeletonAnimated = ref(false)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">骨架屏与反馈</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="骨架屏与反馈" inset>
            <view class="demo-block demo-col">
              <je-skeleton :rows="3" />
              <je-skeleton :rows="2" :animated="skeletonAnimated" round />
            </view>
            <je-cell title="JeToast" is-link @click="toastVisible = true" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-toast v-model="toastVisible" message="来自 JeToast 的提示" />
  </view>
</template>
