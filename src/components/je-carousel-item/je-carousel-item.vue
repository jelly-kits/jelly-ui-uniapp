<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 子项是 .je-carousel__track 的 flex 子项，靠 flex: 0 0 100% 决定一屏一张。小程序自定义
   * 组件默认多包一层宿主节点，flex 子项会变成宿主，flex 与百分比宽度都落不到子项上，
   * 所有轮播会挤成一行。声明 virtualHost 后宿主不再生成盒子。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted } from 'vue'
import { useUid } from '../../core/useUid'
import { JE_CAROUSEL_KEY } from '../je-carousel/types'

defineOptions({ name: 'JeCarouselItem' })

const props = defineProps<{ name?: string | number }>()

const uid = useUid('je-carousel-item')
/** 单独使用时注入不到父级，这里要允许为空 */
const carousel = inject(JE_CAROUSEL_KEY, null)

onMounted(() => carousel?.register({ uid, name: props.name }))
onBeforeUnmount(() => carousel?.unregister(uid))
</script>

<template>
  <view
    class="je-carousel__item"
    role="group"
    aria-roledescription="slide"
    :aria-label="name === undefined ? undefined : String(name)"
  >
    <slot />
  </view>
</template>

<style scoped>
.je-carousel__item {
  flex: 0 0 100%;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>