<script setup lang="ts">
import JeDialog from './je-dialog.vue'
import { jeDialogStack, settleDialogEntry, type JeDialogEntry } from './store'

/**
 * 命令式 showDialog() 的宿主。
 *
 * 小程序端没有 document / createApp，没法像主库那样现场造容器挂到 body 上，
 * 于是改成「showDialog() 往全局列表里压记录 + 页面里挂 <je-dialog-host /> 读列表渲染」。
 * H5 端同样走这套，保证两端行为一致。
 */
defineOptions({ name: 'JeDialogHost' })

const onVisibleChange = (entry: JeDialogEntry, value: boolean) => {
  entry.visible = value
}

const onConfirm = (entry: JeDialogEntry) => {
  entry.action = 'confirm'
}

const onCancel = (entry: JeDialogEntry) => {
  entry.action = 'cancel'
}
</script>

<template>
  <je-dialog
    v-for="entry in jeDialogStack"
    :key="entry.id"
    :model-value="entry.visible"
    :title="entry.title"
    :width="entry.width"
    :close-on-click-modal="entry.closeOnClickModal"
    :bottom-sheet="entry.bottomSheet"
    :fullscreen="entry.fullscreen"
    :align-center="entry.alignCenter"
    :center="entry.center"
    :top="entry.top"
    :footer-layout="entry.footerLayout"
    :show-cancel-button="entry.showCancelButton"
    :confirm-button-text="entry.confirmButtonText"
    :cancel-button-text="entry.cancelButtonText"
    :before-close="entry.beforeClose"
    :z-index="entry.zIndex"
    @update:model-value="onVisibleChange(entry, $event)"
    @confirm="onConfirm(entry)"
    @cancel="onCancel(entry)"
    @closed="settleDialogEntry(entry)"
  >
    <text v-if="entry.message">{{ entry.message }}</text>
  </je-dialog>
</template>
