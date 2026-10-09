/*
 * 文档站的数据来源：演示页源码本身。
 *
 * 用 `?raw` 把 pages/demo/*.vue 的原文**按需**读进来（非 eager，避免 94 份源码全塞进主包），
 * 再从中抽出「说明」与「示例代码」。这样文档内容与演示页面永远是同一份，
 * 改演示页即改文档，不需要另外维护一套示例。
 */

/** route（'button'）→ 该演示页源码的加载器（'../demo/button.vue'） */
const loaders = import.meta.glob<string>('../demo/*.vue', {
  query: '?raw',
  import: 'default',
})

const loaderByRoute = new Map<string, () => Promise<string>>()
for (const [path, load] of Object.entries(loaders)) {
  const file = path.slice(path.lastIndexOf('/') + 1)
  loaderByRoute.set(file.replace(/\.vue$/, ''), load)
}

/** 读某个组件的演示页源码；没有对应页面时返回空串 */
export async function loadDemoSource(route: string): Promise<string> {
  const load = loaderByRoute.get(route)
  if (!load) return ''
  try {
    return await load()
  } catch {
    // 单个文件读取失败不应该让整页塌掉，退回空内容
    return ''
  }
}

/** 去掉公共缩进与首尾空行，得到可直接展示的代码片段 */
function dedent(text: string): string {
  const lines = text.replace(/\t/g, '  ').split('\n')
  while (lines.length && !lines[0]?.trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop()
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.length - line.trimStart().length)
  const min = indents.length ? Math.min(...indents) : 0
  return lines.map((line) => line.slice(min)).join('\n')
}

/**
 * 演示页主体：`<scroll-view class="doc__body">` 里的内容，也就是真正的示例。
 * 页面里那一圈 `.doc` / `.doc__bar` / `<scroll-view>` 是演示站外壳，
 * 抄进业务代码没有意义，这里只取里面的组件用法。
 */
export function demoTemplateOf(source: string): string {
  const marker = source.indexOf('="doc__body"')
  if (marker === -1) return ''
  const tagEnd = source.indexOf('>', marker)
  const close = source.indexOf('</scroll-view>', tagEnd)
  if (tagEnd === -1 || close === -1) return ''
  return dedent(source.slice(tagEnd + 1, close))
}
