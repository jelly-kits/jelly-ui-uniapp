<script setup lang="ts">
import { computed, provide } from 'vue'
import { provideJeLocale, type JeLocaleInput } from '../je-locale/types'
import { jeConfigKey, type JeConfigSize } from './types'

defineOptions({ name: 'JeConfigProvider' })

const props = withDefaults(
  defineProps<{
    /**
     * 子树默认组件尺寸。
     * 不能给 prop 默认值写成 'default' —— 那样就区分不出「没传」，会把上层配置整个压死。
     */
    size?: JeConfigSize
    /** 主题变量覆盖，键可带或不带 --je- 前缀 */
    theme?: Record<string, string>
    /** 语言包：传语言名（'zh-CN' / 'en-US' / registerJellyLocale 注册的名字）或部分覆盖对象 */
    locale?: JeLocaleInput
  }>(),
  { locale: undefined },
)

/*
 * 自身没传就落到内置缺省 'default'（uni 端没有应用级单例，回退链到这里就到底）。
 * 用 computed 而不是直接取值：与主库一致，让「后续改 size」时已经渲染的子树能响应式跟随。
 */
provide(jeConfigKey, {
  size: computed<JeConfigSize>(() => props.size ?? 'default'),
})

/** 语言通道与主库一致：交给 JeLocale 的 provideJeLocale，会与祖先语言包合并 */
provideJeLocale(() => props.locale)

/**
 * 键名兼容 `primary` 与 `--je-primary` 两种写法。
 *
 * 【主题变量落地 —— uni 与主库的关键差异】
 * 主库把变量写在这层包裹 div 的内联 style 上（只影响子树，见 AGENTS 陷阱 17）。
 * 小程序端没有 `document` / `:root`，而 CSS 自定义属性在 H5 与小程序端都支持**继承**，
 * 所以这里把同一份变量写在组件根 `<view>` 的内联 style 上，靠继承向下生效 —— 两端同一套写法。
 * 不需要（也不应）额外写 `document.documentElement`：主库正是刻意把 ConfigProvider.theme
 * 定位成「子树局部覆盖」（全局那层走 theme.ts / configureJelly）；且小程序端浮层全部就地渲染在
 * 组件树内（无 Teleport），子树内的浮层天然吃得到这份变量。
 */
const themeStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  for (const [key, value] of Object.entries(props.theme ?? {})) {
    style[key.startsWith('--') ? key : `--je-${key}`] = value
  }
  return style
})
</script>

<template>
  <view class="je-config-provider" :style="themeStyle">
    <slot />
  </view>
</template>

<style scoped>
/* 纯包裹层：H5 用 display: contents 把自己从布局里摘掉，不额外多一层盒子；
   小程序不认这个值，退化成块级盒子（不影响内部布局）。
   正因根节点是包裹层，**不能**加 options: { virtualHost: true } —— 那会抽掉包裹层，
   连同内联的主题变量一起丢掉「向下继承」的语义。 */
/* #ifdef H5 */
.je-config-provider {
  display: contents;
}
/* #endif */
/* #ifndef H5 */
.je-config-provider {
  display: block;
}
/* #endif */
</style>
