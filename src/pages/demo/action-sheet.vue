<script setup lang="ts">
/*
 * 组件详情页：动作面板（pages/demo/action-sheet）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeActionSheetAction } from '../../components/je-action-sheet'

/** 动作面板 */
const actionSheetVisible = ref(false)

const actionSheetResult = ref('—')

const actionSheetActions: JeActionSheetAction[] = [
  { name: 'share', text: '分享给好友', icon: 'share' },
  { name: 'favorite', text: '收藏', subText: '加入我的收藏夹', icon: 'star' },
  { name: 'delete', text: '删除', color: '#ef4444' },
  { name: 'loading', text: '处理中', loading: true },
  { name: 'disabled', text: '不可用', disabled: true },
]

const onActionSelect = (action: JeActionSheetAction) => {
  actionSheetResult.value = String(action.name)
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="动作面板" route="action-sheet" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="动作面板" description="JeActionSheet" inset>
            <je-cell title="基础用法（图标 / 说明 / 禁用 / 加载）" is-link @click="actionSheetVisible = true" />
            <je-cell title="最近选择" :value="actionSheetResult" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-action-sheet
      v-model="actionSheetVisible"
      title="请选择操作"
      description="下拉抓手 / 点遮罩 / 按 Esc 都会取消"
      :actions="actionSheetActions"
      @select="onActionSelect"
    />
  </view>
</template>
