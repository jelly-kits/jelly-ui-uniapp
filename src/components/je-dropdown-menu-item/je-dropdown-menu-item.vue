<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 子项是 .je-dropdown-menu__bar 的 flex 子项，靠自身 flex: 1 1 0 与面板定位承担展开态。
   * 小程序自定义组件默认多包一层宿主节点，flex 子项会变成宿主，flex: 1 与百分比宽度都被吞掉。
   * 声明 virtualHost 后宿主不再生成盒子，.je-dropdown-menu-item 直接作为条目栏的 flex 子项。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import JeScrollbar from '../je-scrollbar/je-scrollbar.vue'
import { useUid } from '../../core/useUid'
import {
  jeDropdownMenuKey,
  type JeDropdownOption,
  type JeDropdownValue,
} from '../je-dropdown-menu/types'

defineOptions({ name: 'JeDropdownMenuItem' })

const props = withDefaults(
  defineProps<{
    /** 条目栏文案，未选中选项自带 title 时显示选项的 title */
    title?: string
    /** 选项列表 */
    options?: JeDropdownOption[]
    /** 当前选中值，multiple 时为数组 */
    modelValue?: JeDropdownValue | JeDropdownValue[]
    /** 是否多选 */
    multiple?: boolean
    /** 禁用后条目不可展开 */
    disabled?: boolean
  }>(),
  {
    title: '',
    options: () => [],
    modelValue: undefined,
    multiple: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeDropdownValue | JeDropdownValue[]]
  /** 选中值变化 */
  change: [value: JeDropdownValue | JeDropdownValue[]]
}>()

const ctx = inject(jeDropdownMenuKey)
if (!ctx) throw new Error('JeDropdownMenuItem 必须放在 JeDropdownMenu 内使用')

const uid = useUid('je-dropdown-menu-item')

/** 自身标识，与菜单的 activeIndex 比对即可判断是否展开 */
const key = Symbol('jeDropdownMenuItem')
const index = computed(() => ctx.indexOf(key))
const active = computed(() => index.value !== -1 && ctx.activeIndex.value === index.value)

const isUp = computed(() => ctx.direction.value === 'up')
const activeColor = computed(() => ctx.activeColor.value)
const inactiveColor = computed(() => ctx.inactiveColor.value)

const selectedValues = computed<JeDropdownValue[]>(() =>
  Array.isArray(props.modelValue) ? props.modelValue : [],
)
const selectedOption = computed(() =>
  Array.isArray(props.modelValue)
    ? undefined
    : props.options.find((option) => option.value === props.modelValue),
)

const displayText = computed(() => {
  if (props.multiple) return props.title ?? ''
  return selectedOption.value?.title ?? props.title ?? ''
})

const hasValue = computed(() =>
  props.multiple
    ? selectedValues.value.length > 0
    : props.modelValue !== undefined && props.modelValue !== null,
)

/** 选中或展开都用高亮色 */
const highlighted = computed(() => active.value || hasValue.value)
const textColor = computed(() => (highlighted.value ? activeColor.value : inactiveColor.value))

const isSelected = (value: JeDropdownValue) =>
  props.multiple ? selectedValues.value.includes(value) : props.modelValue === value

const onTitleClick = () => {
  if (props.disabled) return
  const current = index.value
  if (current === -1) return
  ctx.toggle(current)
}

const onSelect = (option: JeDropdownOption) => {
  if (props.disabled || option.disabled) return
  if (props.multiple) {
    const next = selectedValues.value.includes(option.value)
      ? selectedValues.value.filter((value) => value !== option.value)
      : [...selectedValues.value, option.value]
    emit('update:modelValue', next)
    emit('change', next)
  } else {
    emit('update:modelValue', option.value)
    emit('change', option.value)
  }
  if (ctx.closeOnClickOption.value) ctx.close()
}

onMounted(() => ctx.register(key))
onBeforeUnmount(() => ctx.unregister(key))
</script>

