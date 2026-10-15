<script setup lang="ts">
/*
 * 组件详情页：下拉菜单（pages/demo/dropdown）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 下拉菜单：选中项通过 command 抛出 */
const dropdownCommand = ref<string | number>('—')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="下拉菜单" route="dropdown" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="下拉菜单" description="JeDropdown + JeDropdownItem（trigger 插槽 + command）" inset>
            <view class="demo-block demo-row">
              <je-dropdown @command="dropdownCommand = $event">
                <template #trigger>更多操作</template>
                <je-dropdown-item command="edit" icon="edit">编辑</je-dropdown-item>
                <je-dropdown-item command="copy" icon="copy">复制</je-dropdown-item>
                <je-dropdown-item command="delete" icon="trash" divided disabled>删除（禁用）</je-dropdown-item>
              </je-dropdown>
              <je-text size="small">command：{{ dropdownCommand }}</je-text>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
