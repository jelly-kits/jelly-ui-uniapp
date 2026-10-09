<script setup lang="ts">
/*
 * 主题设置弹层：底部弹出，包裹 doc-theme-settings。
 *
 * 内容区抽成独立组件，是为了让「主题」演示页能内嵌同一份交互，
 * 不必在页面里再写一遍色板与取色器。
 */
import { computed } from 'vue'

defineOptions({ name: 'DocThemePanel' })

const props = defineProps<{
  /** 是否展开 */
  modelValue?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue === true,
  set: (value: boolean) => emit('update:modelValue', value),
})
</script>

<template>
  <je-popup v-model="visible" position="bottom" round>
    <view class="theme-panel">
      <view class="theme-panel__head">
        <text class="theme-panel__title">主题设置</text>
        <view
          class="theme-panel__close"
          role="button"
          aria-label="关闭主题设置"
          @tap="visible = false"
        >
          <je-icon name="close" :size="18" />
        </view>
      </view>

      <doc-theme-settings />
    </view>
  </je-popup>
</template>

<style scoped>
.theme-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
  padding: 18px 20px 24px;
}

.theme-panel__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-panel__title {
  flex: 1 1 auto;
  font-size: 16px;
  font-weight: 700;
  color: var(--je-text);
}

.theme-panel__close {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-right: -6px;
  color: var(--je-text-muted);
}
</style>
