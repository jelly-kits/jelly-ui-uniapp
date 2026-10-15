<script setup lang="ts">
import { computed } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeConfigSize, type JeConfigSize } from '../je-config-provider'
import type { JeSwitchValue } from './types'

defineOptions({ name: 'JeSwitch' })

const props = withDefaults(
  defineProps<{
    modelValue?: JeSwitchValue
    activeValue?: JeSwitchValue
    inactiveValue?: JeSwitchValue
    /** 打开态文案，显示在右侧 */
    activeText?: string
    /** 关闭态文案，显示在左侧 */
    inactiveText?: string
    disabled?: boolean
    loading?: boolean
    /** 尺寸，不传时取祖先 JeConfigProvider 的配置，仍未配置时按 default */
    size?: JeConfigSize
  }>(),
  {
    modelValue: false,
    activeValue: true,
    inactiveValue: false,
    disabled: false,
    loading: false,
    size: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: JeSwitchValue] }>()

/** 尺寸：组件自身优先，再退回全局配置；default 不产生类名（基础样式即 default） */
const size = useJeConfigSize(() => props.size)
const sizeClass = computed(() => (size.value === 'default' ? '' : `je-switch--${size.value}`))

/** 轨道内 loading 图标随档位等比缩放（基础档即 thumb 尺寸对应的 12px） */
const LOADING_ICON: Record<JeConfigSize, number> = { small: 10, default: 12, large: 14 }
const loadingIconSize = computed(() => LOADING_ICON[size.value])

const checked = computed(() => props.modelValue === props.activeValue)

const toggle = () => {
  if (props.disabled || props.loading) return
  emit('update:modelValue', checked.value ? props.inactiveValue : props.activeValue)
}
</script>

<template>
  <button
    type="button"
    class="je-switch"
    :class="[sizeClass, { 'is-checked': checked, 'is-loading': loading }]"
    role="switch"
    :aria-checked="checked"
    :disabled="disabled || loading"
    @click="toggle"
  >
    <span v-if="inactiveText" class="je-switch__text je-switch__text--inactive">
      {{ inactiveText }}
    </span>

    <span class="je-switch__track">
      <span class="je-switch__thumb">
        <JeIcon v-if="loading" name="loading" :size="loadingIconSize" spin />
      </span>
    </span>

    <span v-if="activeText" class="je-switch__text je-switch__text--active">
      {{ activeText }}
    </span>
  </button>
</template>

<style scoped>
.je-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  font-family: inherit;
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
}

.je-switch__track {
  position: relative;
  display: inline-block;
  box-sizing: border-box;
  width: 52px;
  height: 30px;
  background: var(--je-surface);
  border: 1.5px solid var(--je-border-color);
  border-radius: 999px;
  transition: background 0.3s ease, border-color 0.3s ease,
    box-shadow 0.3s ease;
}

/* 打开态：渐变与光晕都由主色现算，换肤后自动跟随 */
.je-switch.is-checked .je-switch__track {
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--je-primary) 40%, transparent);
}

.je-switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 21px;
  height: 21px;
  color: var(--je-primary);
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  /* 带轻微过冲的位移，落到两端时有一点果冻回弹 */
  transition: transform 0.36s var(--je-ease-out-back);
}

.je-switch.is-checked .je-switch__thumb {
  transform: translateX(22px);
}

.je-switch__text {
  font-size: 13px;
  color: var(--je-text-faint);
  transition: color 0.25s ease;
}

.je-switch.is-checked .je-switch__text--active,
.je-switch:not(.is-checked) .je-switch__text--inactive {
  color: var(--je-text);
  font-weight: 500;
}

/* 尺寸两档：轨道整体等比缩放，thumb 边距 = (轨道高 - thumb - 2 * 边框) / 2，
   打开态位移 = 轨道宽 - thumb 宽 - 2 * 边框 - 2 * 边距（落到右端时左右留白与基础档对称）。
   default 档即上面的基础样式，不改动 */
.je-switch--small .je-switch__track {
  width: 44px;
  height: 26px;
}

.je-switch--small .je-switch__thumb {
  top: 2.5px;
  left: 2.5px;
  width: 18px;
  height: 18px;
}

.je-switch--small.is-checked .je-switch__thumb {
  transform: translateX(18px);
}

.je-switch--small .je-switch__text {
  font-size: 12px;
}

.je-switch--large .je-switch__track {
  width: 62px;
  height: 36px;
}

.je-switch--large .je-switch__thumb {
  top: 4px;
  left: 4px;
  width: 25px;
  height: 25px;
}

.je-switch--large.is-checked .je-switch__thumb {
  transform: translateX(26px);
}

.je-switch--large .je-switch__text {
  font-size: 14px;
}

.je-switch:focus-visible .je-switch__track {
  outline: 2px solid var(--je-primary);
  outline-offset: 3px;
}

.je-switch:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 窄屏保证 44px 触控热区，轨道本身尺寸不变 */
@media (max-width: 768px) {
  .je-switch {
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-switch__track,
  .je-switch__thumb {
    transition: none;
  }
}
</style>
