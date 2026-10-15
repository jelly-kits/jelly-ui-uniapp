<script setup lang="ts">
/*
 * 演示入口页（pages/demo/index）：按分组列出全部演示页，点一行进对应演示。
 *
 * 与目录页（pages/index/index）的区别：目录页是给使用者逛的组件宫格，这里是给开发调试用的清单 ——
 * 每行都带上页面地址，可以直接把地址粘到浏览器里打开；进入演示页后，顶栏能返回这里、
 * 也能用左右箭头逐个往下看。
 */
import { computed, ref } from 'vue'
import { useDocTheme } from '../../theme/useTheme'
import { flatSections, sectionGroups } from '../index/sections'

/** 搜索关键字：按组件名与路由片段跨分组过滤 */
const query = ref('')

const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return sectionGroups
  return sectionGroups
    .map((group) => ({
      title: group.title,
      items: group.items.filter(
        (item) =>
          item.title.toLowerCase().includes(keyword) ||
          item.route.toLowerCase().includes(keyword),
      ),
    }))
    .filter((group) => group.items.length > 0)
})

/** 进某个演示页 */
const openDemo = (route: string) => {
  uni.navigateTo({ url: `/pages/demo/${route}` })
}

/** 回目录页；直接从链接打开本页时没有返回栈，退化成重启到目录 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/* 页面地址前缀：H5 是 hash 路由，带上 # 才能直接粘进地址栏 */
let routePrefix = '/pages/demo/'
// #ifdef H5
routePrefix = '#/pages/demo/'
// #endif

/* ---------------------------------- 主题 ---------------------------------- */
const { isDark, setMode } = useDocTheme()

const toggleDark = () => {
  setMode(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" role="button" aria-label="返回目录" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">组件演示</text>

        <view class="doc__actions">
          <view
            class="doc__action"
            role="button"
            :aria-label="isDark ? '切换到浅色' : '切换到深色'"
            @tap="toggleDark"
          >
            <je-icon :name="isDark ? 'sun' : 'moon'" :size="20" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <view class="entry">
        <view class="entry__hint">
          <text class="entry__hint-text">
            共 {{ flatSections.length }} 个演示页。点一行进对应演示；演示页顶栏可返回这里，
            也能用左右箭头逐个切换。
          </text>
        </view>

        <view class="entry__search">
          <je-input v-model="query" placeholder="搜索组件名或路由" prefix-icon="search" clearable />
        </view>

        <view v-for="group in filteredGroups" :key="group.title" class="entry__group">
          <text class="entry__group-title">{{ group.title }}</text>
          <view class="entry__list">
            <view
              v-for="item in group.items"
              :key="item.route"
              class="entry__row"
              @tap="openDemo(item.route)"
            >
              <view class="entry__row-main">
                <text class="entry__row-title">{{ item.title }}</text>
                <text class="entry__row-desc">{{ item.desc }}</text>
              </view>
              <text class="entry__row-path">{{ routePrefix }}{{ item.route }}</text>
              <je-icon class="entry__row-arrow" name="chevron-right" :size="16" />
            </view>
          </view>
        </view>

        <view v-if="!filteredGroups.length" class="entry__empty">
          <je-icon name="search" :size="26" />
          <text class="entry__empty-text">没有匹配的演示页</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
/* 演示入口页专属样式：外壳（.doc*）在全局 src/theme/demo.css 里 */

.entry {
  padding-bottom: 24px;
}

.entry__hint {
  margin: 4px 12px 12px;
  padding: 12px 14px;
  background: var(--je-popup);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.entry__hint-text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--je-text-muted);
}

.entry__search {
  padding: 0 12px;
}

.entry__group {
  margin-top: 20px;
}

.entry__group-title {
  display: block;
  margin: 0 16px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--je-text-faint);
}

.entry__list {
  margin: 0 12px;
  overflow: hidden;
  background: var(--je-popup);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.entry__row {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  padding: 10px 12px;
}

.entry__row:active {
  background: var(--je-surface-hover);
}

.entry__row + .entry__row {
  border-top: 1px solid var(--je-border-color);
}

.entry__row-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.entry__row-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--je-text);
}

.entry__row-desc {
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  color: var(--je-text-faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 页面地址：窄屏下优先让位给组件名，超长省略 */
.entry__row-path {
  flex: 0 1 auto;
  max-width: 42%;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--je-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry__row-arrow {
  flex: 0 0 auto;
  color: var(--je-text-faint);
}

.entry__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 0;
  color: var(--je-text-faint);
}

.entry__empty-text {
  font-size: 13px;
  color: var(--je-text-faint);
}
</style>
