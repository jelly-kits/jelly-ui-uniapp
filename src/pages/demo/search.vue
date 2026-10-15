<script setup lang="ts">
/*
 * 组件详情页：输入（pages/demo/search）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 搜索与数字输入 */
const keyword = ref('')

const amount = ref(1)

const searchLog = ref('')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="输入" route="search" />

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
