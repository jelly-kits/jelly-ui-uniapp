<script setup lang="ts">
/*
 * 块数据的只读渲染：传 JeBlockEditor 存下来的那份 JSON，按 type 分支渲染。
 *
 * 这个组件同时是「数据结构」的可执行文档 —— 小程序 / 原生端照着它实现一遍即可，
 * 字段只有 text / url / alt / poster / title / width / height / fit，没有任何需要解析的 HTML。
 *
 * 两端差异：H5 端 <image> / <video> 能直接吃 object-fit，这里统一改走平台自带的
 * mode / object-fit 属性，因此 width / height / fit 三个字段在两端落到同一个视觉结果。
 */
import { computed, ref } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeLocale } from '../je-locale'
import type { JeBlock } from '../je-block-editor/types'
import type { JeBlockViewValue } from './types'

defineOptions({ name: 'JeBlockView' })

const props = withDefaults(
  defineProps<{
    /** 数据：完整文档（{ version, blocks }）或块数组都行 */
    value?: JeBlockViewValue
    /** 链接的打开方式，仅 H5 端生效 */
    linkTarget?: string
    /** 空数据时的占位文案，传空串则不显示 */
    emptyText?: string
  }>(),
  { value: undefined, linkTarget: '_blank', emptyText: undefined },
)

const emit = defineEmits<{
  /** 点击链接块：小程序端没有外链跳转，把地址交给宿主处理（H5 端走原生 <a>，不派发） */
  'link-click': [block: JeBlock]
}>()

const { t } = useJeLocale()

const normalize = (value: JeBlockViewValue | undefined): JeBlock[] => {
  if (!value) return []
  return Array.isArray(value) ? value : (value.blocks ?? [])
}

/** 展示侧顺手把空块滤掉：编辑器里可以先落一个空块再填内容 */
const blocks = computed(() =>
  normalize(props.value).filter((block) =>
    block.type === 'text' ? block.text.trim() !== '' : block.url.trim() !== '',
  ),
)

const emptyLabel = computed(() => props.emptyText ?? t('block.empty'))

/**
 * 正在播放的视频块，空串表示都还停在封面上。
 * 视频默认只渲染封面 + 播放键，点了才挂载播放器，免得一进页面就拉视频流量。
 */
const playingId = ref('')

const playVideo = (id: string) => {
  playingId.value = id
}

/** 图片 / 视频的宽度与高度，与编辑器里的取值口径保持一致 */
const mediaStyle = (block: JeBlock) => {
  if (block.type !== 'image' && block.type !== 'video') return {}
  return {
    width: block.width || '100%',
    height: block.height || undefined,
  }
}

/**
 * 图片的填充模式：给定了高度才谈得上缩放方式，此时映射到 image 的 mode；
 * 高度留空就是「按素材比例自适应」，用 widthFix 让高度跟着宽度走。
 */
const imageMode = (block: JeBlock) => {
  if (block.type !== 'image' || !block.height) return 'widthFix'
  if (block.fit === 'cover') return 'aspectFill'
  if (block.fit === 'fill') return 'scaleToFill'
  return 'aspectFit'
}

/** 视频的 object-fit：小程序 video 只认 contain / fill / cover，与数据字段一一对应 */
const videoFit = (block: JeBlock) =>
  block.type === 'video' ? (block.fit ?? 'contain') : 'contain'
</script>

<template>
  <view class="je-block-view">
    <template v-for="block in blocks" :key="block.id">
      <text v-if="block.type === 'text'" class="je-block-view__text">{{ block.text }}</text>

      <image
        v-else-if="block.type === 'image'"
        class="je-block-view__image"
        :style="mediaStyle(block)"
        :src="block.url"
        :mode="imageMode(block)"
      />

      <video
        v-else-if="block.type === 'video' && playingId === block.id"
        class="je-block-view__video"
        :style="mediaStyle(block)"
        :src="block.url"
        :poster="block.poster || undefined"
        :object-fit="videoFit(block)"
        :autoplay="true"
        controls
        playsinline
      />

      <!-- 没点播放键之前只放封面，播放器根本不挂载，视频文件一个字节都不拉 -->
      <view
        v-else-if="block.type === 'video'"
        class="je-block-view__poster"
        :style="mediaStyle(block)"
        role="button"
        :aria-label="t('block.play')"
        @click="playVideo(block.id)"
      >
        <image
          v-if="block.poster"
          class="je-block-view__cover"
          :src="block.poster"
          mode="aspectFill"
        />
        <view class="je-block-view__play">
          <JeIcon name="play" :size="18" />
        </view>
      </view>

      <!-- 走到这里只剩链接块：H5 用原生 <a> 直接跳，小程序端没有外链跳转，把地址交给宿主 -->
      <template v-else>
        <!-- #ifdef H5 -->
        <a
          class="je-block-view__link"
          :href="block.url"
          :target="linkTarget"
          rel="noopener noreferrer nofollow"
        >
          {{ block.title || block.url }}
        </a>
        <!-- #endif -->

        <!-- #ifndef H5 -->
        <text class="je-block-view__link" @click="emit('link-click', block)">
          {{ block.title || block.url }}
        </text>
        <!-- #endif -->
      </template>
    </template>

    <text v-if="!blocks.length && emptyLabel" class="je-block-view__empty">{{ emptyLabel }}</text>
  </view>
</template>

<style scoped>
.je-block-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* uni 的主题里没有主库那组 --je-control-*，字号直接写死（与文字块的预览口径一致） */
  font-size: 14px;
  line-height: 1.7;
  color: var(--je-text);
}

/* 文本块的换行原样保留 */
.je-block-view__text {
  white-space: pre-wrap;
  word-break: break-word;
}

/* 图片 / 视频默认占满一行，宽度与高度由行内样式覆盖 */
.je-block-view__image,
.je-block-view__video {
  display: block;
  width: 100%;
  background: var(--je-surface);
  border-radius: var(--je-radius);
}

/* 视频的封面态：整块都是播放热区 */
.je-block-view__poster {
  position: relative;
  width: 100%;
  min-height: 180px;
  overflow: hidden;
  background: var(--je-surface);
  border-radius: var(--je-radius);
}

.je-block-view__cover {
  display: block;
  width: 100%;
  height: 100%;
}

.je-block-view__play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.je-block-view__link {
  color: var(--je-primary);
  text-decoration: none;
  word-break: break-all;
}

.je-block-view__empty {
  font-size: 13px;
  color: var(--je-text-faint);
  text-align: center;
}
</style>
