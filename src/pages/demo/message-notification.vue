<script setup lang="ts">
/*
 * 组件详情页：轻提示 / 通知（pages/demo/message-notification）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { showMessage } from '../../components/je-message'
import { showNotify } from '../../components/je-notification'

/** 命令式通知：右上角弹一条 */
const openNotification = () => {
  showNotify({
    title: '新消息',
    message: '这是一条右上角的通知，几秒后自动关闭。',
    type: 'success',
    position: 'top-right',
  })
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="轻提示 / 通知" route="message-notification" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="轻提示 / 通知" description="JeMessage + JeNotification（命令式，页面已挂宿主）" inset>
            <view class="demo-block demo-row">
              <je-button size="small" type="success" @click="showMessage.success('操作成功')">成功提示</je-button>
              <je-button size="small" type="danger" @click="showMessage.error('出错了，请重试')">错误提示</je-button>
              <je-button size="small" @click="openNotification">右上角通知</je-button>
            </view>
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-notification />

    <je-message />
  </view>
</template>
