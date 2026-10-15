<script setup lang="ts">
/*
 * 组件详情页：可关闭标签页（pages/demo/tabs-editable）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

const tabsEditable = ref<string | number>('a')

const tabsEditableNames = ref<(string | number)[]>(['a', 'b', 'c'])

const tabLabelOf = (name: string | number) => `页签 ${name}`

const onTabRemove = (name: string | number) => {
  tabsEditableNames.value = tabsEditableNames.value.filter((item) => item !== name)
  if (tabsEditable.value === name) tabsEditable.value = tabsEditableNames.value[0] ?? ''
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="可关闭标签页" route="tabs-editable" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="可关闭标签页" description="JeTabs type=card + closable（点 × 移除）" inset>
            <je-tabs v-model="tabsEditable" type="card" closable @tab-remove="onTabRemove">
              <je-tab-pane v-for="name in tabsEditableNames" :key="name" :name="name" :label="tabLabelOf(name)">
                <view class="demo-block"><je-text size="small">页签 {{ name }} 的面板。</je-text></view>
              </je-tab-pane>
            </je-tabs>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
