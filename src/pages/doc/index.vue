<script setup lang="ts">
/*
 * H5 文档站：左侧菜单 / 中间总览·说明·示例代码·API / 右侧手机预览。
 *
 * 本页只在 H5 端注册（见 pages.json 的条件编译），小程序端不参与构建，
 * 所以这里可以放心用 <iframe> / <pre> / <table> 这类浏览器标签。
 *
 * 内容全部来自源码与目录数据，不另写一份：
 *   - 菜单与说明取 pages/index/sections.ts
 *   - 示例代码从 pages/demo/*.vue 的源码里抽（见 docSource.ts）
 *   - API 表格由 uni/scripts/gen-api.mjs 生成（见 api-data.ts）
 *   - 右侧 iframe 直接跑同一份演示页
 */
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useDocTheme } from '../../theme/useTheme'
import { sectionGroups } from '../index/sections'
import { componentApi, routeApi } from './api-data'
import type { ComponentApi } from './api-data'
import { demoTemplateOf, loadDemoSource } from './docSource'
import {
  easycomAutoscanSnippet,
  easycomCustomSnippet,
  installSnippet,
  singleImportSnippet,
  styleSnippet,
  usageSnippet,
} from './installSnippets'

/** 空字符串代表「总览」，其余为组件路由 */
const OVERVIEW = ''

/** 「安装」页：非总览、非组件的独立说明页 */
const INSTALL = 'install'

const items = sectionGroups.flatMap((group) =>
  group.items.map((item) => ({
    route: item.route,
    title: item.title,
    desc: item.desc,
  })),
)

const componentCount = items.length

/**
 * 菜单里的组件代码名：由 api-data.ts 的 routeApi 派生（je-button → Button），
 * 不在 sections.ts 里再维护一份。一个页面挂多个组件时取第一个，
 * 足够提示「这页讲的是哪个组件」。
 *
 * 少数页面（如「主题」）是纯说明页，没有对应组件，退化成路由名首字母大写
 * （theme → Theme）—— 菜单里各项都是「英文名 + 中文名」，不因为它是说明页就少一段。
 */
const codeNameOf = (route: string) => {
  const tag = routeApi[route]?.[0]
  const name = tag ? tag.replace(/^je-/, '') : route
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

const current = ref(OVERVIEW)
const isOverview = computed(() => current.value === OVERVIEW)
const isInstall = computed(() => current.value === INSTALL)
/** 是否停在某个组件的文档页：只有这时才需要源码与 API 表格 */
const isComponent = computed(() => !isOverview.value && !isInstall.value)

/** 菜单搜索：按标题跨分组过滤，与目录页同一套逻辑 */
const query = ref('')

const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return sectionGroups
  return sectionGroups
    .map((group) => ({
      title: group.title,
      items: group.items.filter(
        (item) =>
          item.title.toLowerCase().includes(keyword) ||
          codeNameOf(item.route).toLowerCase().includes(keyword),
      ),
    }))
    .filter((group) => group.items.length > 0)
})

const currentItem = computed(() => items.find((item) => item.route === current.value) ?? null)

/* --------------------------------- 源码 --------------------------------- */

const source = ref('')

watch(
  current,
  async (route) => {
    source.value = ''
    if (isComponent.value) source.value = await loadDemoSource(route)
  },
  { immediate: true },
)

/** 默认只给演示页主体，勾选后展示整个页面文件 */
const showFull = ref(false)
const code = computed(() => (showFull.value ? source.value : demoTemplateOf(source.value)))

/** 当前处于「已复制」提示态的目标：'' 无、'code' 示例代码、'install' 安装命令 */
const copiedKey = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined

/** 复制任意文本，key 用于区分是哪个按钮给出反馈 */
const copyText = async (text: string, key: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 非安全上下文（如 http 访问）下 clipboard 不可用，退回临时 textarea
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
  }
  copiedKey.value = key
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copiedKey.value = ''
  }, 1500)
}

/** 复制当前组件的示例代码 */
const copy = () => copyText(code.value, 'code')

/* ---------------------------------- API ---------------------------------- */

/** 当前页要展示 API 的组件标签，顺序由生成脚本决定 */
const apiTags = computed(() => (isComponent.value ? (routeApi[current.value] ?? []) : []))

