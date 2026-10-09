<script setup lang="ts">
import { computed, ref } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeTransferDirection, JeTransferItem } from './types'

defineOptions({ name: 'JeTransfer' })

const props = withDefaults(
  defineProps<{
    /** 右侧列表的 key 集合 */
    modelValue?: (string | number)[]
    data: JeTransferItem[]
    /** 左右两栏标题 */
    titles?: [string, string]
    filterable?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    // data 同理：小程序端首帧 props 还没注入，不给默认值会在 computed 里对 undefined 调 filter
    data: () => [],
    modelValue: () => [],
    titles: () => ['列表 1', '列表 2'] as [string, string],
    filterable: false,
    disabled: false,
    placeholder: '请输入搜索内容',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: (string | number)[]]
  change: [
    value: (string | number)[],
    direction: JeTransferDirection,
    movedKeys: (string | number)[],
  ]
}>()

const leftQuery = ref('')
const rightQuery = ref('')

/** 两栏各自的勾选集合，与 modelValue（右侧归属）相互独立 */
const leftChecked = ref<(string | number)[]>([])
const rightChecked = ref<(string | number)[]>([])

const rightKeys = computed(() => new Set(props.modelValue))

const matchQuery = (item: JeTransferItem, query: string) => {
  const keyword = query.trim().toLowerCase()
  return keyword === '' || item.label.toLowerCase().includes(keyword)
}

const leftItems = computed(() =>
  props.data.filter((item) => !rightKeys.value.has(item.key) && matchQuery(item, leftQuery.value)),
)
const rightItems = computed(() =>
  props.data.filter((item) => rightKeys.value.has(item.key) && matchQuery(item, rightQuery.value)),
)

const itemsOf = (side: JeTransferDirection) => (side === 'left' ? leftItems : rightItems)
const checkedOf = (side: JeTransferDirection) => (side === 'left' ? leftChecked : rightChecked)

/** 当前可见且可勾选的 key */
const enabledKeys = (side: JeTransferDirection) =>
  itemsOf(side)
    .value.filter((item) => !item.disabled)
    .map((item) => item.key)

const isChecked = (side: JeTransferDirection, key: string | number) =>
  checkedOf(side).value.includes(key)

const allChecked = (side: JeTransferDirection) => {
  const keys = enabledKeys(side)
  return keys.length > 0 && keys.every((key) => checkedOf(side).value.includes(key))
}

const toggleCheck = (side: JeTransferDirection, item: JeTransferItem) => {
  if (props.disabled || item.disabled) return
  const list = checkedOf(side)
  if (list.value.includes(item.key)) {
    list.value = list.value.filter((key) => key !== item.key)
  } else {
    list.value = [...list.value, item.key]
  }
}

const toggleAll = (side: JeTransferDirection) => {
  if (props.disabled) return
  const keys = enabledKeys(side)
  checkedOf(side).value = allChecked(side) ? [] : keys
}

const canMoveSelected = (direction: JeTransferDirection) => {
  const source: JeTransferDirection = direction === 'right' ? 'left' : 'right'
  const pool = enabledKeys(source)
  return !props.disabled && checkedOf(source).value.some((key) => pool.includes(key))
}

const canMoveAll = (direction: JeTransferDirection) => {
  const source: JeTransferDirection = direction === 'right' ? 'left' : 'right'
  return !props.disabled && enabledKeys(source).length > 0
}

/** 统一的搬运出口：右侧按 data 顺序重排，左侧直接剔除被搬走的 key */
const applyMove = (direction: JeTransferDirection, keys: (string | number)[]) => {
  if (props.disabled || keys.length === 0) return
  const next =
    direction === 'right'
      ? [...props.modelValue, ...keys.filter((key) => !rightKeys.value.has(key))]
      : props.modelValue.filter((key) => !keys.includes(key))
  leftChecked.value = []
  rightChecked.value = []
  emit('update:modelValue', next)
  emit('change', next, direction, keys)
}

const moveSelected = (direction: JeTransferDirection) => {
  const source: JeTransferDirection = direction === 'right' ? 'left' : 'right'
  const pool = enabledKeys(source)
  applyMove(
    direction,
    checkedOf(source).value.filter((key) => pool.includes(key)),
  )
}