<template>
  <view class="je-dropdown-menu-item" :class="{ 'is-active': active, 'is-disabled': disabled }">
    <button
      type="button"
      class="je-dropdown-menu-item__title"
      aria-haspopup="listbox"
      :aria-expanded="active"
      :aria-controls="`${uid}-panel`"
      :disabled="disabled"
      @tap="onTitleClick"
    >
      <text class="je-dropdown-menu-item__title-text" :style="{ color: textColor }">
        {{ displayText }}
      </text>
      <JeIcon
        class="je-dropdown-menu-item__arrow"
        name="chevron-down"
        :size="14"
        :style="{ color: textColor }"
      />
    </button>

    <!--
      面板相对菜单根（.je-dropdown-menu 是最近的定位祖先）定位，铺满整条菜单宽度；常驻 DOM，靠 is-open 控制显隐。
      小程序端样式隔离只影响选择器匹配、不影响包含块解析，跨组件的绝对定位照样能落到菜单根上，
      所以父级无需查询 / 测量子节点，面板留在子项模板里即可。
    -->
    <view
      :id="`${uid}-panel`"
      class="je-dropdown-menu-item__panel"
      :class="{ 'is-open': active, 'is-up': isUp }"
    >
      <JeScrollbar :max-height="280">
        <view class="je-dropdown-menu-item__list">
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            role="option"
            class="je-dropdown-menu-item__option"
            :class="{ 'is-disabled': option.disabled, 'is-selected': isSelected(option.value) }"
            :aria-selected="isSelected(option.value)"
            :disabled="option.disabled"
            @tap="onSelect(option)"
          >
            <JeIcon
              v-if="option.icon"
              class="je-dropdown-menu-item__icon"
              :name="option.icon"
              :size="16"
            />
            <text
              class="je-dropdown-menu-item__text"
              :style="{ color: isSelected(option.value) ? activeColor : undefined }"
            >
              {{ option.text }}
            </text>
            <text v-if="option.tip" class="je-dropdown-menu-item__tip">{{ option.tip }}</text>
            <JeIcon
              v-if="isSelected(option.value)"
              class="je-dropdown-menu-item__check"
              name="check"
              :size="16"
              :style="{ color: activeColor }"
            />
          </button>
        </view>
      </JeScrollbar>
    </view>
  </view>
</template>

<style scoped>
.je-dropdown-menu-item {
  flex: 1 1 0;
  min-width: 0;
  font-family: inherit;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-dropdown-menu-item button::after {
  border: none;
}

.je-dropdown-menu-item__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0 12px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--je-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
}

.je-dropdown-menu-item__title:disabled {
  color: var(--je-text-faint);
  cursor: not-allowed;
}

.je-dropdown-menu-item__title:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-dropdown-menu-item__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-dropdown-menu-item__arrow {
  flex-shrink: 0;
  transition: transform 0.32s var(--je-ease-out-back);
}

.je-dropdown-menu-item.is-active .je-dropdown-menu-item__arrow {
  transform: rotate(180deg);
}

.je-dropdown-menu-item.is-disabled {
  opacity: 0.6;
}

.je-dropdown-menu-item__panel {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 1;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 0 0 var(--je-radius) var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-8px);
  transition: opacity var(--je-dropdown-duration, 200ms) ease,
    transform var(--je-dropdown-duration, 200ms) ease,
    visibility 0s linear var(--je-dropdown-duration, 200ms);
}

.je-dropdown-menu-item__panel.is-up {
  top: auto;
  bottom: 100%;
  border-radius: var(--je-radius) var(--je-radius) 0 0;
  transform: translateY(8px);
}

.je-dropdown-menu-item__panel.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
  transition: opacity var(--je-dropdown-duration, 200ms) ease,
    transform var(--je-dropdown-duration, 200ms) var(--je-ease-out-back);
}

.je-dropdown-menu-item__list {
  padding: 6px 0;
}

.je-dropdown-menu-item__option {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 0 16px;
  font-family: inherit;
  font-size: 14px;
  color: var(--je-text-muted);
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

.je-dropdown-menu-item__option:not(.is-disabled):hover {
  background: var(--je-surface-hover);
}

.je-dropdown-menu-item__option:not(.is-disabled):active {
  background: color-mix(in srgb, var(--je-primary) 14%, transparent);
}

.je-dropdown-menu-item__option:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-dropdown-menu-item__option:disabled,
.je-dropdown-menu-item__option.is-disabled {
  color: var(--je-text-faint);
  cursor: not-allowed;
  opacity: 0.6;
}

.je-dropdown-menu-item__icon {
  flex-shrink: 0;
}

.je-dropdown-menu-item__text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-dropdown-menu-item__tip {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--je-text-faint);
}

.je-dropdown-menu-item__check {
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .je-dropdown-menu-item__arrow,
  .je-dropdown-menu-item__panel,
  .je-dropdown-menu-item__panel.is-open {
    transition: none;
  }
}
</style>
