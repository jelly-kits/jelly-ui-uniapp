<script setup lang="ts">
/*
 * 目录页：按分类列出全部组件，点一个进它自己的详情页。
 *
 * 每个组件是独立页面（pages/demo/<route>），所以首页只负责跳转 ——
 * 这样 H5 的浏览器后退键、小程序 Android 的物理返回键都能直接退回目录，
 * 也可以把某个组件的链接直接分享出去。
 */
import { computed, ref } from 'vue'
import { useDocTheme } from '../../theme/useTheme'
import { flatSections, sectionGroups } from './sections'

/** 搜索关键字：按标题做一次跨分组过滤 */
const query = ref('')

const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return sectionGroups
  return sectionGroups
    .map((group) => ({
      title: group.title,
      items: group.items.filter((item) => item.title.toLowerCase().includes(keyword)),
    }))
    .filter((group) => group.items.length > 0)
})

/** 进某个组件的详情页 */
const openSection = (route: string) => {
  uni.navigateTo({ url: `/pages/demo/${route}` })
}

/* ---------------------------------- 主题 ---------------------------------- */
const { isDark, setMode } = useDocTheme()

/** 一键切换明暗：切成显式 light / dark，脱离「跟随系统」 */
const toggleDark = () => {
  setMode(isDark.value ? 'light' : 'dark')
}

/** 主题设置弹层（主色色板 + 取色器都在里面） */
const themePanelVisible = ref(false)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__logo je-logo" />
        <text class="doc__brand">Jelly UI</text>

        <view class="doc__actions">
          <view
            class="doc__action"
            role="button"
            :aria-label="isDark ? '切换到浅色' : '切换到深色'"
            @tap="toggleDark"
          >
            <je-icon :name="isDark ? 'sun' : 'moon'" :size="20" />
          </view>
          <view
            class="doc__action"
            role="button"
            aria-label="主题设置"
            @tap="themePanelVisible = true"
          >
            <je-icon name="settings" :size="20" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <view class="home">
        <view class="home__hero">
          <view class="home__hero-logo je-logo" />
          <view class="home__hero-text">
            <text class="home__hero-title">Jelly UI</text>
            <text class="home__hero-desc">uni-app 跨端组件库 · 共 {{ flatSections.length }} 个组件</text>
          </view>
        </view>

        <view class="home__search">
          <je-input v-model="query" placeholder="搜索组件" prefix-icon="search" clearable />
        </view>

        <view v-for="group in filteredGroups" :key="group.title" class="home__group">
          <text class="home__group-title">{{ group.title }}</text>
          <view class="home__grid">
            <view
              v-for="item in group.items"
              :key="item.route"
              class="home__cell"
              @tap="openSection(item.route)"
            >
              <view class="home__box">
                <je-icon :name="item.icon" :size="22" />
                <text class="home__label">{{ item.title }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="!filteredGroups.length" class="home__empty">
          <je-icon name="search" :size="26" />
          <text class="home__empty-text">没有匹配的组件</text>
        </view>
      </view>
    </scroll-view>

    <doc-theme-panel v-model="themePanelVisible" />
  </view>
</template>

<style scoped>
/* 目录页专属样式：外壳（.doc*）与演示排版（.demo-*）在全局 src/theme/demo.css 里 */

.home__hero {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 12px 16px;
  padding: 18px 16px;
  border-radius: var(--je-radius);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

.home__hero-logo {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  /* 只设 background-color，别用 background 简写，否则会把 .je-logo 的 background-image 一起重置掉 */
  background-color: rgba(255, 255, 255, 0.2);
}

.home__hero-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.home__hero-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--je-text-on-color);
}

.home__hero-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.84);
}

.home__search {
  padding: 0 12px;
}

.home__group {
  margin-top: 20px;
}

.home__group-title {
  display: block;
  margin: 0 16px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--je-text-faint);
}

/* 三列宫格：外层 flex 换行，靠 cell 的 padding 做出格子间距 */
.home__grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 8px;
}

.home__cell {
  box-sizing: border-box;
  width: 33.3333%;
  padding: 4px;
}

.home__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  height: 84px;
  padding: 8px 4px;
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  background: var(--je-popup);
  color: var(--je-primary);
}

.home__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.2;
  color: var(--je-text-muted);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 0;
  color: var(--je-text-faint);
}

.home__empty-text {
  font-size: 13px;
  color: var(--je-text-faint);
}
</style>