/** 没有内容的整组不渲染 */
const apiGroups = (api: ComponentApi) =>
  [
    { key: 'attributes', title: '属性 Attributes', withDefault: true, rows: api.attributes },
    { key: 'events', title: '事件 Events', withDefault: false, rows: api.events },
    { key: 'slots', title: '插槽 Slots', withDefault: false, rows: api.slots },
    { key: 'exposes', title: '可调用函数 Exposes', withDefault: false, rows: api.exposes },
  ].filter((group) => group.rows.length > 0)

/* --------------------------------- 预览 --------------------------------- */

/*
 * 右侧 iframe 指回本应用自身。`preview=1` 由 main.ts 识别，
 * 给 <html> 打上 .je-preview，配合 theme/demo.css 隐藏演示页的顶栏外壳。
 * 只改 hash 时浏览器做的是「同文档片段导航」，iframe 不会重新加载。
 */
const previewSrc = computed(() =>
  isComponent.value
    ? `#/pages/demo/${current.value}?preview=1`
    : '#/pages/index/index?preview=1',
)

/** 窄屏抽屉菜单开关；桌面端不显示顶栏，此状态不会被触发 */
const menuOpen = ref(false)

const closeMenu = () => {
  menuOpen.value = false
}

/** 窄屏顶栏标题：总览 / Install 安装 / 组件名 */
const pageTitle = computed(() => {
  if (isOverview.value) return '总览'
  if (isInstall.value) return 'Install 安装'
  return currentItem.value?.title ?? ''
})

/**
 * 把当前页写回地址栏 —— 刷新或分享后能停在同一页。
 * 用 replaceState 而非 pushState：文档站内部切换不往浏览器历史里塞记录，
 * 也不会触发 uni 的 hashchange / popstate 监听而导致重新路由。
 */
const syncUrl = (route: string) => {
  if (typeof window === 'undefined') return
  const hash = `#/pages/doc/index${route ? `?route=${route}` : ''}`
  const { pathname, search } = window.location
  window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`)
}

const select = (route: string) => {
  current.value = route
  closeMenu()
  syncUrl(route)
}

/* --------------------------------- 外链 --------------------------------- */

/** 仓库与在线文档：总览页顶部的两个外链入口 */
const GITHUB_URL = 'https://github.com/jelly-kits/jelly-ui-uniapp'
const DOCS_URL = 'https://jelly-kits.github.io/jelly-ui/'

const openLink = (url: string) => {
  // 本页只在 H5 端注册，直接用 window 打开新标签即可
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
}

/**
 * 演示入口页是独立页面（容器：pages/demo/index），不走文档站内部状态。
 * 同样另开标签页：在文档站里跳走会把正在看的文档顶掉。
 */
const openDemoEntry = () => {
  if (typeof window === 'undefined') return
  // H5 是 hash 路由，按 syncUrl 的写法拼出要打开的地址
  const { pathname, search } = window.location
  window.open(`${pathname}${search}#/pages/demo/index`, '_blank', 'noopener')
}

/* --------------------------------- 主题 --------------------------------- */

const { isDark, setMode } = useDocTheme()

const toggleDark = () => {
  setMode(isDark.value ? 'light' : 'dark')
}

/* --------------------------------- 深链 --------------------------------- */

/** `#/pages/doc/index?route=button` 可直接定位到某个组件，`route=install` 定位到安装页 */
onLoad((options) => {
  const route = options?.route
  if (typeof route !== 'string') return
  if (route === INSTALL || items.some((item) => item.route === route)) current.value = route
})
</script>

