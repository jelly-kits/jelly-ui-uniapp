<script setup lang="ts">
/*
 * 组件详情页：主题（pages/demo/theme）
 * 外壳样式与演示排版在全局 src/theme/demo.css 里，主题内核在 src/theme/useTheme.ts。
 */
import { computed } from 'vue'
import { useDocTheme } from '../../theme/useTheme'

const { mode, primary, primaryEnd, isDark } = useDocTheme()

const modeLabel = computed(
  () => ({ auto: '跟随系统', light: '浅色', dark: '深色' })[mode.value] ?? mode.value,
)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="主题" route="theme" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="主题设置" description="明暗模式 + 主色，改动即时生效并记住" inset>
        <view class="demo-block">
          <doc-theme-settings />
        </view>
      </je-cell-group>

      <je-cell-group title="当前状态" inset>
        <je-cell title="外观模式" :value="modeLabel" />
        <je-cell title="是否深色" :value="isDark ? '是' : '否'" />
        <je-cell title="主色" :value="primary" />
        <je-cell title="渐变终点" :value="primaryEnd" />
      </je-cell-group>

      <je-cell-group title="接入方式" description="两端落点不同，页面模板却可以完全一样" inset>
        <view class="demo-block">
          <je-text size="small">H5：把 --je-primary / --je-primary-end 写到 documentElement，并在 &lt;html&gt; 上打 data-theme（light / dark），深浅两套 token 已经在 theme/variables.css 里备好，跟随系统时不写这个属性即可。</je-text>
          <je-text size="small">小程序：没有 document，也没有属性选择器，深色改为在页面根节点挂 .je-theme-dark 类，主色以行内 CSS 变量下发，靠自定义属性的继承生效。</je-text>
          <je-text size="small">两端都由 main.ts 里的全局 mixin 提供 jeThemeClass / jeThemeVars 两个 computed，页面根节点写一次 :class / :style 就够了。</je-text>
          <je-text size="small">只改局部：JeConfigProvider 的 theme 也走同一批变量，可以只覆盖某一棵子树（见「全局配置」页）。</je-text>
        </view>
      </je-cell-group>
    </scroll-view>
  </view>
</template>
