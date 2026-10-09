<script setup lang="ts">
import { computed, getCurrentInstance, inject, onBeforeUnmount, useAttrs } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import { jeCellGroupKey } from '../je-cell-group/types'

defineOptions({ name: 'JeCell' })

const props = withDefaults(
  defineProps<{
    /** 左侧标题 */
    title?: string
    /** 右侧内容，也可以用 value 插槽或默认插槽自定义 */
    value?: string | number
    /** 标题下方的说明文字 */
    label?: string
    /** 标题左侧的图标 */
    icon?: JeIconName
    /** 显示右侧箭头，表示整行可跳转 */
    isLink?: boolean
    /** 表单场景：在标题前显示必填星号 */
    required?: boolean
    /** 内容垂直居中（默认顶对齐，多行说明时更好读） */
    center?: boolean
    /** 尺寸 */
    size?: 'default' | 'large'
    /** 底部的一像素分隔线；分组里最后一项自动去掉 */
    border?: boolean
  }>(),
  {
    title: undefined,
    value: undefined,
    label: undefined,
    icon: undefined,
    isLink: false,
    required: false,
    center: false,
    size: 'default',
    border: true,
  },
)

const emit = defineEmits<{
  /** 点击整行；键盘回车 / 空格也会触发 */
  click: [event: MouseEvent | KeyboardEvent]
}>()

/** 显式挂 click 监听也算可点，好让键盘用户能聚焦并按回车 */
const attrs = useAttrs()
const isClickable = computed(() => props.isLink || 'onClick' in attrs)

/** 登记用的序号：实例 uid 全局唯一，且按创建顺序递增（即 DOM 顺序） */
const cellGroup = inject(jeCellGroupKey, null)
const cellUid = getCurrentInstance()?.uid ?? 0

if (cellGroup) {
  cellGroup.register(cellUid)
  onBeforeUnmount(() => cellGroup.unregister(cellUid))
}

/**
 * 组内最后一项不画分隔线，否则会在卡片边缘多出一条悬空的线。
 * 小程序端父组件 wxss 够不到子组件内部，判定改由分组 provide 下发。
 */
const hasBorder = computed(() => props.border && (!cellGroup || !cellGroup.isLast(cellUid)))

const onKeydown = (event: KeyboardEvent) => {
  if (!isClickable.value || (event.key !== 'Enter' && event.key !== ' ')) return
  event.preventDefault()
  emit('click', event)
}
</script>

<template>
  <div
    class="je-cell"
    :class="[
      `je-cell--${size}`,
      {
        'is-center': center,
        'is-clickable': isClickable,
        'has-border': hasBorder,
      },
    ]"
    :role="isClickable ? 'button' : undefined"
    :tabindex="isClickable ? 0 : undefined"
    @click="emit('click', $event)"
    @keydown="onKeydown"
  >
    <div v-if="icon || $slots.icon" class="je-cell__icon">
      <slot name="icon">
        <JeIcon v-if="icon" :name="icon" :size="18" />
      </slot>
    </div>

    <div class="je-cell__main">
      <div class="je-cell__title">
        <slot name="title">
          <span v-if="required" class="je-cell__required" aria-hidden="true">*</span>{{ title }}
        </slot>
      </div>
      <div v-if="label || $slots.label" class="je-cell__label">
        <slot name="label">{{ label }}</slot>
      </div>
    </div>

    <div class="je-cell__value">
      <slot name="value">
        <slot>{{ value }}</slot>
      </slot>
    </div>

    <div v-if="isLink || $slots['right-icon']" class="je-cell__right">
      <slot name="right-icon">
        <JeIcon v-if="isLink" class="je-cell__arrow" name="chevron-right" :size="16" />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.je-cell {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.45;
  color: var(--je-text);
  background: transparent;
  transition: background var(--je-duration) ease;
  /* 分隔线的左侧缩进，跟内边距对齐 */
  --je-cell-inset: 16px;
}

.je-cell--large {
  padding: 18px 16px;
  font-size: 16px;
}

.je-cell.is-center {
  align-items: center;
}

.je-cell.is-clickable {
  cursor: pointer;
}

.je-cell.is-clickable:hover {
  background: var(--je-surface-hover);
}

.je-cell.is-clickable:active {
  background: color-mix(in srgb, var(--je-primary) 14%, transparent);
}

.je-cell.is-clickable:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

/* 一像素分隔线画在伪元素上：不占布局高度，也方便分组去截掉最后一项 */
.je-cell.has-border::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: var(--je-cell-inset);
  height: 1px;
  background: var(--je-border-color);
  pointer-events: none;
}

.je-cell__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  /* 与 15px 字号的行高对齐，视觉上跟标题同一条基线 */
  min-height: 22px;
  color: var(--je-text-muted);
}

.je-cell__main {
  flex: 1 1 auto;
  min-width: 0;
}

.je-cell__title {
  display: flex;
  align-items: baseline;
  gap: 2px;
  overflow-wrap: break-word;
}

.je-cell__required {
  flex-shrink: 0;
  color: var(--je-danger);
}

.je-cell__label {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--je-text-faint);
}

.je-cell__value {
  flex-shrink: 0;
  max-width: 62%;
  font-size: 14px;
  text-align: right;
  color: var(--je-text-muted);
  overflow-wrap: break-word;
}

.je-cell__right {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--je-text-faint);
}

.je-cell__arrow {
  color: var(--je-text-faint);
}

@media (max-width: 768px) {
  /* 触屏上把整行热区兜到 44px 以上 */
  .je-cell {
    min-height: 48px;
  }
}
</style>
