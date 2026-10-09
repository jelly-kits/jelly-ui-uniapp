<script setup lang="ts">
import { computed } from 'vue'
import JeButton from '../je-button/je-button.vue'
import type { JeButtonSize, JeButtonType } from '../je-button/types'

defineOptions({ name: 'JeActionBarButton' })

const props = withDefaults(
  defineProps<{
    /** 按钮文字，默认插槽可覆盖 */
    text?: string
    /** 语义类型 */
    type?: JeButtonType
    /** 尺寸 */
    size?: JeButtonSize
    /** 加载中 */
    loading?: boolean
    /** 禁用 */
    disabled?: boolean
  }>(),
  {
    text: '',
    type: 'primary',
    size: undefined,
    loading: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 点击按钮 */
  click: []
}>()

/** default 等同于不传，避免 JeButton 多出无意义的尺寸值 */
const buttonSize = computed<JeButtonSize | undefined>(() =>
  props.size === 'default' ? undefined : props.size,
)
</script>

<template>
  <view class="je-action-bar-button">
    <JeButton
      :type="type"
      :size="buttonSize"
      :loading="loading"
      :disabled="disabled"
      block
      round
      @click="emit('click')"
    >
      <slot>{{ text }}</slot>
    </JeButton>
  </view>
</template>

<style scoped>
.je-action-bar-button {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
}
</style>
