<script setup lang="ts">
import { provide, ref } from 'vue'
import type { JeIconName } from '../je-icon/icons'
import { jeBreadcrumbKey, type JeBreadcrumbContext } from './types'

defineOptions({ name: 'JeBreadcrumb' })

const props = withDefaults(
  defineProps<{
    separator?: string
    separatorIcon?: JeIconName
  }>(),
  { separator: '/', separatorIcon: undefined },
)

/** 子项 uid 的顺序表，用于判断最后一项 */
const items = ref<string[]>([])

const context: JeBreadcrumbContext = {
  getSeparator: () => props.separator,
  getSeparatorIcon: () => props.separatorIcon,
  isLast: (uid) => items.value.length > 0 && items.value[items.value.length - 1] === uid,
  registerItem: (uid) => {
    if (items.value.includes(uid)) return
    items.value = [...items.value, uid]
  },
  unregisterItem: (uid) => {
    items.value = items.value.filter((item) => item !== uid)
  },
}
provide(jeBreadcrumbKey, context)
</script>

<template>
  <view class="je-breadcrumb" role="navigation" aria-label="面包屑">
    <!-- 窄屏放不下时整条横向滑动；小程序端 view 不滚动，用 scroll-view -->
    <scroll-view class="je-breadcrumb__scroll" scroll-x>
      <view class="je-breadcrumb__list">
        <slot />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.je-breadcrumb {
  box-sizing: border-box;
  font-family: inherit;
  font-size: 14px;
  color: var(--je-text-muted);
}

.je-breadcrumb__scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.je-breadcrumb__scroll::-webkit-scrollbar {
  display: none;
}

/* 整条不换行，项本身不收缩；inline-flex 让容器按内容撑开，外层才滚得动 */
.je-breadcrumb__list {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 0;
  white-space: nowrap;
  list-style: none;
}
</style>