<template>
  <view
    class="docsite"
    :class="[jeThemeClass, { 'docsite--menu-open': menuOpen }]"
    :style="jeThemeVars"
  >
    <!-- 窄屏顶栏：桌面端隐藏，移动端提供菜单入口与返回总览 -->
    <view class="docsite__topbar">
      <view
        v-if="!isOverview"
        class="docsite__topbar-btn"
        role="button"
        aria-label="返回总览"
        @tap="select(OVERVIEW)"
      >
        <je-icon name="arrow-left" :size="20" />
      </view>
      <view
        class="docsite__topbar-btn"
        role="button"
        aria-label="打开菜单"
        @tap="menuOpen = true"
      >
        <je-icon name="menu" :size="20" />
      </view>
      <text class="docsite__topbar-title">{{ pageTitle }}</text>
      <view
        class="docsite__topbar-btn"
        role="button"
        :aria-label="isDark ? '切换到浅色' : '切换到深色'"
        @tap="toggleDark"
      >
        <je-icon :name="isDark ? 'sun' : 'moon'" :size="18" />
      </view>
    </view>

    <!-- 抽屉打开时的遮罩：点击关闭 -->
    <view v-if="menuOpen" class="docsite__mask" @tap="closeMenu" />

    <view class="docsite__sidebar">
      <view class="docsite__brand">
        <view class="docsite__logo je-logo" />
        <text class="docsite__brand-name">Jelly UI</text>
        <view
          class="docsite__theme"
          role="button"
          :aria-label="isDark ? '切换到浅色' : '切换到深色'"
          @tap="toggleDark"
        >
          <je-icon :name="isDark ? 'sun' : 'moon'" :size="18" />
        </view>
      </view>

      <view class="docsite__search">
        <je-input v-model="query" placeholder="搜索组件" prefix-icon="search" clearable />
      </view>

      <view class="docsite__menu">
        <text
          class="docsite__item docsite__item--overview"
          :class="{ 'docsite__item--active': isOverview }"
          @tap="select(OVERVIEW)"
          >总览</text
        >
        <text
          class="docsite__item docsite__item--overview"
          :class="{ 'docsite__item--active': isInstall }"
          @tap="select(INSTALL)"
          >Install 安装</text
        >
        <view v-for="group in filteredGroups" :key="group.title" class="docsite__group">
          <text class="docsite__group-title">{{ group.title }}</text>
          <text
            v-for="item in group.items"
            :key="item.route"
            class="docsite__item"
            :class="{ 'docsite__item--active': item.route === current }"
            @tap="select(item.route)"
          ><text v-if="codeNameOf(item.route)" class="docsite__item-code">{{ codeNameOf(item.route) }}</text>{{ item.title }}</text>
        </view>
      </view>
    </view>

    <view class="docsite__main">
      <!-- 总览：整库一览，卡片可直达对应组件 -->
      <view v-if="isOverview" class="docsite__article">
        <view class="docsite__hero">
          <text class="docsite__hero-title">Jelly UI</text>
          <text class="docsite__hero-desc">
            面向 uni-app 的跨端组件库，共 {{ componentCount }} 个组件，微信小程序与 H5 同源。
          </text>
          <view class="docsite__hero-links">
            <view class="docsite__hero-link" @tap="openLink(GITHUB_URL)">
              <je-icon name="github" :size="16" />
              <text class="docsite__hero-link-text">GitHub 源码</text>
            </view>
            <view class="docsite__hero-link" @tap="openDemoEntry">
              <je-icon name="play" :size="16" />
              <text class="docsite__hero-link-text">组件演示</text>
            </view>
            <view class="docsite__hero-link" @tap="openLink(DOCS_URL)">
              <je-icon name="external-link" :size="16" />
              <text class="docsite__hero-link-text">H5 版文档</text>
            </view>
          </view>
        </view>
        <view v-for="group in sectionGroups" :key="group.title" class="docsite__ov-group">
          <text class="docsite__ov-group-title">{{ group.title }}</text>
          <view class="docsite__ov-cards">
            <view
              v-for="item in group.items"
              :key="item.route"
              class="docsite__ov-card"
              @tap="select(item.route)"
            >
              <text class="docsite__ov-title">{{ item.title }}</text>
              <text class="docsite__ov-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 安装：在 uni-app 里如何引入本组件库 -->
      <view v-else-if="isInstall" class="docsite__article">
        <text class="docsite__title">Install 安装</text>
        <text class="docsite__desc">
          Jelly UI 的 uni-app 版是跨端组件库：每个组件一个
          <text class="docsite__ic">je-&lt;name&gt;/je-&lt;name&gt;.vue</text>
          目录，目录名即标签名。配合 uni-app 的 easycom 可以零 import 使用，也能按单个组件手动引入。
        </text>

        <view class="docsite__section">
          <text class="docsite__section-title">安装</text>
          <view class="docsite__prose">
            <text class="docsite__p">
              1. 准备一套 uni-app（Vue 3）工程，HBuilderX 或 CLI 都可以。
            </text>
            <text class="docsite__p">2. 安装组件库：</text>
            <view class="docsite__code-block">
              <view class="docsite__code-head">
                <text class="docsite__code-label">bash</text>
                <text class="docsite__copy" @tap="copyText(installSnippet, 'install')">
                  {{ copiedKey === 'install' ? '已复制' : '复制' }}
                </text>
              </view>
              <pre class="docsite__code">{{ installSnippet }}</pre>
            </view>
            <text class="docsite__p">
              3. 在 <text class="docsite__ic">main.ts</text> 里引入一次主题样式；设计 token 都在包内的
              <text class="docsite__ic">theme/variables.css</text> 里，覆盖
              <text class="docsite__ic">--je-*</text> 变量即可换肤。
            </text>
            <pre class="docsite__code">{{ styleSnippet }}</pre>
          </view>
        </view>

        <view class="docsite__section">
          <text class="docsite__section-title">全量导入（easycom，推荐）</text>
          <view class="docsite__prose">
            <text class="docsite__p">
              uni-app 的 easycom 能让 <text class="docsite__ic">je-*</text> 标签免 import 直接使用。
              用自定义规则把标签映射到包内的组件目录后，全库组件在任意页面直接可用，业务文件不必逐个
              import；编译时仍只打进真正用到的组件。
            </text>
            <pre class="docsite__code">{{ easycomCustomSnippet }}</pre>
            <text class="docsite__p">
              若改成把组件源码放进工程 <text class="docsite__ic">src/components/</text> 里用（而不是从 npm 引入），
              打开自动扫描即可，不必再写自定义规则：
            </text>
            <pre class="docsite__code">{{ easycomAutoscanSnippet }}</pre>
            <text class="docsite__p">之后模板里直接写标签即可：</text>
            <pre class="docsite__code">{{ usageSnippet }}</pre>
          </view>
        </view>

        <view class="docsite__section">
          <text class="docsite__section-title">单个组件导入</text>
          <view class="docsite__prose">
            <text class="docsite__p">
              不想开 easycom、或想在某个页面里显式声明依赖时，直接 import 包内对应组件的
              <text class="docsite__ic">.vue</text> 文件，脚本注册、模板使用：
            </text>
            <pre class="docsite__code">{{ singleImportSnippet }}</pre>
            <text class="docsite__p">
              手动 import 与 easycom 可以混用；同名标签同时存在时，以页面里显式导入的为准。
            </text>
          </view>
        </view>
      </view>

      <!-- 单个组件：说明 + 示例代码 + API -->
      <view v-else class="docsite__article">
        <text class="docsite__title">{{ currentItem?.title }}</text>
        <text v-if="currentItem?.desc" class="docsite__desc">{{ currentItem.desc }}</text>

        <view class="docsite__section">
          <view class="docsite__section-head">
            <text class="docsite__section-title">示例代码</text>
            <view class="docsite__tools">
              <text class="docsite__link" @tap="showFull = !showFull">
                {{ showFull ? '收起完整源码' : '查看完整源码' }}
              </text>
              <text class="docsite__copy" @tap="copy">{{ copiedKey === 'code' ? '已复制' : '复制' }}</text>
            </view>
          </view>
          <pre v-if="code" class="docsite__code">{{ code }}</pre>
          <text v-else class="docsite__empty">该组件暂无可展示的示例代码</text>
        </view>

        <view v-for="tag in apiTags" :key="tag" class="docsite__section">
          <text class="docsite__section-title">API · {{ tag }}</text>
          <view
            v-for="group in apiGroups(componentApi[tag])"
            :key="group.key"
            class="docsite__api-group"
          >
            <text class="docsite__api-group-title">{{ group.title }}</text>
            <view class="docsite__table-wrap">
              <table class="docsite__table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>说明</th>
                    <th>类型</th>
                    <th v-if="group.withDefault">默认值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in group.rows" :key="row.name">
                    <td class="docsite__table-name">{{ row.name }}</td>
                    <td>{{ row.description || '—' }}</td>
                    <td class="docsite__table-code">{{ row.type || '—' }}</td>
                    <td v-if="group.withDefault" class="docsite__table-code">
                      {{ row.default || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="docsite__preview">
      <view class="docsite__phone">
        <iframe class="docsite__frame" :src="previewSrc" title="组件预览" />
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 桌面文档站布局：仅 H5 端使用，故直接按桌面断点写三栏 */

.docsite {
  display: flex;
  box-sizing: border-box;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(160deg, var(--je-bg-page-from), var(--je-bg-page-to));
  color: var(--je-text);
  /*
   * uni-app H5 端在 html/body 上内置了 user-select: none（模仿原生 App 的手感），
   * 会一路继承下来，导致说明文字选不中、示例代码也没法手动选中复制。
   * 文档站需要可选中，这里显式放开；右侧手机预览是独立文档，不受影响。
   */
  -webkit-user-select: text;
  user-select: text;
}

/* ---------- 窄屏顶栏（桌面端隐藏） ---------- */

.docsite__topbar {
  display: none;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  height: 52px;
  padding: 0 8px;
  background: var(--je-popup);
  border-bottom: var(--je-border);
}

.docsite__topbar-btn {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--je-text);
  cursor: pointer;
  border-radius: 9px;
}

.docsite__topbar-btn:hover {
  background: var(--je-surface-hover);
}

.docsite__topbar-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: var(--je-text);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 抽屉遮罩：只在窄屏打开菜单时渲染并显示 */
.docsite__mask {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 25;
  background: rgba(0, 0, 0, 0.4);
}

/* ---------- 左侧菜单 ---------- */

.docsite__sidebar {
  display: flex;
  flex: 0 0 250px;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  overflow: hidden;
  background: var(--je-popup);
  border-right: var(--je-border);
}

.docsite__brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  height: 58px;
  padding: 0 16px;
  border-bottom: var(--je-border);
}

