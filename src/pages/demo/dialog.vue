<script setup lang="ts">
/*
 * 组件详情页：对话框（pages/demo/dialog）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import JeDialogHost from '../../components/je-dialog/je-dialog-host.vue'
import { showDialog } from '../../components/je-dialog'
import type { JeDialogDone } from '../../components/je-dialog'

/** 对话框 */
const dialogBasic = ref(false)

const dialogConfirm = ref(false)

const dialogBeforeCloseCount = ref(0)

const dialogResult = ref('—')

/**
 * before-close 示例：故意拖 800ms 再放行，看确认按钮的 loading 与「拦下来就真的不关」。
 * 直传函数 prop —— 小程序端能不能收到由验收脚本实测。
 */
const onDialogBeforeClose = (done: JeDialogDone) => {
  dialogBeforeCloseCount.value += 1
  setTimeout(done, 800)
}

/** 命令式对话框：需要页面里挂 <je-dialog-host /> 当宿主（小程序端没有 DOM 可以现场挂载） */
const openImperativeDialog = async () => {
  dialogResult.value = await showDialog.confirm({
    title: '命令式对话框',
    message: '点确认 / 取消 / 遮罩，回来看看拿到的是哪个动作',
  })
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="对话框" route="dialog" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="对话框" description="JeDialog" inset>
            <je-cell title="基础对话框（可拖拽标题栏）" is-link @click="dialogBasic = true" />
            <je-cell title="确认 / 取消" is-link @click="dialogConfirm = true" />
            <je-cell
              title="before-close 次数"
              :value="String(dialogBeforeCloseCount)"
            />
            <je-cell title="命令式 showDialog.confirm" is-link @click="openImperativeDialog" />
            <je-cell title="命令式结果" :value="dialogResult" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-dialog v-model="dialogBasic" title="基础对话框" draggable confirm-button-text="知道了">
      <text>按住标题栏可以拖动面板；不传 cancel-button-text 时只有确认按钮。</text>
    </je-dialog>

    <je-dialog
      v-model="dialogConfirm"
      title="删除确认"
      confirm-button-text="删除"
      cancel-button-text="取消"
      :before-close="onDialogBeforeClose"
    >
      <text>删除后不可恢复。点「删除」会先走 before-close，800ms 后才真正关闭。</text>
    </je-dialog>

    <je-dialog-host />
  </view>
</template>
