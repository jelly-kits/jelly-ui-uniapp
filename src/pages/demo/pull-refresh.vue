<script setup lang="ts">
/*
 * 组件详情页：下拉刷新（pages/demo/pull-refresh）
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

/** 下拉刷新 */
const refreshLoading = ref(false)

const refreshCount = ref(0)

const onRefresh = () => {
  refreshLoading.value = true
  setTimeout(() => {
    refreshCount.value += 1
    refreshLoading.value = false
  }, 1200)
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">下拉刷新</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="下拉刷新" description="JePullRefresh（页面滚到顶部再下拉）" inset>
            <je-pull-refresh v-model="refreshLoading" @refresh="onRefresh">
              <view class="demo-pull">
                <view class="demo-pull__row">已刷新 {{ refreshCount }} 次</view>
                <view class="demo-pull__row">下拉到「释放立即刷新」再松手，顶部就会出现加载动画。</view>
                <view class="demo-pull__row">松手后进入加载态，1.2 秒后提示刷新成功并自动收起。</view>
                <view class="demo-pull__row">内容区留出足够高度，方便在这里按住鼠标或手指往下拖。</view>
                <view class="demo-pull__row">列表内容</view>
                <view class="demo-pull__row">列表内容</view>
              </view>
            </je-pull-refresh>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
