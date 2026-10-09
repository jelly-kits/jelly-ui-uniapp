# Jelly UI · uni-app 版

面向 uni-app 的跨端组件库：一套 Vue 3 + TypeScript 源码，可编译到微信小程序、H5、App（Android / iOS）与鸿蒙。

每个组件一个目录、目录名即标签名（如 `je-button/je-button.vue`），配合 uni-app 的 easycom 可在模板里零 import 直接使用；也能按单个组件手动引入。

## 链接

- GitHub 源码：<https://github.com/jelly-kits/jelly-ui-uniapp>
- uni-app 版在线文档：<https://jelly-kits.github.io/jelly-ui-uniapp/>
- H5 版在线文档：<https://jelly-kits.github.io/jelly-ui/>

## 特性

- 一套源码跨端，微信小程序、H5、App 与鸿蒙同源
- 93 个组件，覆盖基础、布局、表单、数据展示、导航、反馈、浮层、工程能力
- 配合 easycom 按需加载，编译时只打进真正用到的组件
- 设计 token 全部暴露为 `--je-*` CSS 变量，覆盖变量即可换肤
- TypeScript 编写，内置 `zh-CN` / `en-US` 语言包，支持注册自定义语言

## 安装

要求一套 uni-app（Vue 3）工程，HBuilderX 或 CLI 均可。

```bash
npm install @jelly-kits/jelly-ui-uniapp
```

安装后在入口文件 `main.ts` 引入一次主题样式：

```ts
// src/main.ts
import '@jelly-kits/jelly-ui-uniapp/theme/variables.css'
```

## 使用

### 全量导入（easycom，推荐）

在 `pages.json` 里用 easycom 自定义规则，把 `je-*` 标签映射到包内组件目录。配置一次后，全库组件在任意页面直接可用，业务文件不必逐个 import：

```json
// pages.json
{
  "easycom": {
    "custom": {
      "^je-(.*)": "@jelly-kits/jelly-ui-uniapp/components/je-$1/je-$1.vue"
    }
  }
}
```

之后模板里直接写标签即可：

```vue
<template>
  <je-button type="primary">果冻按钮</je-button>
</template>
```

### 单个组件导入

不想开 easycom，或想在某个页面里显式声明依赖时，直接 import 包内对应组件的 `.vue` 文件：

```vue
<script setup lang="ts">
import JeButton from '@jelly-kits/jelly-ui-uniapp/components/je-button/je-button.vue'
</script>

<template>
  <je-button type="primary">果冻按钮</je-button>
</template>
```

手动 import 与 easycom 可以混用；同名标签同时存在时，以页面里显式导入的为准。

## App 打包

除 H5 与微信小程序外，同一套源码也可编译到 App（Android / iOS）与鸿蒙。平台运行时由宿主 uni-app 工程提供，本包只发布组件源码，不携带原生依赖。

### 命令

| 目标 | 开发 | 构建 |
| --- | --- | --- |
| App（Android / iOS） | `npm run dev:app` | `npm run build:app` |
| 鸿蒙 HarmonyOS | `npm run dev:app-harmony` | `npm run build:app-harmony` |

Android 与 iOS 在 uni-app（Vue 3）里同属 `app` 平台，命令行不区分，无法拆成两条命令。

### 构建产物不是安装包

`npm run build:app` 只是把源码编译成 App 资源包（输出到 `dist/build/app`），**不是 APK / IPA**。要拿到安装包还需要：

1. 在 [DCloud 开发者中心](https://dev.dcloud.net.cn/) 申请应用 `appid`，填入 `manifest.json` 的 `appid` 字段；
2. 用 HBuilderX 打开工程，走「发行 → 原生 App → 云打包」；离线打包 SDK 与 HBuilderX CLI 的 `pack` 命令（便于接入 CI）同样可行；
3. 鸿蒙需 HBuilderX 配合 DevEco Studio 出包。

App 侧配置写在 `manifest.json` 的 `app-plus` 节点（`usingComponents` / `splashscreen` / `distribute` 等）；鸿蒙对应 `app-harmony` 节点，未配置时按默认值处理。

### 平台差异

组件对 DOM 的依赖都做了条件编译：`#ifdef H5` 走 DOM 分支，其余平台走无 DOM 分支（Canvas 等能力会自动降级）。App 端与小程序端共用同一套非 H5 分支。

## 许可证

[MIT](./LICENSE)
