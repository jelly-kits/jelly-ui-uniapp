<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 面板是 .je-tab__track-drag 的 flex 子项（靠 flex: 0 0 100% 实现一屏一页）。
   * 小程序自定义组件默认多包一层宿主节点，宿主会顶替它成为 flex 子项，宽度基准就落到宿主上、
   * 面板本身分不到一屏宽。声明 virtualHost 后宿主不再生成盒子。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'
import { useUid } from '../../core/useUid'
import { jeTabKey, type JeTabName } from '../je-tab/types'

defineOptions({ name: 'JeTabItem' })

const props = withDefaults(
  defineProps<{
    /** 标题文字 */
    title?: string
    /** 唯一标识，缺省时按注册顺序自动生成 */
    name?: JeTabName
    /** 禁用后不可点选 */
    disabled?: boolean
    /** 角标内容 */
    badge?: string | number
    /** 是否显示小红点 */
    dot?: boolean
  }>(),
  {
    title: '',
    name: undefined,
    disabled: false,
    badge: undefined,
    dot: false,
  },
)

const ctx = inject(jeTabKey)
if (!ctx) throw new Error('JeTabItem 必须放在 JeTab 内使用')

const uid = useUid('je-tab-item')
const fallbackName = ctx.genName()
const name = computed(() => props.name ?? fallbackName)
const isActive = computed(() => ctx.isActive(name.value))
const color = computed(() => (isActive.value ? ctx.activeColor.value : ctx.inactiveColor.value))

onMounted(() => {
  // 标题按钮由父级渲染，这里只把标题数据交上去（getState 保证 props 变化能被父级追踪到）
  ctx.register(uid, () => ({
    uid,
    name: name.value,
    title: props.title,
    disabled: props.disabled,
    badge: props.badge,
    dot: props.dot,
  }))
})

onBeforeUnmount(() => ctx.unregister(uid))
</script>

<template>
  <view
    class="je-tab-item"
    :class="{ 'is-active': isActive }"
    :style="{ color }"
    role="tabpanel"
    :aria-hidden="!isActive"
  >
    <slot />
  </view>
</template>

<style scoped>
/* 每一页都留在 DOM 里，由父级 track 统一控制位移 */
.je-tab-item {
  flex: 0 0 100%;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 16px;
}

@media (max-width: 768px) {
  .je-tab-item {
    padding: 12px;
  }
}
</style>
