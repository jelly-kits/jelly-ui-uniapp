<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import type { JeAvatarFit, JeAvatarShape, JeAvatarSize } from './types'

defineOptions({ name: 'JeAvatar' })

const props = withDefaults(
  defineProps<{
    src?: string
    size?: JeAvatarSize
    shape?: JeAvatarShape
    icon?: JeIconName
    alt?: string
    fit?: JeAvatarFit
  }>(),
  { src: '', size: 'default', shape: 'circle', icon: 'user', alt: '', fit: 'cover' },
)

const SIZE_MAP: Record<'small' | 'default' | 'large', number> = { small: 28, default: 40, large: 52 }

const size = computed(() => (typeof props.size === 'number' ? props.size : SIZE_MAP[props.size]))

/** 图片加载失败后回退到文字或图标 */
const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

const showImage = computed(() => !!props.src && !failed.value)

/** <image> 用 mode 代替 CSS 的 object-fit（H5 上 uni 会把它还原成 object-fit） */
const IMAGE_MODE: Record<JeAvatarFit, 'scaleToFill' | 'aspectFit' | 'aspectFill'> = {
  fill: 'scaleToFill',
  contain: 'aspectFit',
  cover: 'aspectFill',
}

const imageMode = computed(() => IMAGE_MODE[props.fit] ?? 'aspectFill')
</script>

<template>
  <span
    class="je-avatar"
    :class="`je-avatar--${shape}`"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.42)}px` }"
  >
    <!-- 小程序与 H5 的 <image> 用 mode 代替 object-fit -->
    <image
      v-if="showImage"
      class="je-avatar__img"
      :src="src"
      :alt="alt"
      :mode="imageMode"
      @error="failed = true"
    />
    <span v-else-if="$slots.default" class="je-avatar__text"><slot /></span>
    <JeIcon v-else class="je-avatar__icon" :name="icon" :size="Math.round(size * 0.55)" />
  </span>
</template>

<style scoped>
.je-avatar {
  box-sizing: border-box;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: inherit;
  font-weight: 600;
  color: var(--je-text);
  vertical-align: middle;
  user-select: none;
  background: var(--je-surface);
  border: var(--je-border);
}

.je-avatar--circle {
  border-radius: 50%;
}

.je-avatar--square {
  border-radius: var(--je-radius-sm);
}

.je-avatar__img {
  display: block;
  width: 100%;
  height: 100%;
}

.je-avatar__text {
  padding: 0 4px;
  line-height: 1;
  text-align: center;
}

.je-avatar__icon {
  color: var(--je-text-muted);
}
</style>
