<script setup lang="ts">
import { computed, ref } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeCheckboxOption } from './types'

defineOptions({ name: 'JeCheckboxGroup' })

const props = withDefaults(
  defineProps<{
    modelValue?: (string | number)[]
    options: JeCheckboxOption[]
    disabled?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  { modelValue: () => [], options: () => [], disabled: false, size: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: (string | number)[]] }>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-checkbox-group--${size.value}`))

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
  <view class="je-checkbox-group" :class="[sizeClass, { 'is-disabled': disabled }]">
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
  /* 一行排多个，放不下自动换行，不浪费右侧空白。
     间距与内边距都取得比较紧：窄屏（375px）下选项所在容器常常只有 190px 上下，
     之前 12px 间距 + 14px 水平内边距会让一项占到 92px，两个刚好放不下、被挤成一行一个 */
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.je-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  /* 定高 44px，与 je-input / je-select 同一档；宽度由左右内边距撑 */
  height: var(--je-touch-h);
  padding: 0 10px;
  background: var(--je-surface);
  border: 1.5px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.25s ease, border-color 0.25s ease;
}

/* 尺寸三档：只覆盖高度 / 左右内边距 / 字号，配色、圆角、交互状态都沿用基础样式 */
.je-checkbox-group--small .je-checkbox {
  height: var(--je-touch-h-sm);
  padding: 0 6px;
  font-size: 13px;
}

.je-checkbox-group--large .je-checkbox {
  height: var(--je-touch-h-lg);
  padding: 0 14px;
  font-size: 16px;
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
