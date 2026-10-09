<script setup lang="ts">
defineOptions({ name: 'JeDivider' })

withDefaults(
  defineProps<{
    /** 水平分割线带文字，垂直分割线用于行内分隔 */
    direction?: 'horizontal' | 'vertical'
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    /** 文字位置，仅水平方向生效 */
    contentPosition?: 'left' | 'center' | 'right'
  }>(),
  { direction: 'horizontal', borderStyle: 'solid', contentPosition: 'center' },
)
</script>

<template>
  <div
    class="je-divider"
    :class="[
      `je-divider--${direction}`,
      `je-divider--${contentPosition}`,
      { 'has-text': !!$slots.default },
    ]"
    :style="{ '--je-divider-style': borderStyle }"
    role="separator"
  >
    <span v-if="$slots.default" class="je-divider__text"><slot /></span>
  </div>
</template>

<style scoped>
.je-divider {
  box-sizing: border-box;
}

/* 水平：默认就是一条线；带文字时拆成左右两条，中间夹文字 */
.je-divider--horizontal {
  width: 100%;
  margin: 16px 0;
  border-top: 1px var(--je-divider-style) var(--je-border-color);
}

.je-divider--horizontal.has-text {
  display: flex;
  align-items: center;
  border-top: none;
}

.je-divider--horizontal.has-text::before,
.je-divider--horizontal.has-text::after {
  content: '';
  border-top: 1px var(--je-divider-style) var(--je-border-color);
}

/* 用不同的伸展比例把文字推向对应位置，左右都能留出呼吸感 */
.je-divider--horizontal.has-text::before {
  flex-grow: var(--je-divider-before, 1);
}

.je-divider--horizontal.has-text::after {
  flex-grow: var(--je-divider-after, 1);
}

.je-divider--left {
  --je-divider-before: 0.35;
  --je-divider-after: 6;
}

.je-divider--right {
  --je-divider-before: 6;
  --je-divider-after: 0.35;
}

.je-divider__text {
  padding: 0 14px;
  font-size: 13px;
  color: var(--je-text-faint);
  white-space: nowrap;
}

/* 垂直：高度跟随行高，用 inline-block 才能嵌在文字之间 */
.je-divider--vertical {
  display: inline-block;
  height: 1em;
  margin: 0 8px;
  vertical-align: middle;
  border-left: 1px var(--je-divider-style) var(--je-border-color);
}

.je-divider--vertical .je-divider__text {
  display: none;
}
</style>