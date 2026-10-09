<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref } from 'vue'

defineOptions({ name: 'JeActionBar' })

const props = withDefaults(
  defineProps<{
    /** 固定在视口底部 */
    fixed?: boolean
    /** fixed 时用占位元素撑住原高度，避免遮挡页面底部内容 */
    placeholder?: boolean
    /** 底部预留安全区（全面屏手势条） */
    safeAreaInsetBottom?: boolean
    /** 顶部 1px 分隔线 */
    border?: boolean
    /** fixed 时的层级 */
    zIndex?: number
  }>(),
  {
    fixed: false,
    placeholder: true,
    safeAreaInsetBottom: true,
    border: true,
    zIndex: 100,
  },
)

const barRef = ref<HTMLElement | null>(null)
const barHeight = ref(0)
const instance = getCurrentInstance()

const rootStyle = computed(() => {
  const style: Record<string, string> = {
    '--je-action-bar-height': `${barHeight.value}px`,
    '--je-action-bar-safe-bottom': props.safeAreaInsetBottom
      ? 'env(safe-area-inset-bottom, 0px)'
      : '0px',
  }
  if (props.fixed) style['--je-action-bar-z'] = String(props.zIndex)
  return style
})

/**
 * 主库用 ResizeObserver 盯住面板高度，小程序端既没有 ResizeObserver 也拿不到 DOM。
 * H5 下模板 ref 指向 <view> 组件实例，真实节点挂在 $el 上；小程序端改用 SelectorQuery 量一次。
 */
const measure = () => {
  // #ifdef H5
  const host = barRef.value as unknown as { $el?: HTMLElement } | null
  const el = (host?.$el ?? host) as HTMLElement | null
  barHeight.value = el?.offsetHeight ?? 0
  // #endif
  // #ifndef H5
  if (instance?.proxy) {
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select('.je-action-bar__inner')
      .boundingClientRect((result) => {
        const info = (Array.isArray(result) ? result[0] : result) as unknown as
          | { height?: number }
          | undefined
        if (info && typeof info.height === 'number') barHeight.value = info.height
      })
      .exec()
  }
  // #endif
}

onMounted(measure)
</script>

<template>
  <view class="je-action-bar" :style="rootStyle">
    <view
      ref="barRef"
      class="je-action-bar__inner"
      :class="{ 'is-fixed': fixed, 'has-border': border }"
    >
      <slot />
    </view>

    <view v-if="fixed && placeholder" class="je-action-bar__placeholder" aria-hidden="true" />
  </view>
</template>

<style scoped>
.je-action-bar {
  font-family: inherit;
  color: var(--je-text);
  --je-action-bar-height: 0px;
  --je-action-bar-safe-bottom: 0px;
}

.je-action-bar__inner {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 50px;
  padding: 6px 12px;
  padding-bottom: calc(6px + var(--je-action-bar-safe-bottom));
  background: var(--je-popup);
  /* 小程序端不支持 backdrop-filter，退化成纯色底 */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.je-action-bar__inner.has-border {
  border-top: var(--je-border);
}

.je-action-bar__inner.is-fixed {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--je-action-bar-z, 100);
}

/* 占位高度必须与操作栏一致（含安全区），否则固定后会盖住内容 */
.je-action-bar__placeholder {
  height: var(--je-action-bar-height);
}

@media (max-width: 768px) {
  .je-action-bar__inner {
    gap: 6px;
    padding: 6px 10px;
    padding-bottom: calc(6px + var(--je-action-bar-safe-bottom));
  }
}
</style>
