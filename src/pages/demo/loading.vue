<script setup lang="ts">
/*
 * 组件详情页：加载（pages/demo/loading）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { onBeforeUnmount, ref } from 'vue'
import { showLoading } from '../../components/je-loading'

/**
 * JeLoading：就地遮罩由 loading prop 控制；命令式那条走全局状态，
 * 需要页面里挂一个 <je-loading host /> 当宿主（小程序端没有 DOM 可以现场挂载）。
 */
const inlineLoading = ref(false)

let fullscreenTimer: ReturnType<typeof setTimeout> | null = null

const startFullscreenLoading = () => {
  const instance = showLoading({ text: '提交中…', fullscreen: true })
  if (fullscreenTimer !== null) clearTimeout(fullscreenTimer)
  fullscreenTimer = setTimeout(() => {
    fullscreenTimer = null
    instance.close()
  }, 1500)
}
onBeforeUnmount(() => {
  if (fullscreenTimer !== null) clearTimeout(fullscreenTimer)
})
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="加载" route="loading" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="加载" description="JeLoading" inset>
            <view class="demo-block demo-col">
              <je-space wrap>
                <je-button type="default" @click="inlineLoading = !inlineLoading">切换就地遮罩</je-button>
                <je-button type="primary" @click="startFullscreenLoading">命令式全屏（1.5s）</je-button>
              </je-space>
            </view>
            <je-loading :loading="inlineLoading" text="加载中…">
              <je-cell title="被遮罩的区域" :value="inlineLoading ? '遮罩中' : '可点击'" />
            </je-loading>
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-loading host />
  </view>
</template>
