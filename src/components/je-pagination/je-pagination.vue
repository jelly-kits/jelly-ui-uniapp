<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import JeDropdown from '../je-dropdown/je-dropdown.vue'
import JeDropdownItem from '../je-dropdown-item/je-dropdown-item.vue'
import { buildPager, type JePagerItem } from './types'

defineOptions({ name: 'JePagination' })

const props = withDefaults(
  defineProps<{
    modelValue?: number
    total?: number
    pageSize?: number
    pageSizes?: number[]
    /** 支持 total / sizes / prev / pager / next / jumper，逗号分隔且按顺序渲染 */
    layout?: string
    background?: boolean
    small?: boolean
    disabled?: boolean
    hideOnSinglePage?: boolean
    pagerCount?: number
  }>(),
  {
    modelValue: 1,
    total: 0,
    pageSize: 10,
    pageSizes: () => [10, 20, 50, 100],
    layout: 'prev, pager, next',
    background: false,
    small: false,
    disabled: false,
    hideOnSinglePage: false,
    pagerCount: 7,
  },
)

const emit = defineEmits<{
  'update:modelValue': [page: number]
  'update:pageSize': [size: number]
  change: [page: number, pageSize: number]
  'current-change': [page: number]
  'size-change': [size: number]
}>()

/**
 * 窄屏把页码精简为「上一页 / 当前页 / 下一页」。
 * 小程序端没有 window，恒按窄屏处理；H5 在挂载时按视口宽判一次
 * （口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

const pageCount = computed(() => {
  const size = props.pageSize > 0 ? props.pageSize : 1
  return Math.max(1, Math.ceil(Math.max(0, props.total) / size))
})

/** 对外始终暴露合法页码，避免父级传入越界值 */
const currentPage = computed(() => {
  const page = Math.floor(props.modelValue) || 1
  return Math.min(Math.max(1, page), pageCount.value)
})

const layoutItems = computed(() =>
  props.layout
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
)

const pagerItems = computed<JePagerItem[]>(() =>
  isMobile.value
    ? [currentPage.value]
    : buildPager(currentPage.value, pageCount.value, props.pagerCount),
)

const visible = computed(() => !props.hideOnSinglePage || pageCount.value > 1)

const go = (page: number) => {
  if (props.disabled) return
  const next = Math.min(Math.max(1, Math.floor(page)), pageCount.value)
  if (next === currentPage.value) return
  emit('update:modelValue', next)
  emit('change', next, props.pageSize)
  emit('current-change', next)
}

/**
 * 原生 <select> 的 event.target.value 在 uni 里不成立：
 * 小程序与 H5 的 <input> / <picker> 都把值放在 `event.detail.value`，
 * 统一从这里取，拿不到再退回 event.target（H5 兜底）。
 */
const readValue = (event: Event): unknown => {
  const detail = (event as unknown as { detail?: { value?: unknown } }).detail
  if (detail && detail.value !== undefined) return detail.value
  return (event.target as HTMLInputElement | null)?.value
}

/** 「每页条数」下拉选中后：把新条数抛给使用方，并把越界的当前页收回到最后一页 */
const onSizeChange = (value: string | number) => {
  const size = Number(value)
  if (!size) return
  emit('update:pageSize', size)
  emit('size-change', size)

  const maxPage = Math.max(1, Math.ceil(Math.max(0, props.total) / size))
  if (currentPage.value > maxPage) {
    emit('update:modelValue', maxPage)
    emit('change', maxPage, size)
    emit('current-change', maxPage)
  }
}

const jumpValue = ref('')

const onJumpInput = (event: Event) => {
  jumpValue.value = String(readValue(event) ?? '')
}

const onJump = () => {
  const page = Number.parseInt(jumpValue.value, 10)
  if (!Number.isNaN(page)) go(page)
  jumpValue.value = ''
}
</script>

