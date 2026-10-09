<script setup lang="ts">
defineOptions({ name: 'JeCard' })
</script>

<template>
  <div class="je-card">
    <slot />
  </div>
</template>

<style scoped>
.je-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 480px;
  padding: 40px 36px;
  background: var(--je-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: 28px;
  box-shadow: var(--je-shadow-popup);
  /* 一次性入场：交给合成器跑，后台标签页也不会停在半路 */
  animation: je-card-in 0.6s var(--je-ease-out-back) both;
}

@keyframes je-card-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-card {
    animation: none;
  }
}
</style>