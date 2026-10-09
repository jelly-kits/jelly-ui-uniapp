import {
  computed,
  inject,
  provide,
  ref,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
} from 'vue'

/**
 * 语言包结构。
 *
 * 新增一条文案时要同步补齐三处：zh-CN / en-US 两套内置包，以及 fromAdapter() 里的 key 清单，
 * 否则外部适配器拿不到这一条（TypeScript 会把漏配的字段报出来）。
 */
export interface JeLocaleMessages {
  /** 语言标识 */
  name: string
  /** 通用确定 */
  confirm: string
  /** 通用取消 */
  cancel: string
  /** 通用加载中 */
  loading: string
  /** 手写签名 */
  signature: {
    clear: string
    undo: string
    tip: string
  }
  /** 分享面板 */
  shareSheet: {
    title: string
    cancel: string
  }
  /** 图片预览 */
  imagePreview: {
    close: string
    /** 索引文案模板，支持 {current} / {total} */
    index: string
  }
  /** 组织架构图 */
  orgChart: {
    /** 编辑浮层里的主标题字段名 */
    name: string
    /** 编辑浮层里的副标题字段名 */
    title: string
    /** 「添加下级」按钮 */
    addChild: string
    /** 「删除」按钮 */
    remove: string
    /** 删除有下级的节点时的二次确认文案，`{count}` 是下级数量 */
    removeConfirm: string
    /** 删除没有下级的节点时的二次确认文案 */
    removeConfirmLeaf: string
    /** 新增节点的默认名称 */
    newNode: string
  }
}

/** 简体中文（缺省语言包） */
export const jeZhCN: JeLocaleMessages = {
  name: 'zh-CN',
  confirm: '确定',
  cancel: '取消',
  loading: '加载中...',
  signature: {
    clear: '清空',
    undo: '撤销',
    tip: '请在上方空白处签名',
  },
  shareSheet: {
    title: '分享到',
    cancel: '取消',
  },
  imagePreview: {
    close: '关闭',
    index: '{current} / {total}',
  },
  orgChart: {
    name: '名称',
    title: '副标题',
    addChild: '添加下级',
    remove: '删除',
    removeConfirm: '删除该节点及其 {count} 个下级？',
    removeConfirmLeaf: '删除该节点？',
    newNode: '新节点',
  },
}

/** 英文 */
export const jeEnUS: JeLocaleMessages = {
  name: 'en-US',
  confirm: 'Confirm',
  cancel: 'Cancel',
  loading: 'Loading...',
  signature: {
    clear: 'Clear',
    undo: 'Undo',
    tip: 'Please sign in the area above',
  },
  shareSheet: {
    title: 'Share to',
    cancel: 'Cancel',
  },
  imagePreview: {
    close: 'Close',
    index: '{current} / {total}',
  },
  orgChart: {
    name: 'Name',
    title: 'Subtitle',
    addChild: 'Add child',
    remove: 'Delete',
    removeConfirm: 'Delete this node and its {count} descendants?',
    removeConfirmLeaf: 'Delete this node?',
    newNode: 'New node',
  },
}

/** 内置语言名（仅用于类型提示；JeLocaleName 并不限于这两个） */
export type JeBuiltinLocaleName = 'zh-CN' | 'en-US'

/** 语言名：内置两种 + registerJellyLocale() 注册的任意名字 */
export type JeLocaleName = JeBuiltinLocaleName | (string & {})

/**
 * 外部翻译函数适配器：库用自己的 key 逐条去问 t()，物化成完整语言包。
 *
 * 因为 t() 是在 computed 里被求值的，它内部读到的响应式来源（如 vue-i18n 的 locale）
 * 会被依赖收集 —— 切换语言时消费组件会自动重渲染，不需要额外接线。
 */
export interface JeLocaleAdapter {
  /** 语言标识，会同步到 <html lang> */
  name: string
  /** 翻译函数，签名为 (key, params?) => string */
  t: (key: string, params?: Record<string, string | number>) => string
  /** key 前缀，例如对接 vue-i18n 的 jelly. 命名空间：prefix: 'jelly.' */
  prefix?: string
}

/** 可以直接传语言名、部分覆盖对象，或外部翻译函数适配器 */
export type JeLocaleInput = JeLocaleName | Partial<JeLocaleMessages> | JeLocaleAdapter

/**
 * useJeLocale() / provideJeLocale() 的返回值。
 *
 * 消费侧用 t('signature.tip') 取文案；messages 保留完整结构包，
 * 需要遍历、或沿用旧的结构读法（messages.value.confirm）时用。
 */
export interface JeLocaleContext {
  /** 按点路径取文案并插值；未命中返回 key 本身，便于排查漏配 */
  t: (key: string, params?: Record<string, string | number>) => string
  /** 当前语言标识（响应式） */
  name: ComputedRef<string>
  /** 当前完整语言包（响应式） */
  messages: ComputedRef<JeLocaleMessages>
}

export const jeLocaleKey: InjectionKey<JeLocaleContext> = Symbol('jeLocale')

