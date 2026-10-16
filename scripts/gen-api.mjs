/**
 * 从 uni 版组件源码自动提取 API（属性 / 事件 / 插槽 / 可调用函数），
 * 生成 src/pages/doc/api-data.ts，供 H5 文档站渲染 API 表格。
 *
 * 用法：npm run gen:api（在 uni/ 目录下）
 *
 * 提取逻辑复用仓库根部的 scripts/api-extract.mjs，与主库的 gen-api.mjs 是同一份实现。
 * 本文件只负责：扫组件目录 → 把演示页路由和组件对上 → 写文件。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { collectTypeSources, extractApi, scriptOf } from '../../scripts/api-extract.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const COMPONENTS_DIR = join(ROOT, 'src', 'components')
const DEMO_DIR = join(ROOT, 'src', 'pages', 'demo')
const OUT_FILE = join(ROOT, 'src', 'pages', 'doc', 'api-data.ts')

const read = (path) => readFileSync(path, 'utf8')

/**
 * 一个演示页常常覆盖多个组件。路由名能对上主组件（je-<route>）的走下面的推导；
 * 对不上的（下面的键）在这里显式列出，顺序即文档里的展示顺序。
 */
const ROUTE_OVERRIDES = {
  'tag-badge': ['je-tag', 'je-badge'],
  container: ['je-container', 'je-header', 'je-aside', 'je-main', 'je-footer'],
  'layout-grid': ['je-row', 'je-col'],
  'checkbox-radio': ['je-checkbox-group', 'je-radio-group'],
  'switch-segmented': ['je-switch', 'je-segmented'],
  'stepper-rate': ['je-stepper', 'je-rate'],
  'tabs-editable': ['je-tabs', 'je-tab-pane', 'je-tab'],
  'tab-swipe': ['je-tabs', 'je-tab-pane', 'je-tab'],
  'nav-bar-tabbar': ['je-nav-bar', 'je-tabbar', 'je-tabbar-item'],
  menu: ['je-menu', 'je-menu-item', 'je-sub-menu'],
  'index-bar': ['je-index-bar', 'je-index-anchor'],
  'table-card': ['je-table'],
  'table-grid': ['je-table'],
  'alert-result': ['je-alert', 'je-result'],
  'message-notification': ['je-message', 'je-notification'],
  'block-editor': ['je-block-editor', 'je-block-view'],
  // 「主题」页讲的是主题系统本身，没有对应的组件 API
  theme: [],
}

/** 组件目录名即组件标签名（je-button/je-button.vue），文件名与目录名不一致的（如 dialog-host）不算组件 */
const collectComponents = () => {
  const list = []
  for (const dir of readdirSync(COMPONENTS_DIR).sort()) {
    if (!dir.startsWith('je-')) continue
    const file = join(COMPONENTS_DIR, dir, `${dir}.vue`)
    if (!existsSync(file)) continue
    const source = read(file)
    list.push({
      tag: dir,
      api: extractApi(source, collectTypeSources(scriptOf(source), join(COMPONENTS_DIR, dir))),
    })
  }
  return list
}

/** 演示页文件名即路由名（pages/demo/button.vue → pages/demo/button） */
const collectRoutes = () =>
  readdirSync(DEMO_DIR)
    .filter((file) => file.endsWith('.vue'))
    .map((file) => file.replace(/\.vue$/, ''))
    .sort()

/** 演示页里实际用到的组件标签 */
const usedTagsOf = (route) => {
  const source = read(join(DEMO_DIR, `${route}.vue`))
  return new Set([...source.matchAll(/<(je-[a-z0-9-]+)/g)].map((match) => match[1]))
}

const components = collectComponents()
const apiByTag = new Map(components.map((item) => [item.tag, item.api]))
const allTags = components.map((item) => item.tag)
const tagSet = new Set(allTags)

/**
 * 主组件 je-<route>，再加上「同族且演示页里真的用到」的子组件。
 * 同族 = 同名 / 同前缀，以及去掉复数 s 后的同名 / 同前缀
 * （je-tabs → je-tab、je-tab-pane；je-steps → je-step）。
 */
const familyOf = (main) => {
  const singular = main.endsWith('s') ? main.slice(0, -1) : main
  return allTags.filter(
    (tag) =>
      tag === main ||
      tag.startsWith(`${main}-`) ||
      tag === singular ||
      tag.startsWith(`${singular}-`),
  )
}

const resolveComponents = (route, usedTags) => {
  const override = ROUTE_OVERRIDES[route]
  if (override) return override.filter((tag) => tagSet.has(tag))

  const primary = `je-${route}`
  if (!tagSet.has(primary)) return []
  const extra = familyOf(primary).filter((tag) => tag !== primary && usedTags.has(tag))
  return [primary, ...extra]
}

const routeApi = {}
for (const route of collectRoutes()) {
  const names = resolveComponents(route, usedTagsOf(route))
  if (names.length) routeApi[route] = names
}

const componentApi = {}
for (const tag of allTags) {
  if (Object.values(routeApi).some((names) => names.includes(tag))) {
    componentApi[tag] = apiByTag.get(tag)
  }
}

const output = `/**
 * 本文件由 uni/scripts/gen-api.mjs 自动生成，请勿手动修改。
 * 重新生成：cd uni && npm run gen:api
 */

/** 一行 API 记录，四个分组共用 */
export interface ApiRow {
  name: string
  /** 说明：组件源码里的 JSDoc 优先，没写时取 scripts/api-glossary.mjs 的通用说明 */
  description?: string
  /** 类型签名 */
  type?: string
  /** 默认值，仅属性有 */
  default?: string
}

export interface ComponentApi {
  attributes: ApiRow[]
  events: ApiRow[]
  slots: ApiRow[]
  exposes: ApiRow[]
}

/** 组件标签名（je-button）→ API */
export const componentApi: Record<string, ComponentApi> = ${JSON.stringify(componentApi, null, 2)}

/** 演示页路由（button）→ 该页要展示 API 的组件标签名（顺序即展示顺序） */
export const routeApi: Record<string, string[]> = ${JSON.stringify(routeApi, null, 2)}
`

writeFileSync(OUT_FILE, output, 'utf8')

const rowCount = Object.values(componentApi).reduce(
  (total, api) =>
    total + api.attributes.length + api.events.length + api.slots.length + api.exposes.length,
  0,
)
console.log(
  `已生成 src/pages/doc/api-data.ts：${Object.keys(componentApi).length} 个组件、${rowCount} 条 API、${Object.keys(routeApi).length} 条路由映射`,
)
