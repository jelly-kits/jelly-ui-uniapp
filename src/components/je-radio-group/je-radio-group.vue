<script setup lang="ts">
import { computed, ref } from 'vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeRadioOption } from './types'

defineOptions({ name: 'JeRadioGroup' })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    options: JeRadioOption[]
    /** 原生 radio 的 name，不传则自动生成 */
    name?: string
    disabled?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  { modelValue: null, options: () => [], disabled: false, size: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-radio-group--${size.value}`))

/** 模块级自增代替 useId：uni 的 vue 运行时（小程序端）没有导出 useId */
let radioSeq = 0
const uid = `je-radio-${(radioSeq += 1)}`
const groupName = computed(() => props.name ?? uid)

/**
 * 重播一次性 pop 动画。
 * 原库靠「摘类名 → 读 offsetWidth 强制重排 → 加回类名」实现连点重播，
 * 小程序端没有 DOM；改成 Vue 驱动类名，并用两组等价类交替切换，
 * 类名一变动画自然从头播，连点也能重播。
 */
const popSeq = ref<Record<string, number>>({})

const popClass = (value: string | number) => {
  const key = String(value)
  const seq = popSeq.value[key]
  if (!seq) return ''
  return `is-popping${seq % 2 === 0 ? '--alt' : ''}`
}

const select = (option: JeRadioOption) => {
  if (props.disabled) return
  if (option.value !== props.modelValue) emit('update:modelValue', option.value)
  const key = String(option.value)
  popSeq.value[key] = (popSeq.value[key] ?? 0) + 1
}
</script>

<template>
  <view class="je-radio-group" :class="[sizeClass, { 'is-disabled': disabled }]" role="radiogroup">
    <view
      v-for="option in options"
      :key="option.value"
      class="je-radio"
      :class="{ 'is-checked': option.value === modelValue }"
      role="radio"
      :aria-checked="option.value === modelValue"
      :aria-disabled="disabled"
      @tap="select(option)"
    >
      <!-- #ifdef H5 -->
      <!-- 原生 radio 只负责键盘可达（Tab 聚焦、方向键切换），视觉一律走 .is-checked 类 -->
      <input
        class="je-radio__input"
        type="radio"
        :name="groupName"
        :checked="option.value === modelValue"
        :disabled="disabled"
        @click.stop
        @change="select(option)"
      >
      <!-- #endif -->
      <view class="je-radio__circle" :class="popClass(option.value)" />
      <text class="je-radio__label">{{ option.label }}</text>
    </view>
  </view>
</template>

<style scoped>
.je-radio-group {
  /* 一行排多个，放不下自动换行，不浪费右侧空白。
     间距与内边距都取得比较紧：窄屏（375px）下选项所在容器常常只有 190px 上下，
     之前 12px 间距 + 14px 水平内边距会让一项占到 92px，两个刚好放不下、被挤成一行一个 */
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.je-radio {
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
.je-radio-group--small .je-radio {
  height: var(--je-touch-h-sm);
  padding: 0 6px;
  font-size: 13px;
}

.je-radio-group--large .je-radio {
  height: var(--je-touch-h-lg);
  padding: 0 14px;
  font-size: 16px;
}

.je-radio:hover {
  background: var(--je-surface-hover);
}

.je-radio.is-checked {
  border-color: var(--je-primary);
}

/* 隐藏原生 input，但保留它的语义与键盘方向键行为 */
.je-radio__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.je-radio__circle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  border: 2px solid var(--je-border-color);
  border-radius: 50%;
  transition: border-color 0.25s ease, background 0.25s ease;
  will-change: transform;
}

.je-radio__circle::after {
  content: '';
  width: 10px;
  height: 10px;
  /* 只在选中时出现，压在品牌渐变上，固定浅色 */
  background: var(--je-text-on-color);
  border-radius: 50%;
  transform: scale(0);
  transition: transform 0.4s var(--je-ease-overshoot);
}

.je-radio.is-checked .je-radio__circle {
  border-color: var(--je-primary);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

.je-radio.is-checked .je-radio__circle::after {
  transform: scale(1);
}

.je-radio__label {
  font-size: 14px;
  color: var(--je-text-muted);
  transition: color 0.25s ease;
}

.je-radio.is-checked .je-radio__label {
  font-weight: 500;
  color: var(--je-text);
}

.je-radio-group.is-disabled .je-radio {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 选中时 1 → 1.35 → 1，两段都走减速曲线，合起来就是弹簧的「弹一下再落稳」。
   --alt 组与本体完全等价，只为「连点也能重播」提供不同的类名 */
.je-radio__circle.is-popping,
.je-radio__circle.is-popping--alt {
  animation: je-radio-pop 0.6s;
}

@keyframes je-radio-pop {
  0% {
    transform: scale(1);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  40% {
    transform: scale(1.35);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-radio__circle.is-popping,
  .je-radio__circle.is-popping--alt {
    animation: none;
  }
}
</style>
