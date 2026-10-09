<script setup lang="ts">
import { computed, provide } from 'vue'
import { jeTabbarKey } from './types'

defineOptions({ name: 'JeTabbar' })

const props = withDefaults(
  defineProps<{
    /** 当前选中的子项 name */
    modelValue?: string | number
    /** 固定到视口底部 */
    fixed?: boolean
    /** fixed 时是否用占位元素把导航栏的高度补回来 */
    placeholder?: boolean
    /** 底部安全区留白（全面屏手势条） */
    safeArea?: boolean
    /** 顶部分隔线 */
    border?: boolean
    /** fixed 时的层级，与 JeNavBar 保持同一量级 */
    zIndex?: number
  }>(),
  {
    modelValue: undefined,
    fixed: true,
    placeholder: false,
    safeArea: true,
    border: true,
    zIndex: 100,
  },
)

const emit = defineEmits<{
  'update:modelValue': [name: string | number]
  /** 切换选中项 */
  change: [name: string | number]
}>()

const select = (name: string | number) => {
  if (name !== props.modelValue) emit('update:modelValue', name)
  emit('change', name)
}

provide(jeTabbarKey, {
  getActive: () => props.modelValue,
  select,
})

const rootStyle = computed(() => ({
  '--je-tabbar-z': String(props.zIndex),
  '--je-tabbar-safe-bottom': props.safeArea ? 'env(safe-area-inset-bottom, 0px)' : '0px',
}))

/** 固定时才需要占位，否则脱离文档流会盖住列表最后一项 */
const withPlaceholder = computed(() => props.fixed && props.placeholder)
</script>

<template>
  <div class="je-tabbar-root">
    <nav
      class="je-tabbar"
      :class="{ 'is-fixed': fixed, 'has-border': border }"
      :style="rootStyle"
      role="tablist"
    >
      <slot />
    </nav>

    <div v-if="withPlaceholder" class="je-tabbar__placeholder" aria-hidden="true" />
  </div>
</template>

<style scoped>
.je-tabbar-root {
  font-family: inherit;
}

.je-tabbar {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: stretch;
  /* 内容区固定 50px，安全区在下方额外叠加 */
  height: calc(50px + var(--je-tabbar-safe-bottom, 0px));
  padding-bottom: var(--je-tabbar-safe-bottom, 0px);
  color: var(--je-text-muted);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.je-tabbar.has-border::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  background: var(--je-border-color);
}

.je-tabbar.is-fixed {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--je-tabbar-z, 100);
}

/* 占位高度必须与导航栏一致（含安全区），否则固定后会盖住内容 */
.je-tabbar-root .je-tabbar__placeholder {
  height: calc(50px + var(--je-tabbar-safe-bottom, 0px));
}
</style>
