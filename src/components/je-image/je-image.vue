<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeImageFit } from './types'

defineOptions({ name: 'JeImage' })

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    /** 数字按 px 处理 */
    width?: string | number
    height?: string | number
    fit?: JeImageFit
    /** 数字按 px 处理 */
    radius?: string | number
    /** 点击图片打开全屏查看器 */
    preview?: boolean
    /** 查看器里可左右切换的图片列表，留空则只用 src */
    previewSrcList?: string[]
    /** 交给原生懒加载 */
    lazy?: boolean
    /** 加载中显示的占位图，不传则显示微光骨架 */
    placeholder?: string
  }>(),
  {
    alt: '',
    fit: 'cover',
    preview: false,
    previewSrcList: () => [],
    lazy: false,
    placeholder: '',
  },
)

const emit = defineEmits<{
  load: []
  error: []
  close: []
}>()

const toCssSize = (value?: string | number) => (typeof value === 'number' ? `${value}px` : value)

const rootStyle = computed(() => ({
  width: toCssSize(props.width),
  height: toCssSize(props.height),
  borderRadius: toCssSize(props.radius) ?? 'var(--je-radius-lg)',
}))

/** <image> 用 mode 代替 CSS 的 object-fit（H5 上 uni 会把它还原成 object-fit） */
const IMAGE_MODE: Record<JeImageFit, 'scaleToFill' | 'aspectFit' | 'aspectFill' | 'center'> = {
  fill: 'scaleToFill',
  contain: 'aspectFit',
  cover: 'aspectFill',
  none: 'center',
  'scale-down': 'aspectFit',
}

const imageMode = computed(() => IMAGE_MODE[props.fit] ?? 'aspectFill')

/** 加载态：骨架 / 占位 */
const loaded = ref(false)
const failed = ref(false)

watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
  },
)

const onLoad = () => {
  loaded.value = true
  failed.value = false
  emit('load')
}

const onError = () => {
  failed.value = true
  loaded.value = false
  emit('error')
}

/* ---------------- 全屏查看器 ---------------- */

const viewerOpen = ref(false)
const zIndex = ref(nextZIndex())
/** 缩放倍率，限制在 0.25 ~ 4 */
const scale = ref(1)
/** 每次旋转 +90deg */
const rotate = ref(0)
const currentIndex = ref(0)

const previewList = computed(() => {
  const list = props.previewSrcList.filter((item) => item.length > 0)
  return list.length > 0 ? list : [props.src]
})

const activeSrc = computed(() => previewList.value[currentIndex.value] ?? props.src)

/*
 * 主库的查看器挂在 body 上，这里就地渲染：小程序端没有 Teleport，
 * 查看器本身是 position: fixed，铺满视口，效果一致。
 * 小程序端没有 body，锁屏交给遮罩层自己的 touchmove 阻断（全屏层自然吃掉滚动）。
 */
const locked = computed(() => viewerOpen.value)

// #ifdef H5
let previousOverflow = ''

const setBodyScrollLock = (value: boolean) => {
  if (value) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousOverflow
}
// #endif

// #ifdef H5
watch(locked, (value) => setBodyScrollLock(value))
// #endif

const openPreview = () => {
  if (!props.preview || failed.value) return
  currentIndex.value = Math.max(0, previewList.value.indexOf(props.src))
  scale.value = 1
  rotate.value = 0
  zIndex.value = nextZIndex()
  viewerOpen.value = true
}

const closeViewer = () => {
  if (!viewerOpen.value) return
  viewerOpen.value = false
  emit('close')
}

const zoomIn = () => {
  scale.value = Math.min(4, Number((scale.value + 0.25).toFixed(2)))
}

const zoomOut = () => {
  scale.value = Math.max(0.25, Number((scale.value - 0.25).toFixed(2)))
}

const rotateBy = () => {
  rotate.value += 90
}

