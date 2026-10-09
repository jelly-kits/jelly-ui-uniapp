<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import {
  jeStepsKey,
  type JeStepStatus,
  type JeStepsContext,
  type JeStepsDirection,
} from './types'

defineOptions({ name: 'JeSteps' })

const props = withDefaults(
  defineProps<{
    active?: number
    direction?: JeStepsDirection
    alignCenter?: boolean
    simple?: boolean
    space?: string | number
    finishStatus?: JeStepStatus
    processStatus?: JeStepStatus
  }>(),
  {
    active: 0,
    direction: 'horizontal',
    alignCenter: false,
    simple: false,
    space: undefined,
    finishStatus: 'finish',
    processStatus: 'process',
  },
)

/** 子项 uid 的顺序表，下标即节点序号 */
const registry = ref<string[]>([])

const context: JeStepsContext = {
  getActive: () => props.active,
  getFinishStatus: () => props.finishStatus,
  getProcessStatus: () => props.processStatus,
  getDirection: () => props.direction,
  getAlignCenter: () => props.alignCenter,
  getSimple: () => props.simple,
  registerStep: (uid) => {
    if (registry.value.includes(uid)) return
    registry.value = [...registry.value, uid]
  },
  unregisterStep: (uid) => {
    registry.value = registry.value.filter((item) => item !== uid)
  },
  indexOf: (uid) => registry.value.indexOf(uid),
  count: () => registry.value.length,
}
provide(jeStepsKey, context)

const total = computed(() => Math.max(registry.value.length, 1))

/** space 支持数字（按 px）或任意 CSS 长度，直接作为 flex gap */
const gap = computed(() => {
  if (props.space === undefined) return undefined
  return typeof props.space === 'number' ? `${props.space}px` : props.space
})

/** simple 模式左上角的「当前 / 总数」 */
const summary = computed(() => `${Math.min(Math.max(props.active + 1, 1), total.value)} / ${total.value}`)
</script>

<template>
  <div
    class="je-steps"
    :class="[
      `je-steps--${direction}`,
      { 'is-align-center': alignCenter, 'is-simple': simple },
    ]"
    :style="gap ? { gap } : undefined"
  >
    <span v-if="simple" class="je-steps__summary">{{ summary }}</span>
    <slot />
  </div>
</template>

<style scoped>
.je-steps {
  /* 节点尺寸：窄屏会放大到 44px，连接线位置跟着这个变量走 */
  --je-step-node-size: 32px;

  display: flex;
  box-sizing: border-box;
  font-family: inherit;
  color: var(--je-text);
}

.je-steps--horizontal {
  flex-direction: row;
  align-items: flex-start;
}

.je-steps--vertical {
  flex-direction: column;
}

.je-steps__summary {
  flex-shrink: 0;
  margin-right: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text);
}

@media (max-width: 768px) {
  .je-steps {
    --je-step-node-size: 44px;
  }

  /* 横向时允许整条滑动，节点保持可读宽度 */
  .je-steps--horizontal {
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .je-steps--horizontal::-webkit-scrollbar {
    display: none;
  }
}
</style>
