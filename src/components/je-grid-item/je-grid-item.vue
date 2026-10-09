<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 小程序自定义组件默认多包一层宿主节点。宿主是 .je-grid 的网格子项，而网格轨道高度要
   * 反过来由子项内容撑开——自定义组件的宿主节点在 grid 里量不到内部内容，格子会被算成
   * 塌陷的尺寸，里面的图标与文字就挤在一起。声明 virtualHost 后宿主不再生成盒子，
   * .je-grid__item 直接作为网格子项，与 H5 表现一致。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue'
import JeBadge from '../je-badge/je-badge.vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import { jeGridKey } from '../je-grid/types'

defineOptions({ name: 'JeGridItem' })

withDefaults(
  defineProps<{
    /** 图标 */
    icon?: JeIconName
    /** 图标下方的文字 */
    text?: string
    /** 图标右上角的角标 */
    badge?: string | number
    /** 只显示一个小圆点角标 */
    dot?: boolean
  }>(),
  { icon: undefined, text: undefined, badge: undefined, dot: false },
)

const emit = defineEmits<{
  /** 点击格子；键盘回车 / 空格也会触发 */
  click: [event: MouseEvent | KeyboardEvent]
}>()

const grid = inject(jeGridKey, null)
const square = computed(() => grid?.getSquare() ?? false)
const bordered = computed(() => grid?.getBorder() ?? false)

/** 显式挂 click 监听时才给出可点的手型与键盘可达性 */
const attrs = useAttrs()
const isClickable = computed(() => 'onClick' in attrs)

const onKeydown = (event: KeyboardEvent) => {
  if (!isClickable.value || (event.key !== 'Enter' && event.key !== ' ')) return
  event.preventDefault()
  emit('click', event)
}
</script>

<template>
  <div
    class="je-grid__item"
    :class="{ 'is-clickable': isClickable, 'is-square': square, 'is-bordered': bordered }"
    :role="isClickable ? 'button' : undefined"
    :tabindex="isClickable ? 0 : undefined"
    @click="emit('click', $event)"
    @keydown="onKeydown"
  >
    <div class="je-grid__content">
      <slot name="icon">
        <JeBadge v-if="icon" class="je-grid__icon" :value="badge" :is-dot="dot">
          <JeIcon :name="icon" :size="24" />
        </JeBadge>
      </slot>

      <span v-if="text || $slots.text" class="je-grid__text">
        <slot name="text">{{ text }}</slot>
      </span>

      <slot />
    </div>
  </div>
</template>

<style scoped>
.je-grid__item {
  position: relative;
  box-sizing: border-box;
  background: transparent;
  transition: background var(--je-duration) ease;
}

/* 格子之间右、下两条分隔线（上、左两条由 JeGrid 的外框负责） */
.je-grid__item.is-bordered {
  border-right: 1px solid var(--je-border-color);
  border-bottom: 1px solid var(--je-border-color);
}

.je-grid__content {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 78px;
  padding: 14px 8px;
  font-size: 13px;
  line-height: 1.35;
  color: var(--je-text-muted);
  text-align: center;
  overflow-wrap: anywhere;
}

/*
 * 正方形：用比例撑高。但不能把 min-height 清零——4 列宫格在窄屏上单格只有 70~85px，
 * 按比例算出的高度扣掉内边距后放不下「图标 + 文字」，内容会溢出格子、文字被压掉。
 */
.je-grid__item.is-square .je-grid__content {
  min-height: 86px;
  aspect-ratio: 1 / 1;
}

.je-grid__icon {
  color: var(--je-text);
}

.je-grid__text {
  display: block;
  max-width: 100%;
}

.je-grid__item.is-clickable {
  cursor: pointer;
}

.je-grid__item.is-clickable:hover {
  background: var(--je-surface-hover);
}

.je-grid__item.is-clickable:active {
  background: color-mix(in srgb, var(--je-primary) 16%, transparent);
}

.je-grid__item.is-clickable:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

@media (max-width: 768px) {
  .je-grid__content {
    min-height: 86px;
    padding: 16px 8px;
  }
}
</style>