.docsite__logo {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
}

.docsite__brand-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--je-text);
}

.docsite__theme {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--je-text);
  border-radius: 9px;
  cursor: pointer;
}

.docsite__theme:hover {
  background: var(--je-surface-hover);
}

.docsite__search {
  flex: 0 0 auto;
  padding: 12px 12px 4px;
}

.docsite__menu {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px 24px;
}

.docsite__group {
  margin-top: 12px;
}

.docsite__group-title {
  display: block;
  padding: 6px 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text-muted);
}

.docsite__item {
  display: block;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--je-text-muted);
  border-radius: 8px;
  cursor: pointer;
}

.docsite__item-code {
  margin-right: 6px;
  font-size: 12px;
  color: var(--je-text-faint);
}

/* 选中项底色是渐变，代码名跟着正文走浅色，只用透明度拉开层次 */
.docsite__item--active .docsite__item-code {
  color: inherit;
  opacity: 0.75;
}

.docsite__item:hover {
  background: var(--je-surface);
  color: var(--je-text);
}

.docsite__item--active {
  color: var(--je-text-on-color);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

.docsite__item--overview {
  font-weight: 600;
}

/* ---------- 中间内容 ---------- */

.docsite__main {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
}

.docsite__article {
  box-sizing: border-box;
  max-width: 820px;
  padding: 40px 40px 80px;
}

.docsite__title {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--je-text);
}

