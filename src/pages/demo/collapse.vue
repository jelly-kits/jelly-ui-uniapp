<script setup lang="ts">
/*
 * 组件详情页：折叠面板（pages/demo/collapse）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 折叠面板：受控的多选数组（字符串 / 数字都行） */
const collapseActive = ref<(string | number)[]>(['basic'])
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="折叠面板" route="collapse" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="折叠面板" inset>
            <view class="demo-block demo-col">
              <je-collapse v-model="collapseActive">
                <je-collapse-item name="basic" title="基础用法">
                  折叠面板的内容区域，支持任意插槽内容。
                </je-collapse-item>
                <je-collapse-item name="extra" title="带右侧说明">
                  <template #extra>3 项</template>
                  右侧 extra 插槽放辅助信息。
                </je-collapse-item>
                <je-collapse-item name="disabled" title="禁用项" disabled>
                  禁用后不可展开。
                </je-collapse-item>
              </je-collapse>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
