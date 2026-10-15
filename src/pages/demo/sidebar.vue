<script setup lang="ts">
/*
 * 组件详情页：侧边导航（pages/demo/sidebar）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 侧边导航 */
const sidebarActive = ref('hot')

const sidebarItems: {
  name: string
  title: string
  badge?: string | number
  dot?: boolean
  disabled?: boolean
}[] = [
  { name: 'hot', title: '热门', badge: 12 },
  { name: 'new', title: '新品' },
  { name: 'sale', title: '特惠', dot: true },
  { name: 'off', title: '下架', disabled: true },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="侧边导航" route="sidebar" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="侧边导航" description="JeSidebar + JeSidebarItem" inset>
            <view class="demo-sidebar">
              <je-sidebar v-model="sidebarActive" :width="96">
                <je-sidebar-item
                  v-for="item in sidebarItems"
                  :key="item.name"
                  :name="item.name"
                  :title="item.title"
                  :badge="item.badge"
                  :dot="item.dot"
                  :disabled="item.disabled"
                />
              </je-sidebar>
              <view class="demo-sidebar__content">
                <text class="demo-sidebar__title">当前选中：{{ sidebarActive }}</text>
                <text class="demo-sidebar__desc">左列高度由容器决定，内容超出后交给 JeScrollbar 滚动。</text>
              </view>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
