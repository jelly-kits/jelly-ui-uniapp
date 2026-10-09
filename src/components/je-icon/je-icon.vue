<script setup lang="ts">
import { computed } from 'vue'
import { jeBrandIconNames, jeIcons, type JeIconName } from './icons'

defineOptions({ name: 'JeIcon' })

const props = withDefaults(
  defineProps<{
    name: JeIconName
    /** 图标尺寸，数字按 px 处理 */
    size?: number | string
    /** 是否旋转（加载态） */
    spin?: boolean
    /** 用填充代替描边（评分星星等） */
    filled?: boolean
  }>(),
  { size: 16, spin: false, filled: false },
)

/**
 * 品牌 logo 的路径本身就是实心轮廓，再描边会把图形糊掉，
 * 所以它们恒为「只填充」，与 filled 属性的效果一致。
 */
const isBrand = computed(() => jeBrandIconNames.has(props.name))
const solid = computed(() => props.filled || isBrand.value)

const paths = computed(() => jeIcons[props.name] ?? [])

const sizeCss = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))

/**
 * 小程序端渲染不了内联 <svg>，把同一份 path 拼成 SVG data-URI 交给 CSS mask。
 * 只取 mask 的 alpha 通道（形状），颜色仍由 `background-color: currentColor` 决定，
 * 所以依赖 color 继承的换肤（:hover / :disabled / 语义色 / 父级 .je-cell__arrow）照旧生效。
 * 这里把描边色写死成 #000，仅作为「不透明」的载体，不参与最终配色。
 */
const maskSrc = computed(() => {
  const fill = solid.value ? '#000' : 'none'
  const stroke = isBrand.value ? 'none' : '#000'
  const strokeWidth = isBrand.value ? 0 : 2
  const body = paths.value.map((d) => `<path d="${d}"/>`).join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" ` +
    `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})
</script>

<template>
  <!-- #ifdef H5 -->
  <svg
    class="je-icon"
    :class="{ 'is-spinning': spin }"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    :fill="solid ? 'currentColor' : 'none'"
    :stroke="isBrand ? 'none' : 'currentColor'"
    :stroke-width="isBrand ? 0 : 2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
  <!-- #endif -->

  <!-- #ifndef H5 -->
  <view
    class="je-icon je-icon--mask"
    :class="{ 'is-spinning': spin }"
    :style="{ width: sizeCss, height: sizeCss, '--je-icon-src': maskSrc }"
    aria-hidden="true"
  />
  <!-- #endif -->
</template>

<style scoped>
.je-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: -0.15em;
}

/* #ifndef H5 */
/* 只保留 mask 的形状，颜色走 currentColor，父级的 color 依然能带过来 */
.je-icon--mask {
  background-color: currentColor;
  -webkit-mask-image: var(--je-icon-src);
  mask-image: var(--je-icon-src);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
/* #endif */

.je-icon.is-spinning {
  animation: je-icon-spin 0.9s linear infinite;
}

@keyframes je-icon-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-icon.is-spinning {
    animation: none;
  }
}
</style>
