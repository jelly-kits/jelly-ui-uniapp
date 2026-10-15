<script setup lang="ts">
/*
 * 组件详情页：抽屉（pages/demo/drawer）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 抽屉 */
const drawerRight = ref(false)

const drawerLeft = ref(false)

const drawerBottom = ref(false)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="抽屉" route="drawer" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="抽屉" description="JeDrawer" inset>
            <je-cell title="右侧抽屉" is-link @click="drawerRight = true" />
            <je-cell title="左侧抽屉（70%）" is-link @click="drawerLeft = true" />
            <je-cell title="底部抽屉" is-link @click="drawerBottom = true" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-drawer v-model="drawerRight" title="右侧抽屉" :size="300">
      <text>面板宽度 300px，宽屏下从右侧滑入；窄屏自动收窄到 86vw。</text>
      <template #footer>
        <je-button size="small" variant="ghost" @click="drawerRight = false">取消</je-button>
        <je-button size="small" @click="drawerRight = false">好的</je-button>
      </template>
    </je-drawer>

    <je-drawer v-model="drawerLeft" direction="ltr" title="左侧抽屉" size="70%">
      <text>size 传字符串时原样使用，这里给的是 70%。</text>
    </je-drawer>

    <je-drawer v-model="drawerBottom" direction="btt" title="底部抽屉" :size="220">
      <text>direction="btt" 从底部滑入。</text>
    </je-drawer>
  </view>
</template>
