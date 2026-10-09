<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ name: 'JeField' })

defineProps<{ label?: string }>()

const rootRef = ref<HTMLElement | null>(null)

/**
 * 按优先级分层查找第一个可聚焦控件。
 * 不能把几个选择器拼成一个并集丢给 querySelector —— 那样返回的是**文档顺序**里的第一个匹配项，
 * JeInputNumber 这类组件的减号按钮排在输入框前面，焦点就会落到按钮上（点击标签的人想的是输入）。
 */
const FOCUSABLE_TIERS = [
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  // 自定义控件（combobox / slider 等）一般挂在带 tabindex 的元素上
  '[tabindex]:not([tabindex="-1"])',
  'button:not([disabled])',
]

/**
 * 标签与控件是兄弟节点而非祖先关系，浏览器不会自动建立关联（`for` 需要控件的 id，
 * 而控件由外部通过插槽传入、JeField 拿不到），所以点击标签时手动把焦点交给内部第一个控件。
 *
 * 小程序端拿不到 DOM、也没有编程式聚焦任意节点的能力，这里只保留 H5 行为。
 */
const onLabelClick = () => {
  // #ifdef H5
  const root = rootRef.value
  if (!root) return
  for (const tier of FOCUSABLE_TIERS) {
    const target = root.querySelector<HTMLElement>(tier)
    if (target) {
      target.focus()
      return
    }
  }
  // #endif
}
</script>

<template>
  <div ref="rootRef" class="je-field">
    <label v-if="label" class="je-field__label" @click="onLabelClick">{{ label }}</label>
    <slot />
  </div>
</template>

<style scoped>
.je-field {
  position: relative;
  margin-bottom: 24px;
}

.je-field__label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--je-text-muted);
  /* 标签可点击（点了会把焦点交给内部控件），给出手型提示 */
  cursor: pointer;
  transition: color var(--je-duration) ease, transform 0.4s var(--je-ease-overshoot);
}

/* 内部控件获得焦点时，标签右移并染成主色（提亮后的主色由主色现算）。
   小程序端不支持 :focus-within，这条只在 H5 生效 */
/* #ifdef H5 */
.je-field:focus-within > .je-field__label {
  color: color-mix(in srgb, var(--je-primary) 65%, white);
  transform: translateX(4px);
}
/* #endif */
</style>