const isName = (value: unknown): value is JeLocaleName => typeof value === 'string'

const isAdapter = (value: unknown): value is JeLocaleAdapter =>
  typeof value === 'object' && value !== null && typeof (value as JeLocaleAdapter).t === 'function'

/** 语言包注册表：内置两套，外部用 registerJellyLocale() 追加。值都是**已补全**的完整语言包。 */
const registry = new Map<string, JeLocaleMessages>([
  [jeZhCN.name, jeZhCN],
  [jeEnUS.name, jeEnUS],
])

/**
 * 注册 / 覆盖一套语言包。
 *
 * messages 允许只写要覆盖的字段 —— 嵌套分组（signature / shareSheet / imagePreview）
 * 做一层浅合并，底座是简体中文。同名可覆盖（也允许覆盖内置的 en-US）。
 */
export function registerJellyLocale(name: string, messages: Partial<JeLocaleMessages>): void {
  registry.set(name, resolveLocale({ ...messages, name }, jeZhCN))
}

/**
 * 把语言名 / 部分覆盖对象 / 外部翻译函数适配器解析成完整语言包。
 *
 * 前两种沿用旧口径（嵌套对象做一层浅合并），适配器走 fromAdapter 逐条取值。
 */
export function resolveLocale(
  input?: JeLocaleInput,
  base: JeLocaleMessages = jeZhCN,
): JeLocaleMessages {
  if (!input) return base
  // 语言名：命中注册表就整体切换（不以 base 为底）；未知名字回落到 base
  if (isName(input)) return registry.get(input) ?? base
  // 适配器：逐条向外部 t() 取值，取不到 / 空串的键回落到 base
  if (isAdapter(input)) return fromAdapter(input, base)
  return {
    ...base,
    ...input,
    signature: { ...base.signature, ...input.signature },
    shareSheet: { ...base.shareSheet, ...input.shareSheet },
    imagePreview: { ...base.imagePreview, ...input.imagePreview },
    orgChart: { ...base.orgChart, ...input.orgChart },
  }
}

/**
 * 把适配器物化成完整语言包。
 *
 * 这里**显式列出每一个 key**（不做遍历），好处是漏配会被 TypeScript 直接拦下；
 * 新增文案时同步补这里即可。
 */
function fromAdapter(adapter: JeLocaleAdapter, base: JeLocaleMessages): JeLocaleMessages {
  const get = (key: string, fallback: string): string => {
    const value = adapter.t(adapter.prefix ? adapter.prefix + key : key)
    return typeof value === 'string' && value.length > 0 ? value : fallback
  }
  return {
    name: adapter.name,
    confirm: get('confirm', base.confirm),
    cancel: get('cancel', base.cancel),
    loading: get('loading', base.loading),
    signature: {
      clear: get('signature.clear', base.signature.clear),
      undo: get('signature.undo', base.signature.undo),
      tip: get('signature.tip', base.signature.tip),
    },
    shareSheet: {
      title: get('shareSheet.title', base.shareSheet.title),
      cancel: get('shareSheet.cancel', base.shareSheet.cancel),
    },
    imagePreview: {
      close: get('imagePreview.close', base.imagePreview.close),
      index: get('imagePreview.index', base.imagePreview.index),
    },
    orgChart: {
      name: get('orgChart.name', base.orgChart.name),
      title: get('orgChart.title', base.orgChart.title),
      addChild: get('orgChart.addChild', base.orgChart.addChild),
      remove: get('orgChart.remove', base.orgChart.remove),
      removeConfirm: get('orgChart.removeConfirm', base.orgChart.removeConfirm),
      removeConfirmLeaf: get('orgChart.removeConfirmLeaf', base.orgChart.removeConfirmLeaf),
      newNode: get('orgChart.newNode', base.orgChart.newNode),
    },
  }
}

/** 文案模板插值：formatMessage('{current} / {total}', { current: 1, total: 3 }) */
export function formatMessage(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (raw, key: string) =>
    params[key] === undefined ? raw : String(params[key]),
  )
}

/** 由语言包 computed 派生出 context：t 内部读 pack.value，调用处的 computed 因此能收集到依赖 */
function makeContext(pack: ComputedRef<JeLocaleMessages>): JeLocaleContext {
  const t = (key: string, params?: Record<string, string | number>): string => {
    let node: unknown = pack.value
    for (const segment of key.split('.')) {
      if (!node || typeof node !== 'object') return key
      node = (node as Record<string, unknown>)[segment]
    }
    if (typeof node !== 'string') return key
    return params ? formatMessage(node, params) : node
  }
  return {
    t,
    name: computed(() => pack.value.name),
    messages: pack,
  }
}

/**
 * 语言偏好的持久化键（H5 的 localStorage 与小程序端的 uni storage 共用同一个 key）。
 *
 * 与主库的差异：主库的应用级缺省语言来自 `configureJelly({ locale })` 的内存单例，
 * 那是 `<html>` / document 级的能力、且不落盘；uni 端没有这套单例，改用「端存储」承载 ——
 * 换语言时记住，下次启动取回。
 */
