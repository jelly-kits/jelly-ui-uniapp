<script setup lang="ts">
import { computed } from 'vue'
import type { JeCouponStatus, JeCouponType } from './types'

defineOptions({ name: 'JeCoupon' })

const props = withDefaults(
  defineProps<{
    /** 面额或折扣值 */
    value?: number | string
    /** 面额左侧的货币符号 */
    currency?: string
    /** 面额右侧的单位，如 元 / 折 */
    unit?: string
    /** 标题 */
    title?: string
    /** 补充说明 */
    description?: string
    /** 使用条件，如「满 100 元可用」 */
    condition?: string
    /** 有效期文案 */
    validity?: string
    /** 右上角角标，如「限时」 */
    tag?: string
    /** 语义色 */
    type?: JeCouponType
    /** 状态，非 unused 时置灰并展示角章 */
    status?: JeCouponStatus
    /** 不可点击 */
    disabled?: boolean
  }>(),
  {
    value: undefined,
    currency: '¥',
    unit: '元',
    title: '',
    description: '',
    condition: '',
    validity: '',
    tag: '',
    type: 'primary',
    status: 'unused',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 点击整张券 */
  click: [event: MouseEvent | KeyboardEvent]
}>()

const inactive = computed(() => props.disabled || props.status !== 'unused')

const stampText = computed(() => {
  if (props.status === 'used') return '已使用'
  if (props.status === 'expired') return '已过期'
  return ''
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  if (inactive.value) return
  emit('click', event)
}

const onClick = (event: MouseEvent) => {
  if (inactive.value) return
  emit('click', event)
}
</script>

<template>
  <div
    class="je-coupon"
    :class="[`je-coupon--${type}`, { 'is-inactive': inactive }]"
    role="button"
    :tabindex="inactive ? undefined : 0"
    :aria-disabled="inactive || undefined"
    @click="onClick"
    @keydown="onKeydown"
  >
    <div class="je-coupon__amount">
      <span v-if="currency" class="je-coupon__currency">{{ currency }}</span>
      <span class="je-coupon__value">{{ value }}</span>
      <span v-if="unit" class="je-coupon__unit">{{ unit }}</span>
    </div>

    <div class="je-coupon__body">
      <div class="je-coupon__head">
        <span class="je-coupon__title">
          <slot name="title">{{ title }}</slot>
        </span>
        <span v-if="tag" class="je-coupon__tag">{{ tag }}</span>
      </div>
      <p v-if="condition" class="je-coupon__condition">{{ condition }}</p>
      <p v-if="description" class="je-coupon__description">{{ description }}</p>
      <p v-if="validity" class="je-coupon__validity">{{ validity }}</p>
    </div>

    <span v-if="stampText" class="je-coupon__stamp">{{ stampText }}</span>
  </div>
</template>

<style scoped>
.je-coupon {
  position: relative;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  overflow: hidden;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  /* 两个渐变端点只在皮肤类里改，实体样式走下面那条共享规则 */
  --jc-from: var(--je-primary);
  --jc-to: var(--je-primary-end);
}

.je-coupon--primary {
  --jc-from: var(--je-primary);
  --jc-to: var(--je-primary-end);
}

.je-coupon--success {
  --jc-from: var(--je-success);
  --jc-to: color-mix(in srgb, var(--je-success) 72%, #065f46);
}

.je-coupon--warning {
  --jc-from: var(--je-warning);
  --jc-to: color-mix(in srgb, var(--je-warning) 72%, #92400e);
}

.je-coupon--danger {
  --jc-from: var(--je-danger);
  --jc-to: color-mix(in srgb, var(--je-danger) 72%, #7f1d1d);
}

.je-coupon--info {
  --jc-from: var(--je-info);
  --jc-to: color-mix(in srgb, var(--je-info) 72%, #334155);
}

.je-coupon:not(.is-inactive) {
  cursor: pointer;
}

.je-coupon:not(.is-inactive):hover {
  border-color: color-mix(in srgb, var(--jc-from) 60%, var(--je-border-color));
}

.je-coupon:not(.is-inactive):focus-visible {
  outline: 2px solid var(--jc-from);
  outline-offset: 2px;
}

.je-coupon__amount {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  box-sizing: border-box;
  width: 108px;
  padding: 20px 12px;
  color: #fff;
  background: linear-gradient(135deg, var(--jc-from), var(--jc-to));
}

/* 分界线画在左块右侧，用竖直虚线模拟撕口 */
.je-coupon__amount::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 0;
  bottom: 8px;
  border-right: 1px dashed rgba(255, 255, 255, 0.55);
}

.je-coupon__currency {
  font-size: 14px;
}

.je-coupon__value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.je-coupon__unit {
  font-size: 13px;
}

.je-coupon__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  padding: 16px 16px 16px 18px;
}

.je-coupon__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.je-coupon__title {
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: break-word;
}

.je-coupon__tag {
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 11px;
  line-height: 1.5;
  color: #fff;
  background: var(--jc-from);
  border-radius: 999px;
}

.je-coupon__condition,
.je-coupon__description,
.je-coupon__validity {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--je-text-muted);
}

.je-coupon__validity {
  color: var(--je-text-faint);
}

.je-coupon__stamp {
  position: absolute;
  top: 50%;
  right: 14px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--je-text-muted);
  border: 1px solid var(--je-text-faint);
  border-radius: 999px;
  transform: translateY(-50%) rotate(-12deg);
}

.je-coupon.is-inactive {
  opacity: 0.55;
  filter: grayscale(0.85);
}

@media (max-width: 768px) {
  .je-coupon__amount {
    width: 96px;
    padding: 18px 10px;
  }

  .je-coupon__value {
    font-size: 26px;
  }

  .je-coupon__body {
    padding: 14px 14px 14px 16px;
  }
}
</style>
