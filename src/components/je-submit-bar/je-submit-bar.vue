<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import JeButton from '../je-button/je-button.vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeButtonType } from '../je-button/types'
import type { JeIconName } from '../je-icon/icons'

defineOptions({ name: 'JeSubmitBar' })

const props = withDefaults(
  defineProps<{
    /** 合计金额 */
    price?: number
    /** 金额左侧文字，如「合计：」 */
    label?: string
    /** 货币符号 */
    currency?: string
    /** 金额保留的小数位数 */
    decimalLength?: number
    /** 上方提示文案 */
    tip?: string
    /** 提示文案前的图标 */
    tipIcon?: JeIconName
    /** 提交按钮文案 */
    buttonText?: string
    /** 提交按钮的语义类型 */
    buttonType?: JeButtonType
    /** 加载中文案 */
    loadingText?: string
    disabled?: boolean
    loading?: boolean
    /** 固定在视口底部 */
    fixed?: boolean
    /** fixed 时用占位元素撑住原来的高度，避免遮住页面底部内容 */
    placeholder?: boolean
    /** 底部预留安全区 */
    safeAreaInsetBottom?: boolean
    /** 顶部 1px 分隔线 */
    border?: boolean
    /** fixed 时的层级 */
    zIndex?: number
  }>(),
  {
    price: undefined,
    label: '',
    currency: '¥',
    decimalLength: 2,
    tip: '',
    tipIcon: undefined,
    buttonText: '提交订单',
    buttonType: 'primary',
    loadingText: '提交中...',
    disabled: false,
    loading: false,
    fixed: false,
    placeholder: true,
    safeAreaInsetBottom: true,
    border: true,
    zIndex: 100,
  },
)

const emit = defineEmits<{
  /** 点击提交按钮（loading / disabled 时不触发） */
  submit: []
}>()

const barRef = ref<HTMLElement | null>(null)
const barHeight = ref(0)
const instance = getCurrentInstance()

const formattedPrice = computed(() =>
  props.price === undefined ? '' : props.price.toFixed(props.decimalLength),
)

const rootStyle = computed(() => ({
  '--je-submit-bar-height': `${barHeight.value}px`,
  '--je-submit-bar-safe-bottom': props.safeAreaInsetBottom
    ? 'env(safe-area-inset-bottom, 0px)'
    : '0px',
  ...(props.fixed ? { '--je-submit-bar-z': String(props.zIndex) } : {}),
}))

const onSubmit = () => {
  if (props.disabled || props.loading) return
  emit('submit')
}

/**
 * 主库用 ResizeObserver 盯住面板高度，小程序端既没有 ResizeObserver 也拿不到 DOM。
 * H5 下模板 ref 指向 <view> 组件实例，真实节点挂在 $el 上；小程序端改用 SelectorQuery 量一次。
 */
const measure = () => {
  // #ifdef H5
  const host = barRef.value as unknown as { $el?: HTMLElement } | null
  const el = (host?.$el ?? host) as HTMLElement | null
  barHeight.value = el?.offsetHeight ?? 0
  // #endif
  // #ifndef H5
  if (instance?.proxy) {
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select('.je-submit-bar__inner')
      .boundingClientRect((result) => {
        const info = (Array.isArray(result) ? result[0] : result) as unknown as
          | { height?: number }
          | undefined
        if (info && typeof info.height === 'number') barHeight.value = info.height
      })
      .exec()
  }
  // #endif
}

onMounted(measure)
</script>

<template>
  <view class="je-submit-bar" :style="rootStyle">
    <view
      ref="barRef"
      class="je-submit-bar__inner"
      :class="{ 'is-fixed': fixed, 'has-border': border }"
    >
      <view v-if="tip || $slots.tip" class="je-submit-bar__tip">
        <JeIcon v-if="tipIcon" :name="tipIcon" :size="14" />
        <text><slot name="tip">{{ tip }}</slot></text>
      </view>

      <view class="je-submit-bar__bar">
        <view class="je-submit-bar__content">
          <slot>
            <text v-if="label" class="je-submit-bar__label">{{ label }}</text>
            <text v-if="formattedPrice" class="je-submit-bar__price">
              <text class="je-submit-bar__currency">{{ currency }}</text>{{ formattedPrice }}
            </text>
          </slot>
        </view>

        <view class="je-submit-bar__action">
          <JeButton
            :type="buttonType"
            :disabled="disabled"
            :loading="loading"
            @click="onSubmit"
          >
            {{ loading ? loadingText : buttonText }}
          </JeButton>
        </view>
      </view>
    </view>

    <view v-if="fixed && placeholder" class="je-submit-bar__placeholder" />
  </view>
</template>

<style scoped>
.je-submit-bar {
  font-family: inherit;
  --je-submit-bar-height: 0px;
  --je-submit-bar-safe-bottom: 0px;
}

.je-submit-bar__inner {
  box-sizing: border-box;
  color: var(--je-text);
  background: var(--je-popup);
  /* 小程序端不支持 backdrop-filter，退化成纯色底 */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding-bottom: var(--je-submit-bar-safe-bottom);
}

.je-submit-bar__inner.has-border {
  border-top: var(--je-border);
}

.je-submit-bar__inner.is-fixed {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--je-submit-bar-z, 100);
}

.je-submit-bar__tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--je-warning);
  background: color-mix(in srgb, var(--je-warning) 12%, transparent);
}

.je-submit-bar__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  min-height: 52px;
  padding: 8px 16px;
}

.je-submit-bar__content {
  display: flex;
  flex: 1 1 auto;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
  color: var(--je-text-muted);
}

.je-submit-bar__price {
  font-size: 20px;
  font-weight: 700;
  color: var(--je-danger);
  font-variant-numeric: tabular-nums;
}

.je-submit-bar__currency {
  font-size: 14px;
}

.je-submit-bar__action {
  flex-shrink: 0;
}

.je-submit-bar__placeholder {
  height: var(--je-submit-bar-height);
}

@media (max-width: 768px) {
  .je-submit-bar__bar {
    gap: 10px;
    padding: 8px 14px;
  }

  .je-submit-bar__action {
    min-width: 120px;
  }
}
</style>
