<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeHeader 是 JeContainer 的 flex 子项，高度由自身 root 决定。小程序自定义组件默认
   * 多包一层宿主节点，flex 子项变成宿主，固定高度与 flex-shrink: 0 都落不到子项上。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'JeHeader' })

const props = withDefaults(
  defineProps<{
    /** 顶栏高度，数字按 px 处理 */
    height?: string | number
  }>(),
  { height: 60 },
)

const style = computed(() => ({
  '--je-header-height': typeof props.height === 'number' ? `${props.height}px` : props.height,
}))
</script>

<template>
  <header class="je-header" :style="style">
    <slot />
  </header>
</template>

<style scoped>
.je-header {
  box-sizing: border-box;
  /* 不参与剩余空间分配，高度只由 height 决定 */
  flex-shrink: 0;
  height: var(--je-header-height, 60px);
  padding: var(--je-header-padding, 0 20px);
}

/* 窄屏收窄左右留白 */
@media (max-width: 768px) {
  .je-header {
    padding: var(--je-header-padding, 0 16px);
  }
}
</style>