<template>
  <view
    v-if="visible"
    class="je-pagination"
    :class="{ 'is-background': background, 'is-small': small, 'is-disabled': disabled }"
    aria-label="分页"
  >
    <template v-for="(item, index) in layoutItems" :key="`${item}-${index}`">
      <text v-if="item === 'total'" class="je-pagination__total">共 {{ total }} 条</text>

      <view v-else-if="item === 'sizes'" class="je-pagination__sizes">
        <!--
          用框架自带的 JeDropdown 做「每页条数」下拉：弹出层走 --je-popup / --je-border 等主题变量，
          明暗色自动跟随；不再自己拼一个原生 <picker>（原生弹出层不吃主题，也没有回显位）。
        -->
        <je-dropdown
          class="je-pagination__sizes-dropdown"
          placement="bottom-start"
          :disabled="disabled"
          @command="onSizeChange"
        >
          <template #trigger>{{ pageSize }} 条/页</template>
          <je-dropdown-item v-for="size in pageSizes" :key="size" :command="size">
            {{ size }} 条/页
          </je-dropdown-item>
        </je-dropdown>
      </view>

      <button
        v-else-if="item === 'prev'"
        type="button"
        class="je-pagination__btn"
        aria-label="上一页"
        :disabled="disabled || currentPage <= 1"
        @tap="go(currentPage - 1)"
      >
        <JeIcon name="chevron-left" :size="16" />
      </button>

      <template v-else-if="item === 'pager'">
        <template v-for="pager in pagerItems" :key="pager">
          <text v-if="typeof pager !== 'number'" class="je-pagination__ellipsis" aria-hidden="true">
            ⋯
          </text>
          <button
            v-else
            type="button"
            class="je-pagination__btn"
            :class="{ 'is-active': pager === currentPage }"
            :aria-label="`第 ${pager} 页`"
            :aria-current="pager === currentPage ? 'page' : undefined"
            :disabled="disabled"
            @tap="go(pager)"
          >
            {{ pager }}
          </button>
        </template>
      </template>

      <button
        v-else-if="item === 'next'"
        type="button"
        class="je-pagination__btn"
        aria-label="下一页"
        :disabled="disabled || currentPage >= pageCount"
        @tap="go(currentPage + 1)"
      >
        <JeIcon name="chevron-right" :size="16" />
      </button>

      <view v-else-if="item === 'jumper'" class="je-pagination__jumper">
        <text>前往</text>
        <!-- 小程序 <input> 不认 inputmode，改用 type="number" 唤起数字键盘 -->
        <!-- #ifdef H5 -->
        <input
          class="je-pagination__input"
          type="text"
          inputmode="numeric"
          :value="jumpValue"
          aria-label="跳转页码"
          :disabled="disabled"
          @input="onJumpInput"
          @confirm="onJump"
          @blur="onJump"
        >
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <input
          class="je-pagination__input"
          type="number"
          :value="jumpValue"
          aria-label="跳转页码"
          :disabled="disabled"
          @input="onJumpInput"
          @confirm="onJump"
          @blur="onJump"
        >
        <!-- #endif -->
        <text>页</text>
      </view>
    </template>
  </view>
</template>

<style scoped>
.je-pagination {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 13px;
  color: var(--je-text-muted);
}

.je-pagination__total {
  color: var(--je-text-faint);
}

.je-pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 36px;
  height: 36px;
  /* 屏掉小程序原生 button 的默认外边距与行高 */
  margin: 0;
  padding: 0 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--je-text-muted);
  background: none;
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease,
    border-color var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-pagination__btn::after {
  border: none;
}

.je-pagination__btn:hover:not(:disabled) {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-pagination__btn:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-pagination__btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.je-pagination__btn.is-active {
  /* 页码压在品牌渐变上，文字固定浅色 */
  color: var(--je-text-on-color);
  font-weight: 600;
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--je-primary) 35%, transparent);
}

.je-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 36px;
  color: var(--je-text-faint);
  letter-spacing: 2px;
  user-select: none;
}

.je-pagination__sizes {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* 把 JeDropdown 触发按钮的尺寸收拢到与页码按钮一致 */
.je-pagination__sizes :deep(.je-dropdown__trigger) {
  box-sizing: border-box;
  min-height: 36px;
  margin: 0;
  padding: 0 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--je-text-muted);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-pagination__sizes :deep(.je-dropdown.is-open .je-dropdown__trigger),
.je-pagination__sizes :deep(.je-dropdown__trigger:hover) {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-pagination__jumper {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.je-pagination__input {
  box-sizing: border-box;
  width: 52px;
  height: 36px;
  padding: 0;
  font-family: inherit;
  font-size: 13px;
  color: var(--je-text);
  text-align: center;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  outline: none;
}

.je-pagination__input:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* H5 下 uni 会把 <input> 包一层，真实控件要 :deep 才命中；小程序端是原生组件，不会命中 */
:deep(.uni-input-input) {
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: 1;
  color: inherit;
  text-align: center;
  background: none;
  border: none;
  outline: none;
}

/* 背景模式：按钮式底色 */
.je-pagination.is-background .je-pagination__btn {
  background: var(--je-surface);
  border-color: transparent;
}

.je-pagination.is-background .je-pagination__btn:hover:not(:disabled) {
  background: var(--je-surface-hover);
}

.je-pagination.is-background .je-pagination__btn.is-active {
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

/* 小尺寸 */
.je-pagination.is-small .je-pagination__btn {
  min-width: 28px;
  height: 28px;
  font-size: 12px;
}

.je-pagination.is-small .je-pagination__sizes :deep(.je-dropdown__trigger),
.je-pagination.is-small .je-pagination__input {
  height: 28px;
  min-height: 28px;
  font-size: 12px;
}

.je-pagination.is-small .je-pagination__ellipsis {
  height: 28px;
}

.je-pagination.is-disabled {
  opacity: 0.6;
}

/* 窄屏：热区兜到 44px，页码已由 JS 精简为 prev / 当前页 / next；
   small 是刻意收紧的一档，只收一档到 32px，不跟着兜底 */
@media (max-width: 768px) {
  .je-pagination {
    gap: 6px;
  }

  .je-pagination__btn,
  .je-pagination__sizes :deep(.je-dropdown__trigger),
  .je-pagination__input {
    min-width: 44px;
    min-height: 44px;
    height: 44px;
  }

  .je-pagination__ellipsis {
    height: 44px;
  }

  .je-pagination.is-small .je-pagination__btn,
  .je-pagination.is-small .je-pagination__sizes :deep(.je-dropdown__trigger),
  .je-pagination.is-small .je-pagination__input {
    min-width: 32px;
    min-height: 32px;
    height: 32px;
  }

  .je-pagination.is-small .je-pagination__ellipsis {
    height: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-pagination__btn {
    transition: none;
  }
}
</style>
