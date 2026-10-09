<script setup lang="ts">
import { provideJeLocale, type JeLocaleInput } from './types'

defineOptions({ name: 'JeLocale', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 语言名（'zh-CN' / 'en-US'）或部分覆盖的语言包对象 */
    locale?: JeLocaleInput
  }>(),
  { locale: undefined },
)

provideJeLocale(() => props.locale)
</script>

<template>
  <view class="je-locale">
    <slot />
  </view>
</template>

<style scoped>
/* 纯包裹层：H5 用 display: contents 把自己从布局里摘掉，不额外多一层盒子；
   小程序不认这个值，退化成块级盒子（不影响内部布局） */
/* #ifdef H5 */
.je-locale {
  display: contents;
}
/* #endif */
/* #ifndef H5 */
.je-locale {
  display: block;
}
/* #endif */
</style>
