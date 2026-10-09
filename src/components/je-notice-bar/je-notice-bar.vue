<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'

defineOptions({ name: 'JeNoticeBar' })

const props = withDefaults(
  defineProps<{
    /** 通知内容 */
    text?: string
    /** 模式，可用空格组合 link 与 closeable */
    mode?: string
    /** 文字颜色，传任意 CSS 颜色 */
    color?: string
    /** 背景色，传任意 CSS 颜色 */
    background?: string
    /** 左侧图标 */
    leftIcon?: JeIconName
    /** 文字超出时是否横向滚动 */
    scrollable?: boolean
    /** 滚动速度，单位 px/s */
    speed?: number
    /** 开始滚动前的停留时长，单位秒 */
    delay?: number
    /** 允许多行换行展示（开启后不再滚动） */
    wrapable?: boolean
  }>(),
  {
    text: '',
    mode: '',
    color: '',
    background: '',
    leftIcon: 'volume',
    scrollable: true,
    speed: 60,
    delay: 1,
    wrapable: false,
  },
)

const emit = defineEmits<{
  /** mode 含 link 时点击整条通知栏 */
  click: [event: MouseEvent]
  /** mode 含 closeable 时点击关闭按钮 */
  close: []
}>()

/** 两个副本之间的间距，滚动一个周期后正好首尾相接 */
const GAP = 48

const contentRef = ref<HTMLElement | null>(null)
const textRef = ref<HTMLElement | null>(null)
const textWidth = ref(0)
const overflow = ref(false)
const instance = getCurrentInstance()

const isLink = computed(() => props.mode.includes('link'))
const isCloseable = computed(() => props.mode.includes('closeable'))
const scrolling = computed(() => overflow.value)

const rootStyle = computed(() => ({
  ...(props.color ? { '--je-notice-bar-color': props.color } : {}),
  ...(props.background ? { '--je-notice-bar-bg': props.background } : {}),
}))

const trackStyle = computed(() => ({
  '--je-notice-bar-distance': `${textWidth.value + GAP}px`,
  '--je-notice-bar-duration': `${(textWidth.value + GAP) / Math.max(1, props.speed)}s`,
  '--je-notice-bar-delay': `${props.delay}s`,
}))

/**
 * 主库用 ResizeObserver + offsetWidth/clientWidth 比较文字与容器宽度。
 * 小程序端两者都没有，改用 SelectorQuery 一次量出两个节点的宽度；
 * H5 下模板 ref 指向 <view> 组件实例，真实节点挂在 $el 上。
 */
const measure = () => {
  // #ifdef H5
  const pick = (value: unknown) => ((value as { $el?: HTMLElement })?.$el ?? value) as
    | HTMLElement
    | null
  const content = pick(contentRef.value)
  const text = pick(textRef.value)
  if (!content || !text) {
    overflow.value = false
    return
  }
  textWidth.value = text.offsetWidth
  overflow.value =
    props.scrollable && !props.wrapable && text.offsetWidth > content.clientWidth
  // #endif
  // #ifndef H5
  if (!instance?.proxy) return
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select('.je-notice-bar__content')
    .boundingClientRect()
    .select('.je-notice-bar__text')
    .boundingClientRect()
    .exec((results) => {
      const content = (Array.isArray(results) ? results[0] : null) as unknown as
        | { width?: number }
        | null
      const text = (Array.isArray(results) ? results[1] : null) as unknown as
        | { width?: number }
        | null
      if (!content || !text || typeof content.width !== 'number' || typeof text.width !== 'number') {
        overflow.value = false
        return
      }
      textWidth.value = text.width
      overflow.value = props.scrollable && !props.wrapable && text.width > content.width
    })
  // #endif
}

onMounted(measure)

watch(
  () => [props.text, props.scrollable, props.wrapable],
  () => {
    // 内容或模式变化后等一帧，确保新节点已经量到尺寸（小程序端没有 requestAnimationFrame）
    setTimeout(measure, 16)
  },
)

const onClick = (event: MouseEvent) => {
  if (isLink.value) emit('click', event)
}
</script>

<template>
  <view
    class="je-notice-bar"
    :class="{ 'is-link': isLink, 'is-wrapable': wrapable }"
    :style="rootStyle"
    :role="isLink ? 'link' : undefined"
    :tabindex="isLink ? 0 : undefined"
    @tap="onClick"
  >
    <JeIcon v-if="leftIcon" class="je-notice-bar__icon" :name="leftIcon" :size="16" />

    <view ref="contentRef" class="je-notice-bar__content">
      <view
        class="je-notice-bar__track"
        :class="{ 'is-scrolling': scrolling }"
        :style="scrolling ? trackStyle : undefined"
      >
        <text ref="textRef" class="je-notice-bar__text">
          <slot>{{ text }}</slot>
        </text>
        <text v-if="scrolling" class="je-notice-bar__text" aria-hidden="true">{{ text }}</text>
      </view>
    </view>

    <button
      v-if="isCloseable"
      type="button"
      class="je-notice-bar__close"
      aria-label="关闭"
      @tap.stop="emit('close')"
    >
      <JeIcon name="close" :size="14" />
    </button>
    <JeIcon v-else-if="isLink" class="je-notice-bar__arrow" name="chevron-right" :size="16" />
  </view>
</template>

<style scoped>
.je-notice-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  /* 默认走警告色的浅底，颜色可在组件内现算，跟随主题换肤 */
  --je-notice-bar-color: var(--je-warning);
  --je-notice-bar-bg: color-mix(in srgb, var(--je-warning) 14%, transparent);
  color: var(--je-notice-bar-color);
  background: var(--je-notice-bar-bg);
  border-radius: var(--je-radius-sm);
}

.je-notice-bar.is-link {
  cursor: pointer;
}

.je-notice-bar.is-link:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-notice-bar__icon,
.je-notice-bar__arrow {
  flex-shrink: 0;
}

.je-notice-bar__arrow {
  opacity: 0.7;
}

.je-notice-bar__content {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.je-notice-bar__track {
  display: inline-flex;
  gap: 48px;
  white-space: nowrap;
}

.je-notice-bar__track.is-scrolling {
  animation: je-notice-scroll var(--je-notice-bar-duration, 10s) linear
    var(--je-notice-bar-delay, 0s) infinite;
}

.je-notice-bar.is-wrapable .je-notice-bar__content {
  overflow: visible;
}

.je-notice-bar.is-wrapable .je-notice-bar__track {
  display: block;
  white-space: normal;
}

.je-notice-bar__text {
  display: inline-block;
  white-space: nowrap;
}

.je-notice-bar.is-wrapable .je-notice-bar__text {
  display: block;
  white-space: normal;
  overflow-wrap: break-word;
}

.je-notice-bar__close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 4px;
  color: inherit;
  cursor: pointer;
  background: none;
  border: none;
  opacity: 0.7;
  transition: opacity var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-notice-bar__close::after {
  border: none;
}

.je-notice-bar__close:hover {
  opacity: 1;
}

@keyframes je-notice-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-1 * var(--je-notice-bar-distance, 100%)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-notice-bar__track.is-scrolling {
    animation: none;
  }
}

@media (max-width: 768px) {
  .je-notice-bar {
    padding: 10px 14px;
  }

  .je-notice-bar__close {
    padding: 8px;
    margin: -8px;
  }
}
</style>
