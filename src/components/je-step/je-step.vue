<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 小程序自定义组件默认会在外面多包一层宿主节点：父级 flex / grid 里真正的子项是宿主，
   * 子项上的 flex、百分比宽度都被这层吞掉。实测后果是 .je-step 宽度收缩到标题宽，
   * 连接线 right/left 相减为负数 → 横线完全不可见。
   * 声明 virtualHost 后宿主不再生成盒子，.je-step 直接作为 .je-steps 的 flex 子项。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import { jeStepsKey, type JeStepStatus } from '../je-steps/types'
import { useUid } from '../../core/useUid'

defineOptions({ name: 'JeStep' })

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    icon?: JeIconName
    status?: JeStepStatus
  }>(),
  { title: '', description: '', icon: undefined, status: undefined },
)

const context = inject(jeStepsKey)
const uid = useUid('je-step')

context?.registerStep(uid)
onBeforeUnmount(() => context?.unregisterStep(uid))

const index = computed(() => context?.indexOf(uid) ?? 0)
const active = computed(() => context?.getActive() ?? 0)
const last = computed(() => index.value === (context?.count() ?? 1) - 1)

/**
 * 父级的布局状态（方向 / 居中对齐 / 简洁模式）由 provide 下发，挂到自己的根节点上。
 * 小程序端样式隔离，子组件 wxss 里写 `.je-steps--horizontal .je-step__line`
 * 这类引用父组件类名的后代选择器匹配不到，连接线会因为没有定位而不可见。
 */
const direction = computed(() => context?.getDirection() ?? 'horizontal')
const alignCenter = computed(() => context?.getAlignCenter() ?? false)
const simple = computed(() => context?.getSimple() ?? false)

/** 未显式指定 status 时，由「父级 active + 自身下标」推导 */
const status = computed<JeStepStatus>(() => {
  if (props.status) return props.status
  if (index.value < active.value) return context?.getFinishStatus() ?? 'finish'
  if (index.value === active.value) return context?.getProcessStatus() ?? 'process'
  return 'wait'
})

/** 本节点之后的连接线是否已走过 */
const filled = computed(() => index.value < active.value)

const iconName = computed<JeIconName | null>(() => {
  if (props.icon) return props.icon
  if (status.value === 'finish' || status.value === 'success') return 'check'
  if (status.value === 'error') return 'close'
  return null
})
</script>

<template>
  <div
    class="je-step"
    :class="[
      `is-${status}`,
      `is-${direction}`,
      { 'is-filled': filled, 'is-align-center': alignCenter, 'is-simple': simple },
    ]"
  >
    <div class="je-step__head">
      <span class="je-step__node">
        <slot name="icon">
          <JeIcon v-if="iconName" :name="iconName" :size="16" />
          <template v-else>{{ index + 1 }}</template>
        </slot>
      </span>
    </div>

    <div v-if="!last" class="je-step__line" aria-hidden="true">
      <span class="je-step__line-inner" />
    </div>

    <div class="je-step__main">
      <div class="je-step__title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div v-if="description || $slots.description" class="je-step__desc">
        <slot name="description">{{ description }}</slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.je-step {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
}

/* 横向：各步等分 */
.je-step.is-horizontal {
  flex: 1 1 0;
}

.je-step__head {
  position: relative;
  display: flex;
  align-items: center;
}

.je-step__node {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--je-step-node-size, 32px);
  height: var(--je-step-node-size, 32px);
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text-faint);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: 50%;
  transition: color var(--je-duration) ease, background var(--je-duration) ease,
    border-color var(--je-duration) ease;
}

.je-step.is-process .je-step__node,
.je-step.is-finish .je-step__node,
.je-step.is-success .je-step__node {
  /* 序号压在品牌渐变上，固定浅色 */
  color: var(--je-text-on-color);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
}

.je-step.is-process .je-step__node {
  box-shadow: 0 6px 18px color-mix(in srgb, var(--je-primary) 40%, transparent);
}

.je-step.is-error .je-step__node {
  /* 实色危险底上同样用浅色 */
  color: var(--je-text-on-color);
  background: var(--je-danger);
  border-color: transparent;
}

/* 连接线：底槽 + 进度条，进度色现算渐变 */
.je-step__line {
  position: absolute;
  background: var(--je-border-color);
}

.je-step__line-inner {
  display: block;
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  transition: width 0.3s var(--je-ease-out-back), height 0.3s var(--je-ease-out-back);
}

.je-step.is-horizontal .je-step__line {
  top: calc(var(--je-step-node-size, 32px) / 2 - 1px);
  right: 4px;
  left: calc(var(--je-step-node-size, 32px) + 8px);
  height: 2px;
}

.je-step.is-horizontal .je-step__line-inner {
  width: 0;
  height: 100%;
}

.je-step.is-horizontal.is-filled .je-step__line-inner {
  width: 100%;
}

/* 居中排列时，节点居中，连接线要跨过半个步宽才能接到下一个节点 */
.je-step.is-horizontal.is-align-center .je-step__head {
  justify-content: center;
}

.je-step.is-horizontal.is-align-center .je-step__line {
  left: calc(50% + var(--je-step-node-size, 32px) / 2 + 4px);
  right: calc(4px + var(--je-step-node-size, 32px) / 2 - 50%);
}

.je-step.is-horizontal.is-align-center .je-step__main {
  text-align: center;
}

.je-step__main {
  padding-top: 8px;
}

.je-step__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text);
}

.je-step__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--je-text-faint);
}

/* 纵向：节点在左，内容在右，连接线向下 */
.je-step.is-vertical {
  min-height: var(--je-step-node-size, 32px);
  padding: 0 0 20px calc(var(--je-step-node-size, 32px) + 14px);
}

.je-step.is-vertical:last-child {
  padding-bottom: 0;
}

.je-step.is-vertical .je-step__head {
  position: absolute;
  top: 0;
  left: 0;
}

.je-step.is-vertical .je-step__line {
  top: calc(var(--je-step-node-size, 32px) + 6px);
  bottom: 4px;
  left: calc(var(--je-step-node-size, 32px) / 2 - 1px);
  width: 2px;
}

.je-step.is-vertical .je-step__line-inner {
  width: 100%;
  height: 0;
}

.je-step.is-vertical.is-filled .je-step__line-inner {
  height: 100%;
}

.je-step.is-vertical .je-step__main {
  padding-top: 6px;
}

/* simple：只留序号和标题，隐藏描述与连接线 */
.je-step.is-simple {
  flex: 1 1 0;
}

.je-step.is-simple .je-step__node {
  width: auto;
  height: auto;
  min-width: 0;
  color: var(--je-text-faint);
  background: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.je-step.is-simple.is-process .je-step__node {
  color: var(--je-text);
}

.je-step.is-simple .je-step__line,
.je-step.is-simple .je-step__desc {
  display: none;
}

.je-step.is-simple .je-step__head {
  justify-content: flex-start;
}

.je-step.is-simple .je-step__main {
  padding-top: 4px;
}

@media (max-width: 768px) {
  /* 横向滑动时节点需要固定宽度，否则会被挤压 */
  .je-step.is-horizontal {
    flex: 0 0 auto;
    min-width: 140px;
  }

  .je-step__node {
    min-width: 44px;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-step__node,
  .je-step__line-inner {
    transition: none;
  }
}
</style>
