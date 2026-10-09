<script setup lang="ts">
/*
 * 组件详情页：文字提示（pages/demo/tooltip）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JePlacementValue } from '../../core/placement'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/** 浮层与菜单批次：JeTooltip / JePopover / JePopconfirm / JeDropdown / JeDropdownMenu / JeMenu / JeTabs */
/** 文字提示：面板方位 */
const tooltipPlacement = ref<JePlacementValue>('top')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">文字提示</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group
        title="文字提示"
        description="JeTooltip（桌面悬停 / 窄屏点击，方位可切换）"
        inset
        padded
      >
        <je-space wrap>
          <je-button size="small" variant="ghost" @click="tooltipPlacement = 'top'">上</je-button>
          <je-button size="small" variant="ghost" @click="tooltipPlacement = 'bottom'">下</je-button>
          <je-button size="small" variant="ghost" @click="tooltipPlacement = 'left'">左</je-button>
          <je-button size="small" variant="ghost" @click="tooltipPlacement = 'right'">右</je-button>
        </je-space>
        <view class="demo-row demo-row--gap-top">
          <je-tooltip :placement="tooltipPlacement" content="当前方位跟着上面的按钮切换">
            <je-button size="small">悬停 / 点我看提示</je-button>
          </je-tooltip>
          <je-tooltip placement="bottom" content="禁用态不会弹出" disabled>
            <je-button size="small" variant="ghost">禁用</je-button>
          </je-tooltip>
        </view>
      </je-cell-group>
    </scroll-view>
  </view>
</template>
