<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeMain 是 JeContainer 的 flex 子项，靠自身的 flex: 1 占满剩余空间。小程序自定义组件
   * 默认多包一层宿主节点，flex 子项变成宿主，这层没有 flex: 1，主体不会被撑开。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
defineOptions({ name: 'JeMain' })
</script>

<template>
  <main class="je-main">
    <slot />
  </main>
</template>

<style scoped>
.je-main {
  /* 占满顶栏 / 底栏 / 侧栏之外的剩余空间 */
  display: block;
  flex: 1;
  flex-basis: auto;
  box-sizing: border-box;
  min-width: 0;
  padding: var(--je-main-padding, 20px);
  overflow: auto;
}

/* 窄屏收窄内边距 */
@media (max-width: 768px) {
  .je-main {
    padding: var(--je-main-padding, 16px);
  }
}
</style>