.docsite__desc {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--je-text-muted);
}

.docsite__section {
  margin-top: 28px;
}

.docsite__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.docsite__section-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--je-text);
}

.docsite__section-head .docsite__section-title {
  margin-bottom: 0;
}

.docsite__tools {
  display: flex;
  align-items: center;
  gap: 14px;
}

.docsite__link {
  font-size: 13px;
  color: var(--je-text-faint);
  cursor: pointer;
}

.docsite__link:hover {
  color: var(--je-primary);
}

.docsite__copy {
  font-size: 13px;
  font-weight: 500;
  color: var(--je-primary);
  cursor: pointer;
}

/* 带一键复制的代码块：标题行左侧标语言，右侧放复制按钮 */
.docsite__code-block {
  min-width: 0;
}

.docsite__code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.docsite__code-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--je-text-faint);
}

.docsite__code {
  box-sizing: border-box;
  margin: 0;
  padding: 16px 18px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.65;
  color: var(--je-text);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  white-space: pre;
}

.docsite__empty {
  font-size: 13px;
  color: var(--je-text-faint);
}

/* ---------- API 表格 ---------- */

.docsite__api-group {
  margin-top: 16px;
}

.docsite__api-group-title {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--je-text);
}

.docsite__table-wrap {
  overflow-x: auto;
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.docsite__table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 13px;
  line-height: 1.6;
  text-align: left;
}