export const jeLocaleStorageKey = 'je-locale'

/**
 * 读取端存储里持久化的语言偏好（只认注册表里存在的语言名）。
 *
 * H5 用 localStorage、小程序端用 uni storage，两份实现靠条件编译分派。
 * ⚠️ vue-tsc 不剥离 `#ifdef`，两块同时可见 —— 所以只在函数外声明一次 `raw`、
 * 在两个分支里各自赋值，避免同名 `const` 触发 TS2451。
 */
function readStoredLang(): JeLocaleName | undefined {
  let raw: unknown
  // #ifdef H5
  raw = typeof localStorage !== 'undefined' ? localStorage.getItem(jeLocaleStorageKey) : undefined
  // #endif
  // #ifndef H5
  raw = typeof uni !== 'undefined' ? uni.getStorageSync(jeLocaleStorageKey) : undefined
  // #endif
  return typeof raw === 'string' && registry.has(raw) ? raw : undefined
}

/**
 * 读取系统 / 宿主语言并归一成内置语言名（认不出返回 undefined，交给上层兜底）。
 *
 * H5 取 navigator.language，小程序端取 uni.getLocale()（取不到就返回 undefined）。
 * 同样收口在一个函数里、体内条件编译分派。
 */
function readSystemLang(): JeLocaleName | undefined {
  let raw: string | undefined
  // #ifdef H5
  raw = typeof navigator !== 'undefined' ? navigator.language : undefined
  // #endif
  // #ifndef H5
  raw = (uni as { getLocale?: () => string }).getLocale?.()
  // #endif
  if (!raw) return undefined
  const lower = raw.toLowerCase()
  if (lower.indexOf('zh') === 0) return 'zh-CN'
  if (lower.indexOf('en') === 0) return 'en-US'
  return undefined
}

/** 解析缺省语言：已存偏好 → 系统语言 → 简体中文 */
export function resolveDefaultLang(): JeLocaleName {
  return readStoredLang() ?? readSystemLang() ?? jeZhCN.name
}

/**
 * 应用级缺省语言：只有「显式设置过」（含启动时读到的持久化偏好）才有值。
 *
 * 用 ref 承载 —— setStoredLang 改它即可让已经渲染的消费组件重渲染，
 * 等效主库 `configureJelly({ locale })` 那份 shallowRef 单例。
 */
const appLang = ref<JeLocaleName | undefined>(readStoredLang())

/**
 * 记住语言偏好（切换语言时调用）：跨端写入端存储，并更新应用级缺省语言。
 *
 * 下次启动由 resolveDefaultLang() 取回；写入同时改 appLang，无需刷新即可让
 * 未被 `<je-locale>` 显式包裹的消费组件跟着切语言。
 */
export function setStoredLang(name: JeLocaleName): void {
  appLang.value = name
  // #ifdef H5
  if (typeof localStorage !== 'undefined') localStorage.setItem(jeLocaleStorageKey, name)
  // #endif
  // #ifndef H5
  if (typeof uni !== 'undefined') uni.setStorageSync(jeLocaleStorageKey, name)
  // #endif
}

/** 应用级缺省语言输入：显式设置过用设置值，否则按系统 / 内置兜底 */
const resolveAppLocale = (): JeLocaleInput => appLang.value ?? resolveDefaultLang()

/**
 * 把语言名同步到 <html lang>（仅 H5；小程序端没有 document）。
 *
 * 只在「显式配置了 locale」时才写：库内置缺省是 zh-CN，若不加判断，
 * 一个自己声明了 lang="en"、却没配过 Jelly 语言的应用会被静默改掉。
 */
function syncDocumentLang(pack: ComputedRef<JeLocaleMessages>, explicit: () => boolean): void {
  // #ifdef H5
  watchEffect(() => {
    if (!explicit()) return
    const lang = pack.value.name
    if (lang && document.documentElement.lang !== lang) document.documentElement.lang = lang
  })
  // #endif
}

/**
 * 向下提供语言包，并同步 <html lang>。
 *
 * 与祖先语言包合并，因此外层设了 en-US 之后，
 * 内层 `<je-locale :locale="{ confirm: 'OK' }">` 只需覆盖单条文案即可。
 */
export function provideJeLocale(source: () => JeLocaleInput | undefined): JeLocaleContext {
  const parent = inject(jeLocaleKey, null)
  const pack = computed(() =>
    resolveLocale(source(), parent?.messages.value ?? resolveLocale(resolveAppLocale())),
  )
  syncDocumentLang(pack, () => source() !== undefined || appLang.value !== undefined)
  const context = makeContext(pack)
  provide(jeLocaleKey, context)
  return context
}

/** 读取当前语言上下文；没有祖先提供时回退应用级缺省语言（端存储 / 系统语言 / 简体中文） */
export function useJeLocale(): JeLocaleContext {
  const inherited = inject(jeLocaleKey, null)
  if (inherited) return inherited
  const pack = computed(() => resolveLocale(resolveAppLocale()))
  syncDocumentLang(pack, () => appLang.value !== undefined)
  return makeContext(pack)
}