const go = (delta: number) => {
  const total = previewList.value.length
  if (total <= 1) return
  currentIndex.value = (currentIndex.value + delta + total) % total
  scale.value = 1
  rotate.value = 0
}

/* 键盘只存在于 H5；小程序端该绑定永不触发，处理器留着不影响编译 */
const onKeydown = (event: KeyboardEvent) => {
  if (!viewerOpen.value) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    closeViewer()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    go(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    go(1)
  }
}

// #ifdef H5
watch(viewerOpen, (open) => {
  if (open) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
// #endif

const viewerStyle = computed(() => ({ zIndex: zIndex.value }))

const viewerImgStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotate.value}deg)`,
}))
</script>

<template>
  <view
    class="je-image"
    :class="{ 'is-previewable': preview }"
    :style="rootStyle"
    @tap="openPreview"
  >
    <image
      class="je-image__img"
      :src="src"
      :alt="alt"
      :mode="imageMode"
      :lazy-load="lazy"
      @load="onLoad"
      @error="onError"
    />

    <!-- 加载中：默认微光骨架，传了 placeholder 则显示占位图 -->
    <view v-if="!loaded && !failed" class="je-image__skeleton" aria-hidden="true">
      <image
        v-if="placeholder"
        class="je-image__placeholder"
        :src="placeholder"
        mode="aspectFill"
      />
    </view>

    <!-- 加载失败：占位图标，不依赖任何外链资源 -->
    <view v-else-if="failed" class="je-image__broken" role="img" :aria-label="alt || '图片加载失败'">
      <!-- #ifdef H5 -->
      <svg
        class="je-image__broken-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m3 17 4.5-4.5 3 3" />
        <circle cx="14.5" cy="9.5" r="1.4" />
        <path d="M14.5 20.5 20 4.5" />
      </svg>
      <!-- #endif -->

      <!-- #ifndef H5 -->
      <JeIcon class="je-image__broken-icon" name="image" :size="34" />
      <!-- #endif -->
    </view>

    <view
      class="je-image__viewer"
      :class="{ 'is-open': viewerOpen }"
      :style="viewerStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="alt || '图片预览'"
      tabindex="-1"
      :aria-hidden="!viewerOpen"
      @tap.stop="closeViewer"
    >
      <image
        v-if="viewerOpen"
        class="je-image__viewer-img"
        :src="activeSrc"
        :alt="alt"
        mode="aspectFit"
        :style="viewerImgStyle"
        @tap.stop
      />

      <button
        v-if="previewList.length > 1"
        type="button"
        class="je-image__viewer-nav je-image__viewer-nav--prev"
        aria-label="上一张"
        @tap.stop="go(-1)"
      >
        <JeIcon name="chevron-left" :size="22" />
      </button>

      <button
        v-if="previewList.length > 1"
        type="button"
        class="je-image__viewer-nav je-image__viewer-nav--next"
        aria-label="下一张"
        @tap.stop="go(1)"
      >
        <JeIcon name="chevron-right" :size="22" />
      </button>

      <view v-if="previewList.length > 1" class="je-image__viewer-counter" @tap.stop>
        {{ currentIndex + 1 }} / {{ previewList.length }}
      </view>

      <view class="je-image__viewer-toolbar" @tap.stop>
        <button type="button" class="je-image__viewer-tool" aria-label="放大" @tap="zoomIn">
          <JeIcon name="zoom-in" :size="20" />
        </button>
        <button type="button" class="je-image__viewer-tool" aria-label="缩小" @tap="zoomOut">
          <JeIcon name="zoom-out" :size="20" />
        </button>
        <button type="button" class="je-image__viewer-tool" aria-label="旋转" @tap="rotateBy">
          <JeIcon name="rotate-right" :size="20" />
        </button>
        <button type="button" class="je-image__viewer-tool" aria-label="关闭" @tap="closeViewer">
          <JeIcon name="close" :size="20" />
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.je-image {
  position: relative;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  line-height: 0;
  background: var(--je-surface);
}

.je-image.is-previewable {
  cursor: zoom-in;
}

.je-image__img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 100%;
}

/* 微光骨架：纯 CSS 扫光，不停留任何网络请求 */
.je-image__skeleton {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  min-height: 90px;
  overflow: hidden;
  background: var(--je-surface);
}

.je-image__skeleton::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(
    100deg,
    transparent 20%,
    color-mix(in srgb, var(--je-primary) 22%, transparent) 50%,
    transparent 80%
  );
  transform: translateX(-100%);
  animation: je-image-shimmer 1.4s ease-in-out infinite;
}

.je-image__placeholder {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  filter: blur(6px);
}

@keyframes je-image-shimmer {
  to {
    transform: translateX(100%);
  }
}

.je-image__broken {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  min-height: 90px;
  color: var(--je-text-faint);
  background: var(--je-surface);
}

.je-image__broken-icon {
  width: 34px;
  height: 34px;
}

/* ---------------- 全屏查看器 ---------------- */

.je-image__viewer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  /* 就地渲染会继承根节点的 line-height: 0，这里必须复位 */
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  outline: none;
  /* 收起态用 visibility 而不是 display，保住过渡 */
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0s linear 0.28s;
}

.je-image__viewer.is-open {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.28s ease;
}

.je-image__viewer-img {
  width: 96vw;
  height: 82vh;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.32s var(--je-ease-out-back);
}

.je-image__viewer-nav {
  position: absolute;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  /* 大图预览是深色全屏层，图标固定浅色 */
  color: var(--je-text-on-color);
  background: rgba(255, 255, 255, 0.12);
  border: var(--je-border);
  border-radius: 50%;
  cursor: pointer;
  transform: translateY(-50%);
  transition: background 0.2s ease;
}

/* 小程序端的 button 默认带一条伪元素描边，这里自己控制边框 */
.je-image__viewer-nav::after,
.je-image__viewer-tool::after {
  border: none;
}

.je-image__viewer-nav:hover {
  background: color-mix(in srgb, var(--je-primary) 55%, transparent);
}

.je-image__viewer-nav--prev {
  left: 12px;
}

.je-image__viewer-nav--next {
  right: 12px;
}

.je-image__viewer-counter {
  position: absolute;
  top: calc(14px + env(safe-area-inset-top, 0px));
  left: 50%;
  padding: 4px 12px;
  font-size: 13px;
  /* 深色全屏层上固定浅色，略微降透明度保持次要感 */
  color: color-mix(in srgb, var(--je-text-on-color) 78%, transparent);
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  transform: translateX(-50%);
}

.je-image__viewer-toolbar {
  position: absolute;
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  display: flex;
  gap: 6px;
  padding: 5px;
  background: rgba(255, 255, 255, 0.12);
  border: var(--je-border);
  border-radius: 999px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transform: translateX(-50%);
}

.je-image__viewer-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  /* 深色全屏层上固定浅色 */
  color: var(--je-text-on-color);
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease, transform var(--je-duration) var(--je-ease-overshoot);
}

.je-image__viewer-tool:hover {
  background: color-mix(in srgb, var(--je-primary) 55%, transparent);
}

.je-image__viewer-tool:focus-visible,
.je-image__viewer-nav:focus-visible,
.je-image__viewer:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 窄屏：图片占满视口宽度，工具栏按钮热区放大到 44px 并预留下方安全区 */
@media (max-width: 768px) {
  .je-image__viewer-img {
    width: 100vw;
    height: 70vh;
  }

  .je-image__viewer-tool {
    width: 44px;
    height: 44px;
  }

  .je-image__viewer-nav {
    top: auto;
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    transform: none;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-open 状态类也列进来：它的选择器特异性比单个基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-image__viewer,
  .je-image__viewer.is-open,
  .je-image__viewer-img,
  .je-image__viewer-tool,
  .je-image__viewer-nav {
    transition: none;
  }

  .je-image__skeleton::after {
    animation: none;
  }
}
</style>