const moveAll = (direction: JeTransferDirection) => {
  const source: JeTransferDirection = direction === 'right' ? 'left' : 'right'
  applyMove(direction, enabledKeys(source))
}
</script>

<template>
  <div class="je-transfer" :class="{ 'is-disabled': disabled }">
    <section class="je-transfer__panel">
      <header class="je-transfer__header">
        <button
          type="button"
          class="je-transfer__check"
          role="checkbox"
          :aria-checked="allChecked('left')"
          :aria-label="`全选${titles[0]}`"
          :disabled="disabled || enabledKeys('left').length === 0"
          @click="toggleAll('left')"
        >
          <span class="je-transfer__box" aria-hidden="true">
            <JeIcon v-if="allChecked('left')" name="check" :size="12" />
          </span>
          <span class="je-transfer__title">{{ titles[0] }}</span>
        </button>
        <span class="je-transfer__count">{{ leftItems.length }} 项</span>
      </header>

      <div v-if="filterable" class="je-transfer__filter-wrap">
        <input
          v-model="leftQuery"
          class="je-transfer__filter"
          type="text"
          :placeholder="placeholder"
          :disabled="disabled"
          :aria-label="`搜索${titles[0]}`"
        >
      </div>

      <div class="je-transfer__list" role="listbox" aria-multiselectable="true" :aria-label="titles[0]">
        <div
          v-for="item in leftItems"
          :key="item.key"
          class="je-transfer__item"
          :class="{ 'is-checked': isChecked('left', item.key), 'is-item-disabled': item.disabled }"
          role="option"
          :aria-selected="isChecked('left', item.key)"
          :aria-disabled="item.disabled || undefined"
          @click="toggleCheck('left', item)"
        >
          <span class="je-transfer__box" aria-hidden="true">
            <JeIcon v-if="isChecked('left', item.key)" name="check" :size="12" />
          </span>
          <span class="je-transfer__label">{{ item.label }}</span>
        </div>
        <p v-if="leftItems.length === 0" class="je-transfer__empty">暂无数据</p>
      </div>
    </section>

    <div class="je-transfer__operations">
      <button
        type="button"
        class="je-transfer__op"
        :disabled="!canMoveSelected('right')"
        aria-label="移到右侧"
        @click="moveSelected('right')"
      >
        <JeIcon name="chevron-right" />
      </button>
      <button
        type="button"
        class="je-transfer__op"
        :disabled="!canMoveAll('right')"
        aria-label="全部移到右侧"
        @click="moveAll('right')"
      >
        <JeIcon name="chevrons-right" />
      </button>
      <button
        type="button"
        class="je-transfer__op"
        :disabled="!canMoveAll('left')"
        aria-label="全部移到左侧"
        @click="moveAll('left')"
      >
        <JeIcon name="chevrons-left" />
      </button>
      <button
        type="button"
        class="je-transfer__op"
        :disabled="!canMoveSelected('left')"
        aria-label="移到左侧"
        @click="moveSelected('left')"
      >
        <JeIcon name="chevron-left" />
      </button>
    </div>

    <section class="je-transfer__panel">
      <header class="je-transfer__header">
        <button
          type="button"
          class="je-transfer__check"
          role="checkbox"
          :aria-checked="allChecked('right')"
          :aria-label="`全选${titles[1]}`"
          :disabled="disabled || enabledKeys('right').length === 0"
          @click="toggleAll('right')"
        >
          <span class="je-transfer__box" aria-hidden="true">
            <JeIcon v-if="allChecked('right')" name="check" :size="12" />
          </span>
          <span class="je-transfer__title">{{ titles[1] }}</span>
        </button>
        <span class="je-transfer__count">{{ rightItems.length }} 项</span>
      </header>

      <div v-if="filterable" class="je-transfer__filter-wrap">
        <input
          v-model="rightQuery"
          class="je-transfer__filter"
          type="text"
          :placeholder="placeholder"
          :disabled="disabled"
          :aria-label="`搜索${titles[1]}`"
        >
      </div>

      <div class="je-transfer__list" role="listbox" aria-multiselectable="true" :aria-label="titles[1]">
        <div
          v-for="item in rightItems"
          :key="item.key"
          class="je-transfer__item"
          :class="{ 'is-checked': isChecked('right', item.key), 'is-item-disabled': item.disabled }"
          role="option"
          :aria-selected="isChecked('right', item.key)"
          :aria-disabled="item.disabled || undefined"
          @click="toggleCheck('right', item)"
        >
          <span class="je-transfer__box" aria-hidden="true">
            <JeIcon v-if="isChecked('right', item.key)" name="check" :size="12" />
          </span>
          <span class="je-transfer__label">{{ item.label }}</span>
        </div>
        <p v-if="rightItems.length === 0" class="je-transfer__empty">暂无数据</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.je-transfer {
  display: flex;
  align-items: stretch;
  gap: 12px;
  font-family: inherit;
  font-size: 14px;
}

