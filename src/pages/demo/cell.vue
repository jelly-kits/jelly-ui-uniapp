<script setup lang="ts">
/*
 * 组件详情页：单元格（pages/demo/cell）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

const clicked = ref(0)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="单元格" route="cell" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="单元格" description="JeCell + JeCellGroup">
            <je-cell title="普通项" value="内容" />
            <je-cell title="带图标" icon="chevron-right" value="icon" />
            <je-cell title="可点击" is-link @click="clicked += 1" />
            <je-cell title="点击次数" :value="clicked" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
