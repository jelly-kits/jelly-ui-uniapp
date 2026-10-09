<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 小程序自定义组件默认会在外面多包一层宿主节点。父级 .je-breadcrumb__list 是 flex，
   * 真正参与排布的子项会变成宿主节点，项自身的 inline-flex / 不收缩都落不到点上。
   * 声明 virtualHost 后宿主不再生成盒子，根节点直接作为列表的 flex 子项。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import { useUid } from '../../core/useUid'
import { jeBreadcrumbKey } from '../je-breadcrumb/types'

defineOptions({ name: 'JeBreadcrumbItem' })

const props = withDefaults(
  defineProps<{
    to?: string
    /** 跳转时替换当前历史记录（仅在提供 to 时生效） */
    replace?: boolean
  }>(),
  { to: '', replace: false },
)

const context = inject(jeBreadcrumbKey)
const uid = useUid('je-breadcrumb-item')

context?.registerItem(uid)
onBeforeUnmount(() => context?.unregisterItem(uid))

const last = computed(() => context?.isLast(uid) ?? false)
const separatorIcon = computed<JeIconName | undefined>(() => context?.getSeparatorIcon())
const separatorText = computed(() => context?.getSeparator() ?? '/')

const onClick = (event: MouseEvent) => {
  if (!props.to || !props.replace) return
  // 组件库不依赖 vue-router，replace 用原生 location.replace 实现
  event.preventDefault()
  window.location.replace(props.to)
}

/** 小程序端没有 <a> / location，replace 语义用 redirectTo 兜底 */
const onTap = () => {
  // #ifndef H5
  if (!props.to) return
  if (props.replace) uni.redirectTo({ url: props.to })
  else uni.navigateTo({ url: props.to })
  // #endif
}
</script>

<template>
  <view class="je-breadcrumb-item" :class="{ 'is-last': last }">
    <!-- #ifdef H5 -->
    <a
      v-if="to"
      class="je-breadcrumb-item__link"
      :href="to"
      :aria-current="last ? 'page' : undefined"
      @click="onClick"
    >
      <slot />
    </a>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <!-- 小程序端不支持 <a> 的 href 跳转，用 navigateTo / redirectTo 代替 -->
    <text v-if="to" class="je-breadcrumb-item__link" @tap="onTap">
      <slot />
    </text>
    <!-- #endif -->

    <text v-if="!to" class="je-breadcrumb-item__text" :aria-current="last ? 'page' : undefined">
      <slot />
    </text>

    <view v-if="!last" class="je-breadcrumb-item__separator" aria-hidden="true">
      <JeIcon v-if="separatorIcon" :name="separatorIcon" :size="14" />
      <text v-else>{{ separatorText }}</text>
    </view>
  </view>
</template>

<style scoped>
.je-breadcrumb-item {
  display: inline-flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.je-breadcrumb-item__link,
.je-breadcrumb-item__text {
  color: inherit;
  text-decoration: none;
  border-radius: 6px;
  outline: none;
  transition: color var(--je-duration) ease;
}

.je-breadcrumb-item__link:hover {
  color: var(--je-text);
}

.je-breadcrumb-item__link:focus-visible,
.je-breadcrumb-item__text:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 3px;
}

/* 最后一项不可点、颜色更淡 */
.je-breadcrumb-item.is-last {
  color: var(--je-text-faint);
}

.je-breadcrumb-item__separator {
  display: inline-flex;
  align-items: center;
  color: var(--je-text-faint);
  user-select: none;
}

@media (max-width: 768px) {
  .je-breadcrumb-item {
    gap: 6px;
    min-height: 44px;
  }

  .je-breadcrumb-item__link,
  .je-breadcrumb-item__text {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-breadcrumb-item__link,
  .je-breadcrumb-item__text {
    transition: none;
  }
}
</style>
