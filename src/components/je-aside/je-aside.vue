<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeAside 是 JeContainer 的 flex 子项，靠自身根节点的固定宽度决定侧栏宽度。小程序自定义
   * 组件默认多包一层宿主节点，flex 子项变成宿主，宽度与 flex-shrink: 0 都落不到子项上。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'JeAside' })

const props = withDefaults(
  defineProps<{
    /** 侧边栏宽度，数字按 px 处理 */
    width?: string | number
  }>(),
  { width: 300 },
)

const style = computed(() => ({
  '--je-aside-width': typeof props.width === 'number' ? `${props.width}px` : props.width,
}))
</script>

<template>
  <aside class="je-aside" :style="style">
    <slot />
  </aside>
</template>

<style scoped>
.je-aside {
  box-sizing: border-box;
  /* 宽度固定，不随内容伸缩 */
  flex-shrink: 0;
  width: var(--je-aside-width, 300px);
  overflow: auto;
}
</style>
