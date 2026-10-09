<script setup lang="ts">
/*
 * 组件详情页：可关闭标签页（pages/demo/tabs-editable）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

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
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">可关闭标签页</text>
      </view>
    </view>

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
