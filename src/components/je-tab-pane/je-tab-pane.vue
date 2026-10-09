<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 面板是 .je-tabs__content 的直接子节点，内容留白与字号都长在根节点上。小程序自定义
   * 组件默认多包一层宿主节点，内容区的子节点会变成宿主而不是 .je-tab-pane，面板的盒模型
   * 与 H5 对不齐。声明 virtualHost 后宿主不再生成盒子，与 H5 的 DOM 结构保持一致。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, useSlots } from 'vue'
import { useUid } from '../../core/useUid'
import { jeTabsKey, type JeTabName, type JeTabPaneState } from '../je-tabs/types'

defineOptions({ name: 'JeTabPane' })

const props = withDefaults(
  defineProps<{
    name: JeTabName
    label?: string
    disabled?: boolean
    closable?: boolean
  }>(),
  { label: '', disabled: false, closable: false },
)

const context = inject(jeTabsKey)
const slots = useSlots()
const uid = useUid('je-tab-pane')

/**
 * 每次读取都取当前 props，父级用 computed 包裹后即可跟随响应式更新。
 * label 插槽只在 H5 取得到渲染函数（小程序端 $slots 是布尔标记，见 types.ts），
 * 所以 labelRender 也只在 H5 填。
 */
const getState = (): JeTabPaneState => {
  const state: JeTabPaneState = {
    uid,
    name: props.name,
    label: props.label,
    disabled: props.disabled,
    closable: props.closable,
  }
  // #ifdef H5
  state.labelRender = slots.label ? () => slots.label?.() : undefined
  // #endif
  return state
}

context?.registerPane(uid, getState)
onBeforeUnmount(() => context?.unregisterPane(uid))

const active = computed(() => context?.isActive(props.name) ?? false)
</script>

<template>
  <!-- v-show 而非 v-if：面板常驻 DOM，切回来时内部状态与滚动位置都还在，且没有进场 / 退场动效 -->
  <view
    :id="`${uid}-panel`"
    v-show="active"
    class="je-tab-pane"
    role="tabpanel"
    :aria-labelledby="`${uid}-tab`"
    tabindex="0"
  >
    <slot />
  </view>
</template>

<style scoped>
.je-tab-pane {
  padding: 16px 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--je-text-muted);
  outline: none;
}

.je-tab-pane:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}
</style>