.je-transfer__panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
}

.je-transfer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: var(--je-border);
}

.je-transfer__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--je-text);
  background: none;
  border: none;
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

.je-transfer__check:hover:not(:disabled) {
  background: var(--je-surface-hover);
}

.je-transfer__check:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-transfer__check:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 自绘方框，选中时用 check 图标填充 */
.je-transfer__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  /* 勾选图标只在选中态（渐变底）出现，固定浅色 */
  color: var(--je-text-on-color);
  border: 1px solid var(--je-border-color);
  border-radius: 4px;
  transition: background var(--je-duration) ease, border-color var(--je-duration) ease;
}

.je-transfer__item.is-checked .je-transfer__box,
.je-transfer__check[aria-checked='true'] .je-transfer__box {
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--je-primary) 40%, transparent);
}

.je-transfer__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-transfer__count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--je-text-faint);
}

.je-transfer__filter-wrap {
  padding: 8px 10px 0;
}

.je-transfer__filter {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--je-text);
  background: transparent;
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  outline: none;
  transition: border-color var(--je-duration) ease, box-shadow var(--je-duration) ease;
}

.je-transfer__filter::placeholder {
  color: var(--je-text-faint);
}

.je-transfer__filter:focus {
  border-color: var(--je-primary);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--je-primary) 25%, transparent);
}

/* 项多时栏内滚动；这里不设 touch-action，触屏才能正常滚动 */
.je-transfer__list {
  flex: 1;
  min-height: 180px;
  max-height: 280px;
  overflow-y: auto;
  padding: 6px;
  -webkit-overflow-scrolling: touch;
}

.je-transfer__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  transition: background var(--je-duration) ease, color var(--je-duration) ease;
}

.je-transfer__item:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-transfer__item.is-checked {
  color: var(--je-text);
}

.je-transfer__item.is-item-disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.je-transfer__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-transfer__empty {
  margin: 24px 0;
  font-size: 13px;
  color: var(--je-text-faint);
  text-align: center;
}

.je-transfer__operations {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.je-transfer__op {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--je-text-muted);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease, color var(--je-duration) ease,
    box-shadow var(--je-duration) ease;
}

.je-transfer__op:hover:not(:disabled) {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 26%, transparent);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--je-primary) 28%, transparent);
}

.je-transfer__op:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-transfer__op:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.je-transfer.is-disabled {
  opacity: 0.7;
}

/* 窄屏：两栏上下堆叠，搬运按钮横排 */
@media (max-width: 768px) {
  .je-transfer {
    flex-direction: column;
  }

  .je-transfer__operations {
    flex-direction: row;
    justify-content: center;
  }

  .je-transfer__op {
    width: 44px;
    height: 44px;
  }

  .je-transfer__check {
    min-height: 44px;
  }

  .je-transfer__filter {
    min-height: 44px;
  }

  .je-transfer__list {
    max-height: 220px;
  }

  .je-transfer__item {
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-transfer__check,
  .je-transfer__box,
  .je-transfer__filter,
  .je-transfer__item,
  .je-transfer__op {
    transition: none;
  }
}
</style>
