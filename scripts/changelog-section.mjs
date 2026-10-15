/*
 * 从 CHANGELOG.md 里抽出指定版本的更新说明，供发版工作流生成 GitHub Release。
 *
 * 用法（在项目根目录）：
 *   node scripts/changelog-section.mjs 0.2.0     # 也可以写 v0.2.0
 * 输出：`## 0.2.0` 这一节到下一个二级标题之间的正文（不含标题本身），直接写 stdout。
 * 退出码：找不到该版本、或小节为空时为 1，正常为 0。
 *
 * 发版流程见 PUBLISHING.md：先把「未发布」改成实际版本号，再 npm version。
 */
import { readFileSync } from 'node:fs'

const version = (process.argv[2] ?? '').replace(/^v/, '')
if (!version) {
  console.error('用法：node scripts/changelog-section.mjs <版本号>')
  process.exit(1)
}

/** 二级标题才算版本分隔（`### 新增` 这类分类标题不算） */
const isVersionHeading = (line) => line.startsWith('## ') && !line.startsWith('### ')

const lines = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/)
const start = lines.findIndex(
  (line) => isVersionHeading(line) && line.slice(3).trim().replace(/^v/, '') === version,
)
if (start === -1) {
  console.error(`CHANGELOG.md 里没有 ${version} 的小节 —— 发版前记得先把「未发布」改成版本号。`)
  process.exit(1)
}

const next = lines.findIndex((line, i) => i > start && isVersionHeading(line))
const body = lines.slice(start + 1, next === -1 ? lines.length : next).join('\n').trim()
if (!body) {
  console.error(`CHANGELOG.md 里 ${version} 的小节是空的，Release 说明不能为空。`)
  process.exit(1)
}

process.stdout.write(`${body}\n`)
