<script setup lang="ts">
/*
 * 组件详情页：输入（pages/demo/search）
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

/** 搜索与数字输入 */
const keyword = ref('')

const amount = ref(1)

const searchLog = ref('')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">输入</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="输入" inset>
            <view class="demo-block demo-col">
              <je-search v-model="keyword" placeholder="搜索组件" show-cancel @search="searchLog = keyword" />
            </view>
            <je-cell title="提交的关键字" :value="searchLog || '—'" />
            <view class="demo-block demo-col">
              <je-input-number v-model="amount" :min="0" :max="10" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
