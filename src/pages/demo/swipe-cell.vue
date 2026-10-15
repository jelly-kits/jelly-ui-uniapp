<script setup lang="ts">
/*
 * 组件详情页：滑动单元格（pages/demo/swipe-cell）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 滑动单元格 */
const swipeValue = ref<'left' | 'right' | ''>('')

const swipeLog = ref('—')

const swipeAction = (label: string) => {
  swipeLog.value = label
  swipeValue.value = ''
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="滑动单元格" route="swipe-cell" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="滑动单元格" description="JeSwipeCell（左滑 / 右滑露出操作区）" inset>
            <je-swipe-cell v-model="swipeValue" @click="swipeLog = '点了内容区'">
              <je-cell title="左滑或右滑试试" :value="swipeValue || '未展开'" />
              <template #left>
                <view class="demo-swipe-action demo-swipe-action--pin" role="button" @tap="swipeAction('置顶')">
                  置顶
                </view>
              </template>
              <template #right>
                <view class="demo-swipe-action demo-swipe-action--delete" role="button" @tap="swipeAction('删除')">
                  删除
                </view>
              </template>
            </je-swipe-cell>
            <je-cell title="最近操作" :value="swipeLog" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
