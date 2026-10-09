/*
 * 「安装」页的代码片段。
 *
 * 单独放在 .ts 模块里，而不是写进 doc/index.vue 的 <script> 块：
 * 这些片段含 <template> / <script> 字面量，直接写在 .vue 里会被 SFC 解析器
 * 当成块边界（即使把 `</script>` 转义成 `<\/script>` 也一样会被误判）。
 */

/** 安装依赖 */
export const installSnippet = `npm install @jelly-kits/jelly-ui-uniapp`

/** 引入主题样式 */
export const styleSnippet = `// src/main.ts
import '@jelly-kits/jelly-ui-uniapp/theme/variables.css'`

/** easycom 打开自动扫描 —— 把组件源码放进工程 src/components/ 时用 */
export const easycomAutoscanSnippet = `// pages.json
{
  "easycom": {
    "autoscan": true
  }
}`

/** easycom 自定义规则：组件来自 npm 包时，把标签映射到包内组件目录 */
export const easycomCustomSnippet = `// pages.json
{
  "easycom": {
    "custom": {
      "^je-(.*)": "@jelly-kits/jelly-ui-uniapp/components/je-$1/je-$1.vue"
    }
  }
}`

/** 模板里直接写标签 */
export const usageSnippet = `<template>
  <je-button type="primary">果冻按钮</je-button>
</template>`

/** 单个组件手动引入 */
export const singleImportSnippet = `<script setup lang="ts">
import JeButton from '@jelly-kits/jelly-ui-uniapp/components/je-button/je-button.vue'
</script>

<template>
  <je-button type="primary">果冻按钮</je-button>
</template>`
