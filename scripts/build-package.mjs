/*
 * 生成 npm 发布用的目录结构。
 *
 * 发布包要求 `components/` 与 `theme/` 位于包根（见 README 里的导入路径），
 * 而源码都在 `src/` 下，所以发布前把它们复制到包根一份。
 * 组件内部用的是相对引用（`../../core/*`、`../je-xxx/*`），
 * 复制后层级关系不变，这些引用依然成立。
 *
 * 由 package.json 的 prepack 钩子自动调用，也可以手动 `npm run build:pkg`。
 */
import { cp, mkdir, rm } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** src 下的相对路径 → 绝对路径 */
const fromSrc = (path) => resolve(root, 'src', path)

/** 包根下的相对路径 → 绝对路径 */
const fromRoot = (path) => resolve(root, path)

/** doc-theme-* 是文档站自用组件，不属于组件库，不随包发布 */
const isDocOnly = (source) => basename(source).startsWith('doc-theme-')

/** 每次发布会重新生成的产物目录（与 package.json 的 files 对应） */
const generated = ['components', 'core', 'theme']

async function build() {
  // 先清掉上一轮产物，避免已删除的组件残留在包里
  for (const name of generated) {
    await rm(fromRoot(name), { recursive: true, force: true })
  }

  await cp(fromSrc('components'), fromRoot('components'), {
    recursive: true,
    filter: (source) => !isDocOnly(source),
  })

  await cp(fromSrc('core'), fromRoot('core'), { recursive: true })

  // theme 只发布设计 token；useTheme / demo.css 是文档站用的，不进包
  await mkdir(fromRoot('theme'), { recursive: true })
  await cp(fromSrc('theme/variables.css'), fromRoot('theme/variables.css'))

  console.log(`[build-package] 已生成：${generated.join(' / ')}`)
}

build().catch((error) => {
  console.error('[build-package] 失败：', error)
  process.exitCode = 1
})
