<script setup lang="ts">
import { ref } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeCheckboxOption } from './types'

defineOptions({ name: 'JeCheckboxGroup' })

const props = withDefaults(
  defineProps<{
    modelValue?: (string | number)[]
    options: JeCheckboxOption[]
    disabled?: boolean
  }>(),
  { modelValue: () => [], options: () => [], disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: (string | number)[]] }>()

const isChecked = (value: string | number) => props.modelValue.includes(value)

/**
 * 重播一次性 pop 动画。
 * 原库靠「摘类名 → 读 offsetWidth 强制重排 → 加回类名」实现连点重播，
 * 小程序端没有 DOM；改成 Vue 驱动类名，并用两组等价类交替切换，
 * 类名一变动画自然从头播，连点也能重播。
 */
const popKind = ref<Record<string, 'in' | 'out'>>({})
const popSeq = ref<Record<string, number>>({})

const popClass = (value: string | number) => {
  const key = String(value)
  const kind = popKind.value[key]
  if (!kind) return ''
  return `is-pop-${kind}${(popSeq.value[key] ?? 0) % 2 === 0 ? '--alt' : ''}`
}

const toggle = (option: JeCheckboxOption) => {
  if (props.disabled) return

  const next = [...props.modelValue]
  const at = next.indexOf(option.value)
  const checked = at < 0
  if (checked) next.push(option.value)
  else next.splice(at, 1)
  emit('update:modelValue', next)

  const key = String(option.value)
  popKind.value[key] = checked ? 'in' : 'out'
  popSeq.value[key] = (popSeq.value[key] ?? 0) + 1
}
</script>

<template>
  <view class="je-checkbox-group" :class="{ 'is-disabled': disabled }">
    <view
      v-for="option in options"
      :key="option.value"
      class="je-checkbox"
      :class="{ 'is-checked': isChecked(option.value) }"
      role="checkbox"
      :aria-checked="isChecked(option.value)"
      :aria-disabled="disabled"
      @tap="toggle(option)"
    >
      <!-- #ifdef H5 -->
      <!-- 原生 checkbox 只负责键盘可达（Tab 聚焦、空格切换），视觉一律走 .is-checked 类；
           click 要拦掉，否则空格触发的合成 click 会再冒泡到外层 @tap，切两次 -->
      <input
        class="je-checkbox__input"
        type="checkbox"
        :checked="isChecked(option.value)"
        :disabled="disabled"
        @click.stop
        @change="toggle(option)"
      >
      <!-- #endif -->
      <view class="je-checkbox__box" :class="popClass(option.value)">
        <je-icon v-if="isChecked(option.value)" name="check" :size="13" />
      </view>
      <text class="je-checkbox__label">{{ option.label }}</text>
    </view>
  </view>
</template>

<style scoped>
.je-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.je-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--je-surface);
  border: 1.5px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.25s ease, border-color 0.25s ease;
}

.je-checkbox:hover {
  background: var(--je-surface-hover);
}

.je-checkbox.is-checked {
  border-color: var(--je-primary);
}

.je-checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.je-checkbox__box {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  /* 勾只在选中（渐变底）时出现，固定浅色 */
  color: var(--je-text-on-color);
  border: 2px solid var(--je-border-color);
  border-radius: 7px;
  transition: border-color 0.25s ease, background 0.25s ease;
  will-change: transform;
}

.je-checkbox.is-checked .je-checkbox__box {
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
}

.je-checkbox__label {
  font-size: 14px;
  color: var(--je-text-muted);
  transition: color 0.25s ease;
}

.je-checkbox.is-checked .je-checkbox__label {
  font-weight: 500;
  color: var(--je-text);
}

.je-checkbox-group.is-disabled .je-checkbox {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 勾选 1 → 1.35、取消 1 → 0.85，落稳后都回到 1；中值由各自类里的变量给出。
   --alt 组与本体完全等价，只为「连点也能重播」提供不同的类名 */
.je-checkbox__box.is-pop-in,
.je-checkbox__box.is-pop-in--alt,
.je-checkbox__box.is-pop-out,
.je-checkbox__box.is-pop-out--alt {
  animation: je-box-pop 0.6s;
}

.je-checkbox__box.is-pop-in,
.je-checkbox__box.is-pop-in--alt {
  --je-pop-mid: 1.35;
}

.je-checkbox__box.is-pop-out,
.je-checkbox__box.is-pop-out--alt {
  --je-pop-mid: 0.85;
}

@keyframes je-box-pop {
  0% {
    transform: scale(1);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  40% {
    transform: scale(var(--je-pop-mid));
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-checkbox__box.is-pop-in,
  .je-checkbox__box.is-pop-in--alt,
  .je-checkbox__box.is-pop-out,
  .je-checkbox__box.is-pop-out--alt {
    animation: none;
  }
}
</style>
