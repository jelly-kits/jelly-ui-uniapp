<script setup lang="ts">
import JeIcon from '../je-icon/je-icon.vue'
import type { JeAddressItem } from './types'

defineOptions({ name: 'JeAddressList' })

const props = withDefaults(
  defineProps<{
    /** 地址列表数据 */
    list?: JeAddressItem[]
    /** 默认地址标签文案 */
    defaultTagText?: string
    /** 整体禁用，禁用后不可选中 / 编辑 / 删除 */
    disabled?: boolean
    /** 点击整卡即选中（移动端常见的下单选地址场景） */
    switchable?: boolean
    /** 显示「编辑」按钮 */
    showEdit?: boolean
    /** 显示「删除」按钮 */
    showDelete?: boolean
  }>(),
  {
    list: () => [],
    defaultTagText: '默认',
    disabled: false,
    switchable: false,
    showEdit: false,
    showDelete: false,
  },
)

const emit = defineEmits<{
  /** 点击整卡选中一条地址 */
  select: [item: JeAddressItem, index: number]
  /** 点击编辑 */
  edit: [item: JeAddressItem, index: number]
  /** 点击删除 */
  delete: [item: JeAddressItem, index: number]
  /** 点击「设为默认」 */
  setDefault: [item: JeAddressItem, index: number]
}>()

const onSelect = (item: JeAddressItem, index: number) => {
  if (props.disabled) return
  emit('select', item, index)
}

const onEdit = (item: JeAddressItem, index: number) => {
  if (props.disabled) return
  emit('edit', item, index)
}

const onDelete = (item: JeAddressItem, index: number) => {
  if (props.disabled) return
  emit('delete', item, index)
}

const onSetDefault = (item: JeAddressItem, index: number) => {
  if (props.disabled || item.isDefault) return
  emit('setDefault', item, index)
}
</script>

<template>
  <ul class="je-address-list">
    <li
      v-for="(item, index) in list"
      :key="item.id ?? index"
      class="je-address-list__item"
      :class="{ 'is-disabled': disabled, 'is-switchable': switchable, 'is-default': item.isDefault }"
      :role="switchable ? 'button' : undefined"
      :tabindex="switchable && !disabled ? 0 : undefined"
      :aria-disabled="disabled || undefined"
      @click="onSelect(item, index)"
      @keydown.enter.prevent="onSelect(item, index)"
      @keydown.space.prevent="onSelect(item, index)"
    >
      <div class="je-address-list__head">
        <span class="je-address-list__name">{{ item.name }}</span>
        <span class="je-address-list__tel">{{ item.tel }}</span>
        <span v-if="item.tag" class="je-address-list__tag">{{ item.tag }}</span>
      </div>

      <p class="je-address-list__body">
        <span v-if="item.isDefault" class="je-address-list__default">{{ defaultTagText }}</span>
        <span class="je-address-list__address">{{ item.address }}</span>
      </p>

      <div v-if="showEdit || showDelete" class="je-address-list__actions" @click.stop>
        <button
          v-if="!item.isDefault"
          type="button"
          class="je-address-list__action"
          :disabled="disabled"
          @click="onSetDefault(item, index)"
        >
          <JeIcon name="check" :size="15" />
          <span>设为默认</span>
        </button>
        <span v-else class="je-address-list__action is-muted">
          <JeIcon name="check" :size="15" />
          <span>默认地址</span>
        </span>

        <button
          v-if="showEdit"
          type="button"
          class="je-address-list__action"
          :disabled="disabled"
          @click="onEdit(item, index)"
        >
          <JeIcon name="edit" :size="15" />
          <span>编辑</span>
        </button>

        <button
          v-if="showDelete"
          type="button"
          class="je-address-list__action is-danger"
          :disabled="disabled"
          @click="onDelete(item, index)"
        >
          <JeIcon name="trash" :size="15" />
          <span>删除</span>
        </button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.je-address-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.je-address-list__item {
  padding: 14px 15px;
  border: 1px solid var(--je-border-color);
  border-radius: var(--je-radius);
  background: var(--je-surface);
  transition: border-color var(--je-duration), box-shadow var(--je-duration);
}

.je-address-list__item.is-switchable:not(.is-disabled) {
  cursor: pointer;
}

.je-address-list__item.is-switchable:not(.is-disabled):hover {
  border-color: color-mix(in srgb, var(--je-primary) 55%, transparent);
}

.je-address-list__item.is-switchable:not(.is-disabled):focus-visible {
  outline: none;
  border-color: var(--je-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-primary) 18%, transparent);
}

.je-address-list__item.is-default {
  border-color: color-mix(in srgb, var(--je-primary) 35%, var(--je-border-color));
}

.je-address-list__item.is-disabled {
  opacity: 0.6;
}

.je-address-list__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.je-address-list__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--je-text);
}

.je-address-list__tel {
  font-size: 14px;
  color: var(--je-text-muted);
}

.je-address-list__tag {
  padding: 1px 6px;
  border-radius: var(--je-radius-sm);
  font-size: 12px;
  line-height: 18px;
  color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 12%, transparent);
}

.je-address-list__body {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--je-text);
}

.je-address-list__default {
  flex: none;
  margin-top: 1px;
  padding: 1px 5px;
  border-radius: var(--je-radius-sm);
  font-size: 11px;
  line-height: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

.je-address-list__address {
  min-width: 0;
  word-break: break-all;
  color: var(--je-text-muted);
}

.je-address-list__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px dashed var(--je-border-color);
}

.je-address-list__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: none;
  border-radius: var(--je-radius-sm);
  font-size: 13px;
  color: var(--je-text-muted);
  background: transparent;
  cursor: pointer;
  transition: color var(--je-duration), background var(--je-duration);
}

.je-address-list__action:not(:disabled):hover {
  color: var(--je-primary);
  background: var(--je-surface-hover);
}

.je-address-list__action.is-danger:not(:disabled):hover {
  color: var(--je-danger);
  background: color-mix(in srgb, var(--je-danger) 10%, transparent);
}

.je-address-list__action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-address-list__action.is-muted {
  color: var(--je-primary);
  cursor: default;
}

@media (max-width: 768px) {
  .je-address-list__item {
    padding: 13px 14px;
  }

  .je-address-list__action {
    min-height: 44px;
    padding: 0 10px;
  }
}
</style>
