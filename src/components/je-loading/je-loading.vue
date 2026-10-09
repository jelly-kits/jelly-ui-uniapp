<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import { jeLoadingTop } from './store'

defineOptions({ name: 'JeLoading' })

const props = withDefaults(
  defineProps<{
    /** 是否显示加载遮罩 */
    loading?: boolean
    /** 命令式 showLoading() 的宿主：只渲染全局栈，忽略自身 loading */
    host?: boolean
    /** 转圈下方的提示文案 */
    text?: string
    /** 全屏：遮罩覆盖整个视口 */
    fullscreen?: boolean
    /** 覆盖遮罩底色，留空使用默认半透明黑 */
    background?: string
  }>(),
  {
    loading: false,
    host: false,
    text: '',
    fullscreen: false,
    background: '',
  },
)

/**
 * 本组件同时充当命令式 showLoading() 的宿主。
 *
 * 小程序端没有 document，没法像主库那样用 createApp 现场造一个遮罩挂到 body 上，
 * 于是改成「showLoading() 往全局栈里压记录 + 页面里挂 <je-loading host /> 读栈渲染」。
 *
 * 两种角色必须靠显式的 host 标记区分：小程序端组件的 Boolean 属性默认就是 false，
 * 「没传 loading」和「loading=false」在运行时完全一样，没法用 props 值反推角色。
 */
const controlledByProp = computed(() => !props.host)

const visible = computed(() =>
  controlledByProp.value ? props.loading : jeLoadingTop.value !== null,
)
const fullscreen = computed(() =>
  controlledByProp.value ? props.fullscreen : (jeLoadingTop.value?.fullscreen ?? true),
)
const text = computed(() =>
  controlledByProp.value ? props.text : (jeLoadingTop.value?.text ?? ''),
)
const background = computed(() =>
  controlledByProp.value ? props.background : (jeLoadingTop.value?.background ?? ''),
)

/** 浮层不得在 CSS 里硬编码层级：由隐藏转可见时重新取一个，才能压住文档站顶栏那类固定头栏 */
const zIndex = ref(nextZIndex())
watch(visible, (on) => {
  if (on) zIndex.value = nextZIndex()
})

const maskStyle = computed(() => ({
  zIndex: zIndex.value,
  ...(background.value ? { background: background.value } : {}),
}))
</script>

<template>
  <div class="je-loading">
    <slot />

    <div
      v-if="visible"
      class="je-loading__mask"
      :class="{ 'is-fullscreen': fullscreen }"
      :style="maskStyle"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="je-loading__spinner">
        <div class="je-loading__ring" aria-hidden="true" />
        <span v-if="text" class="je-loading__text">{{ text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.je-loading {
  position: relative;
}

/* 非全屏：绝对定位覆盖父级；全屏：固定定位覆盖视口。
   小程序 wxss 不认 inset 简写，写四条 longhand */
.je-loading__mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  animation: je-loading-in 0.2s ease;
}

.je-loading__mask.is-fullscreen {
  position: fixed;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.je-loading__spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  /* 压在深色遮罩上，文字与图标固定浅色 */
  color: var(--je-text-on-color);
}

/*
 * 转圈：主库那圈 SVG 渐变环在小程序端没法用（wxss 不渲染 svg / linearGradient），
 * 改成纯 CSS 圆环——主题色 + 主题终点色各占相邻两条边，旋转时就是一段渐变弧。
 * 外发光负责果冻质感。
 */
.je-loading__ring {
  box-sizing: border-box;
  width: 40px;
  height: 40px;
  border: 4px solid color-mix(in srgb, var(--je-primary) 22%, transparent);
  border-top-color: var(--je-primary);
  border-right-color: var(--je-primary-end);
  border-radius: 50%;
  box-shadow: 0 0 18px color-mix(in srgb, var(--je-primary) 35%, transparent);
  animation: je-loading-rotate 1.1s linear infinite;
}

.je-loading__text {
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  /* 同上：深色遮罩上的文字 */
  color: var(--je-text-on-color);
}

@keyframes je-loading-in {
  from {
    opacity: 0;
  }
}

@keyframes je-loading-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-loading__mask,
  .je-loading__ring {
    animation: none;
  }
}
</style>
