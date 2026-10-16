<script setup lang="ts">
import { computed } from 'vue'
import { useJeLocale } from '../je-locale'
import type { JeEmptyImageSlotProps } from './types'

defineOptions({ name: 'JeEmpty' })

const props = withDefaults(
  defineProps<{
    /** 描述文案，未传时用语言包的 empty 文案 */
    description?: string
    /** 默认插画尺寸（px） */
    imageSize?: number
  }>(),
  { description: undefined, imageSize: 100 },
)

const { t } = useJeLocale()

/** 描述文案：外部没传时回退语言包的通用空态文案 */
const description = computed(() => props.description ?? t('empty'))

defineSlots<{
  /** 自定义插画，作用域参数带建议尺寸 */
  default?: (props: JeEmptyImageSlotProps) => unknown
  /** 自定义描述文案 */
  description?: () => unknown
  /** 操作区，通常放一个按钮 */
  extra?: () => unknown
}>()

/**
 * 小程序端渲染不了内联 <svg>，把同一张插画拼成 SVG data-URI 交给 CSS mask。
 * mask 只取 alpha 通道，所以原来各图元的深浅改用 fill-opacity / stroke-opacity
 * 预先烘进 data-URI（原实现是 color-mix 出的主色混合色，透明度等价），
 * 颜色统一由 `background-color: var(--je-primary)` 提供，主题换肤照旧生效。
 */
const ILLUSTRATION = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" ',
  'stroke-linecap="round" stroke-linejoin="round">',
  '<ellipse cx="60" cy="102" rx="32" ry="6" fill="#000" fill-opacity="0.12"/>',
  '<path d="M24 50h72l-7 44a6 6 0 0 1-5.9 5H36.9A6 6 0 0 1 31 94Z" fill="#000" fill-opacity="0.1" ',
  'stroke="#000" stroke-opacity="0.45" stroke-width="2"/>',
  '<path d="M20 34a6 6 0 0 1 6-6h68a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6Z" ',
  'fill="#000" fill-opacity="0.22" stroke="#000" stroke-opacity="0.55" stroke-width="2"/>',
  '<path d="M48 62h24" stroke="#000" stroke-opacity="0.45" stroke-width="2"/>',
  '</svg>',
].join('')

const maskSrc = `url("data:image/svg+xml,${encodeURIComponent(ILLUSTRATION)}")`
</script>

<template>
  <div class="je-empty">
    <div class="je-empty__image" :style="{ width: `${imageSize}px`, height: `${imageSize}px` }">
      <slot :size="imageSize">
        <!-- #ifdef H5 -->
        <svg
          class="je-empty__svg"
          viewBox="0 0 120 120"
          width="100%"
          height="100%"
          fill="none"
          role="img"
          :aria-label="t('empty')"
        >
          <ellipse class="je-empty__shadow" cx="60" cy="102" rx="32" ry="6" />
          <path class="je-empty__box" d="M24 50h72l-7 44a6 6 0 0 1-5.9 5H36.9A6 6 0 0 1 31 94Z" />
          <path
            class="je-empty__lid"
            d="M20 34a6 6 0 0 1 6-6h68a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6Z"
          />
          <path class="je-empty__line" d="M48 62h24" />
        </svg>
        <!-- #endif -->

        <!-- #ifndef H5 -->
        <view class="je-empty__svg je-empty__svg--mask" :style="{ '--je-empty-src': maskSrc }" />
        <!-- #endif -->
      </slot>
    </div>

    <div v-if="description || $slots.description" class="je-empty__description">
      <slot name="description">{{ description }}</slot>
    </div>

    <div v-if="$slots.extra" class="je-empty__extra">
      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped>
.je-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  padding: 32px 16px;
  font-family: inherit;
  text-align: center;
}

.je-empty__image {
  flex-shrink: 0;
}

.je-empty__svg {
  display: block;
  width: 100%;
  height: 100%;
  animation: je-empty-float 3.2s ease-in-out infinite;
}

/* #ifndef H5 */
/* 插画整体用主色着色，深浅由 mask 的 alpha（data-URI 里烘好的 opacity）决定 */
.je-empty__svg--mask {
  background-color: var(--je-primary);
  -webkit-mask-image: var(--je-empty-src);
  mask-image: var(--je-empty-src);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
/* #endif */

/* 插画配色全部由主色现算 */
.je-empty__shadow {
  fill: color-mix(in srgb, var(--je-primary) 12%, transparent);
}

.je-empty__box {
  fill: color-mix(in srgb, var(--je-primary) 10%, transparent);
  stroke: color-mix(in srgb, var(--je-primary) 45%, transparent);
  stroke-width: 2;
  stroke-linejoin: round;
}

.je-empty__lid {
  fill: color-mix(in srgb, var(--je-primary) 22%, transparent);
  stroke: color-mix(in srgb, var(--je-primary) 55%, transparent);
  stroke-width: 2;
  stroke-linejoin: round;
}

.je-empty__line {
  stroke: color-mix(in srgb, var(--je-primary) 45%, transparent);
  stroke-width: 2;
  stroke-linecap: round;
}

.je-empty__description {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--je-text-faint);
}

.je-empty__extra {
  margin-top: 18px;
}

@keyframes je-empty-float {
  50% {
    transform: translateY(-5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-empty__svg {
    animation: none;
  }
}
</style>
