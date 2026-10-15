<script setup lang="ts">
/*
 * 组件详情页：文本（pages/demo/text）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

const clicked = ref(0)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="文本" route="text" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="文本" inset>
            <je-cell title="高亮">
              <je-highlight text="Jelly UI 是一套组件库" :keywords="['Jelly', 'UI']" />
            </je-cell>
            <je-cell title="链接">
              <je-link type="primary" @click="clicked += 1">点我 +1</je-link>
            </je-cell>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
