<script setup lang="ts">
/*
 * 组件详情页：分享面板（pages/demo/share-sheet）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeShareOption } from '../../components/je-share-sheet'

/** 分享面板 */
const shareVisible = ref(false)

const shareResult = ref('—')

const shareOptions: JeShareOption[] = [
  { name: '微信好友', icon: 'wechat' },
  { name: '朋友圈', icon: 'wechat', color: 'var(--je-success)' },
  { name: '收藏', icon: 'star', color: 'var(--je-warning)' },
  { name: '复制链接', icon: 'link', color: 'var(--je-info)' },
  { name: '删除', icon: 'close', color: 'var(--je-danger)', disabled: true },
]

const onShareSelect = (option: JeShareOption) => {
  shareResult.value = option.name
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="分享面板" route="share-sheet" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="分享面板" description="JeShareSheet" inset>
            <je-cell title="点我分享" is-link @click="shareVisible = true" />
            <je-cell title="最近分享" :value="shareResult" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-share-sheet
      v-model="shareVisible"
      title="分享到"
      description="选择分享目标，点遮罩或抓手取消"
      :options="shareOptions"
      @select="onShareSelect"
    />
  </view>
</template>
