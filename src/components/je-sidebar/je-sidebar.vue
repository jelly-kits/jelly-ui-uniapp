<script setup lang="ts">
import { computed, provide } from 'vue'
import JeScrollbar from '../je-scrollbar/je-scrollbar.vue'
import { jeSidebarKey } from './types'

defineOptions({ name: 'JeSidebar' })

const props = withDefaults(
  defineProps<{
    /** 当前选中项的 name */
    modelValue?: string | number
    /** 整列的宽度 */
    width?: number | string
  }>(),
  {
    modelValue: undefined,
    width: 88,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  /** 选中项变化 */
  change: [value: string | number]
}>()

const active = computed(() => props.modelValue)

const rootStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

const select = (name: string | number) => {
  if (name === props.modelValue) return
  emit('update:modelValue', name)
  emit('change', name)
}

/*
 * 列表这层留在 JeSidebar 自己的模板里：小程序端父子组件样式隔离，主库那套
 * `:deep(.je-sidebar__list)` + view-class 在 wxss 里够不到子组件内部的节点。
 */

provide(jeSidebarKey, { active, select })
</script>

<template>
  <view class="je-sidebar" :style="rootStyle" role="tablist" aria-orientation="vertical">
    <JeScrollbar>
      <view class="je-sidebar__list">
        <slot />
      </view>
    </JeScrollbar>
  </view>
</template>

<style scoped>
.je-sidebar {
  /* 滚动交给 JeScrollbar，这里只负责裁圆角 */
  overflow: hidden;
  font-family: inherit;
  background: var(--je-surface);
  border-radius: var(--je-radius);
}

.je-sidebar__list {
  display: flex;
  flex-direction: column;
}
</style>