.docsite__table th,
.docsite__table td {
  padding: 10px 14px;
  vertical-align: top;
  border-bottom: 1px solid var(--je-border-color);
}

.docsite__table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--je-text-muted);
  background: var(--je-surface);
  white-space: nowrap;
}

.docsite__table tbody tr:last-child td {
  border-bottom: none;
}

.docsite__table td {
  color: var(--je-text-muted);
}

.docsite__table-name {
  font-weight: 600;
  color: var(--je-text);
  white-space: nowrap;
}

.docsite__table-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: color-mix(in srgb, var(--je-primary) 45%, var(--je-text));
}

/* ---------- 总览 ---------- */

.docsite__hero {
  margin-bottom: 32px;
}

.docsite__hero-title {
  display: block;
  font-size: 30px;
  font-weight: 800;
  color: var(--je-text);
}

.docsite__hero-desc {
  display: block;
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--je-text-muted);
}

.docsite__hero-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.docsite__hero-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--je-text);
  background: var(--je-popup);
  border: var(--je-border);
  border-radius: 999px;
  cursor: pointer;
  transition: border-color var(--je-duration) ease, color var(--je-duration) ease;
}

.docsite__hero-link:hover {
  color: var(--je-primary);
  border-color: var(--je-primary);
}

.docsite__hero-link-text {
  font-size: 13px;
}

.docsite__ov-group + .docsite__ov-group {
  margin-top: 28px;
}

.docsite__ov-group-title {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--je-text-faint);
}

.docsite__ov-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}

.docsite__ov-card {
  box-sizing: border-box;
  padding: 14px 16px;
  background: var(--je-popup);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  transition: border-color var(--je-duration) ease, box-shadow var(--je-duration) ease;
}

.docsite__ov-card:hover {
  border-color: var(--je-primary);
  box-shadow: var(--je-shadow-popup);
}

.docsite__ov-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text);
}

.docsite__ov-desc {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--je-text-muted);
}

/* ---------- 安装页 ---------- */

.docsite__prose {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.docsite__p {
  display: block;
  font-size: 14px;
  line-height: 1.75;
  color: var(--je-text-muted);
}

.docsite__ic {
  padding: 1px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  color: color-mix(in srgb, var(--je-primary) 45%, var(--je-text));
  background: var(--je-surface);
  border-radius: 5px;
}

/* ---------- 右侧手机预览 ---------- */

.docsite__preview {
  display: flex;
  flex: 0 0 440px;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
  height: 100%;
  padding: 32px 24px;
  overflow: hidden;
  border-left: var(--je-border);
}

.docsite__phone {
  box-sizing: border-box;
  width: 390px;
  height: 100%;
  max-height: 780px;
  padding: 8px;
  background: var(--je-popup);
  border: var(--je-border);
  border-radius: 28px;
  box-shadow: var(--je-shadow-popup);
}

.docsite__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 20px;
  background: var(--je-bg-page-from);
}

/* ---------- 窄屏收起 ---------- */

@media (max-width: 1200px) {
  .docsite__preview {
    display: none;
  }
}

@media (max-width: 860px) {
  /* 窄屏改上下结构：顶栏固定占一行，主内容吃满剩余高度并独立滚动 */
  .docsite {
    flex-direction: column;
  }

  .docsite__topbar {
    display: flex;
  }

  .docsite__main {
    flex: 1 1 0;
    height: auto;
  }

  .docsite__article {
    padding: 24px 20px 64px;
  }

  /* 侧边栏收成左侧抽屉，默认移出视口，打开时滑入 */
  .docsite__sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    width: 250px;
    max-width: 82vw;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
  }

  .docsite--menu-open .docsite__sidebar {
    transform: translateX(0);
    box-shadow: 0 0 32px rgba(0, 0, 0, 0.28);
  }

  .docsite__mask {
    display: block;
  }
}
</style>
