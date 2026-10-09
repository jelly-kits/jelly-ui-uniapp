<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * JeButtonGroup 常常是页面 flex 行里的子项，靠自身根节点承担尺寸与排列。小程序自定义
   * 组件默认多包一层宿主节点，flex 子项变成宿主，根节点的 inline-flex 就落不到子项上。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { provide, ref } from 'vue'
import {
  jeButtonGroupKey,
  type JeButtonGroupPosition,
  type JeButtonSize,
  type JeButtonType,
} from '../je-button/types'

defineOptions({ name: 'JeButtonGroup' })

const props = withDefaults(
  defineProps<{
    /** 组内按钮的默认语义类型，子按钮可用自身 type / variant 覆盖 */
    type?: JeButtonType
    /** 组内按钮的默认尺寸，子按钮可用自身 size 覆盖 */
    size?: JeButtonSize
    /** 排列方向 */
    direction?: 'horizontal' | 'vertical'
  }>(),
  { direction: 'horizontal' },
)

/**
 * 子项按挂载顺序登记 uid（挂载顺序即 DOM 顺序），用来判定谁是组内首尾。
 * 小程序端样式隔离，父组件 wxss 里的 `.je-button-group > .je-button:first-child`
 * 匹配不到子组件内部的节点，首尾圆角与 -1px 叠边只能由子按钮自己按这里的结论落地。
 */
const buttonUids = ref<number[]>([])

provide(jeButtonGroupKey, {
  getSize: () => props.size,
  getType: () => props.type,
  getDirection: () => props.direction,
  register: (uid) => {
    buttonUids.value = [...buttonUids.value, uid]
  },
  unregister: (uid) => {
    buttonUids.value = buttonUids.value.filter((item) => item !== uid)
  },
  getPosition: (uid): JeButtonGroupPosition => {
    const list = buttonUids.value
    if (list.length <= 1) return 'only'
    if (list[0] === uid) return 'first'
    if (list[list.length - 1] === uid) return 'last'
    return 'middle'
  },
})
</script>

<template>
  <div
    class="je-button-group"
    :class="{ 'je-button-group--vertical': direction === 'vertical' }"
    role="group"
  >
    <slot />
  </div>
</template>

<style scoped>
.je-button-group {
  display: inline-flex;
  vertical-align: middle;
}

.je-button-group--vertical {
  flex-direction: column;
}

/* 组内按钮首尾相扣（压掉内侧圆角、相邻描边用 -1px 重合而不是叠成 2px）的规则写在
   JeButton 自己的样式里：小程序端父组件 wxss 进不到子组件内部的节点。 */
</style>
