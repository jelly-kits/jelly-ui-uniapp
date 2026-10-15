<script setup lang="ts">
/*
 * 组件详情页：漫游式引导（pages/demo/tour）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeTourStep } from '../../components/je-tour'

/** 漫游式引导：目标为演示页里带 id 的元素 */
const tourVisible = ref(false)

const tourSteps: JeTourStep[] = [
  { target: '#demo-tour-1', title: '第一步', description: '引导从这里开始。', placement: 'bottom' },
  { target: '#demo-tour-2', title: '第二步', description: '点「下一步」会高亮这里。', placement: 'bottom' },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="漫游式引导" route="tour" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="漫游式引导" description="JeTour（点开始，遮罩高亮目标元素并逐步引导）" inset>
            <view class="demo-block demo-row">
              <je-button id="demo-tour-1" size="small" @click="tourVisible = true">开始引导</je-button>
              <je-button id="demo-tour-2" size="small" variant="ghost">第二步目标</je-button>
            </view>
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-tour v-model="tourVisible" :steps="tourSteps" />
  </view>
</template>
