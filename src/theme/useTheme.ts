/**
 * 文档站主题：明暗模式 + 主色自定义。
 *
 * 【两端落点不同 —— 这是本模块唯一需要理解的地方】
 * - H5：变量写到 `document.documentElement` 上，并给 <html> 打 `data-theme`。
 *   深浅两套 token 已经在 theme/variables.css 里按 `:root` / `[data-theme]` 写好，
 *   这里只负责改属性，属于零侵入的做法。
 * - 小程序：没有 `document`，也没有 `[data-theme]` 这种属性选择器，
 *   变量只能靠 CSS 自定义属性的**继承**下发 —— 由 main.ts 里的全局 mixin 把
 *   `jeThemeClass` / `jeThemeVars` 绑到每个页面的根节点 `.doc` 上（见 themeVarsForRoot）。
 *
 * 持久化沿用 je-locale 的写法：H5 走 localStorage，小程序走 uni storage；
 * vue-tsc 不剥离 `#ifdef`，所以只在函数外声明一次变量、两个分支各自赋值。
 */
import { computed, ref } from 'vue'

export type JeThemeMode = 'auto' | 'light' | 'dark'

export interface JeThemePreset {
  name: string
  primary: string
  /** 渐变终点色，与 primary 组成 135° 渐变 */
  end: string
}

/** 存储键：与 je-locale 的偏好分开存，互不影响 */
const jeThemeStorageKey = 'jelly-doc-theme'

export const defaultPrimary = '#667eea'
export const defaultPrimaryEnd = '#764ba2'

/** 明暗三态：跟随系统时由 H5 的 prefers-color-scheme 决定，小程序端恒定浅色 */
export const themeModeOptions: { label: string; value: JeThemeMode }[] = [
  { label: '跟随系统', value: 'auto' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

/**
 * 预设主色板。终点色显式给出而不是推导 —— 渐变是设计过的成对颜色，
 * 推导公式只是给「自定义取色」兜底，审美上比不过手调。
 */
export const themePresets: JeThemePreset[] = [
  { name: '经典紫', primary: '#667eea', end: '#764ba2' },
  { name: '靛蓝', primary: '#4f46e5', end: '#7c3aed' },
  { name: '天青', primary: '#0ea5e9', end: '#2563eb' },
  { name: '青碧', primary: '#14b8a6', end: '#0f766e' },
  { name: '翠绿', primary: '#22c55e', end: '#15803d' },
  { name: '落日橙', primary: '#f97316', end: '#ea580c' },
  { name: '玫红', primary: '#ec4899', end: '#be185d' },
  { name: '朱红', primary: '#ef4444', end: '#dc2626' },
]

/* --------------------------------- 颜色工具 --------------------------------- */

interface Rgb {
  r: number
  g: number
  b: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const toByte = (value: number) => clamp(Math.round(value), 0, 255)

/** 解析 #rgb / #rrggbb，认不出返回 undefined */
export function hexToRgb(hex: string): Rgb | undefined {
  const text = hex.trim().replace(/^#/, '')
  const full =
    text.length === 3
      ? text
          .split('')
          .map((char) => char + char)
          .join('')
      : text
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return undefined
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

const rgbToHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((value) => toByte(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase()

/** 归一成 #RRGGBB；认不出返回 undefined */
export function normalizeHex(hex: string): string | undefined {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHex(rgb) : undefined
}

interface Hsl {
  h: number
  s: number
  l: number
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === red) h = ((green - blue) / delta) % 6
  else if (max === green) h = (blue - red) / delta + 2
  else h = (red - green) / delta + 4

  return { h: (h * 60 + 360) % 360, s, l }
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const match = l - chroma / 2

  let rgb: [number, number, number]
  if (h < 60) rgb = [chroma, second, 0]
  else if (h < 120) rgb = [second, chroma, 0]
  else if (h < 180) rgb = [0, chroma, second]
  else if (h < 240) rgb = [0, second, chroma]
  else if (h < 300) rgb = [second, 0, chroma]
  else rgb = [chroma, 0, second]

  return { r: (rgb[0] + match) * 255, g: (rgb[1] + match) * 255, b: (rgb[2] + match) * 255 }
}

/**
 * 由主色推导渐变终点：色相 +18°、饱和度 +6%、亮度 -12%。
 * 只给「自定义取色」用，预设色板自带调好的终点色。
 */
export function derivePrimaryEnd(primary: string): string {
  const rgb = hexToRgb(primary)
  if (!rgb) return defaultPrimaryEnd
  const { h, s, l } = rgbToHsl(rgb)
  return rgbToHex(
    hslToRgb({
      h: (h + 18) % 360,
      s: clamp(s + 0.06, 0, 1),
      l: clamp(l - 0.12, 0, 1),
    }),
  )
}

/* ---------------------------------- 状态 ---------------------------------- */

const mode = ref<JeThemeMode>('auto')
const primary = ref(defaultPrimary)
const primaryEnd = ref(defaultPrimaryEnd)

/**
 * 系统是否偏好深色。H5 走 matchMedia，小程序端走 getSystemInfoSync().theme +
 * onThemeChange（均要求 manifest 里开了 darkmode，否则 theme 恒为 undefined）。
 * 用 ref 承载，系统主题变化时能带着 isDark 一起更新。
 */
const systemDark = ref(false)

/** 最终是否深色：手动指定优先，auto 交给系统偏好 */
export const isDark = computed(
  () => mode.value === 'dark' || (mode.value === 'auto' && systemDark.value),
)

function readStored(): void {
  let raw: unknown
  // #ifdef H5
  raw = typeof localStorage !== 'undefined' ? localStorage.getItem(jeThemeStorageKey) : undefined
  // #endif
  // #ifndef H5
  raw = typeof uni !== 'undefined' ? uni.getStorageSync(jeThemeStorageKey) : undefined
  // #endif
  if (typeof raw !== 'string' || !raw) return

  let parsed: { mode?: string; primary?: string; end?: string }
  try {
    parsed = JSON.parse(raw) as { mode?: string; primary?: string; end?: string }
  } catch {
    // 存储被改坏时直接退回默认主题，不打断启动
    return
  }

  if (parsed.mode === 'auto' || parsed.mode === 'light' || parsed.mode === 'dark') {
    mode.value = parsed.mode
  }
  const storedPrimary = parsed.primary ? normalizeHex(parsed.primary) : undefined
  const storedEnd = parsed.end ? normalizeHex(parsed.end) : undefined
  if (storedPrimary) primary.value = storedPrimary
  if (storedEnd) primaryEnd.value = storedEnd
}

function persist(): void {
  const payload = JSON.stringify({
    mode: mode.value,
    primary: primary.value,
    end: primaryEnd.value,
  })
  // #ifdef H5
  if (typeof localStorage !== 'undefined') localStorage.setItem(jeThemeStorageKey, payload)
  // #endif
  // #ifndef H5
  if (typeof uni !== 'undefined') uni.setStorageSync(jeThemeStorageKey, payload)
  // #endif
}

/** H5：把模式与主色写到根节点；小程序端什么都不做，交给页面根节点的行内变量 */
function applyTheme(): void {
  // #ifdef H5
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode.value === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode.value)
  root.style.setProperty('--je-primary', primary.value)
  root.style.setProperty('--je-primary-end', primaryEnd.value)
  // #endif
}

/* ---------------------------------- 对外 ---------------------------------- */

/** 切换明暗模式（跟随系统 / 浅色 / 深色） */
export function setThemeMode(next: JeThemeMode): void {
  if (mode.value === next) return
  mode.value = next
  persist()
  applyTheme()
}

/** 自定义主色：只给主色时按公式推导渐变终点 */
export function setThemePrimary(color: string): void {
  const normalized = normalizeHex(color)
  if (!normalized || normalized === primary.value) return
  primary.value = normalized
  primaryEnd.value = derivePrimaryEnd(normalized)
  persist()
  applyTheme()
}

/** 套用预设色板（主色与终点色都是调好的，不做推导） */
export function applyThemePreset(preset: JeThemePreset): void {
  if (primary.value === preset.primary && primaryEnd.value === preset.end) return
  primary.value = preset.primary
  primaryEnd.value = preset.end
  persist()
  applyTheme()
}

/** 恢复默认主题 */
export function resetTheme(): void {
  mode.value = 'auto'
  primary.value = defaultPrimary
  primaryEnd.value = defaultPrimaryEnd
  persist()
  applyTheme()
}

/**
 * 页面根节点用的主题类名 —— 只在**小程序端**有值。
 *
 * H5 的深色靠 <html data-theme>（见 variables.css），页面根节点不需要再加类。
 * 小程序端没有属性选择器，用类名匹配 variables.css 里的 `.je-theme-dark` 深色块。
 */
export function themeClassForRoot(): string {
  let value = ''
  // #ifdef H5
  value = ''
  // #endif
  // #ifndef H5
  value = isDark.value ? 'je-theme-dark' : ''
  // #endif
  return value
}

/**
 * 页面根节点用的主题变量 —— 同样只在**小程序端**有值。
 * H5 已经写在 documentElement 上，再下发一份属于重复劳动。
 */
export function themeVarsForRoot(): Record<string, string> {
  let value: Record<string, string> = {}
  // #ifdef H5
  value = {}
  // #endif
  // #ifndef H5
  value = { '--je-primary': primary.value, '--je-primary-end': primaryEnd.value }
  // #endif
  return value
}

/**
 * 启动时调用：读持久化偏好 → 探测系统主题 → 首次应用。
 * 放在 main.ts 里，早于任何页面渲染。
 */
export function initTheme(): void {
  readStored()
  // #ifdef H5
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = query.matches
    query.addEventListener('change', (event) => {
      systemDark.value = event.matches
      // 只有「跟随系统」才需要跟着系统变，手动指定时 data-theme 会压过媒体查询
      if (mode.value === 'auto') applyTheme()
    })
  }
  // #endif
  // #ifndef H5
  const systemTheme = uni.getSystemInfoSync().theme
  if (systemTheme) systemDark.value = systemTheme === 'dark'
  uni.onThemeChange(({ theme }) => {
    systemDark.value = theme === 'dark'
  })
  // #endif
  applyTheme()
}

/** 组件里读取主题状态与操作 */
export function useDocTheme() {
  return {
    mode,
    primary,
    primaryEnd,
    isDark,
    presets: themePresets,
    modeOptions: themeModeOptions,
    setMode: setThemeMode,
    setPrimary: setThemePrimary,
    applyPreset: applyThemePreset,
    reset: resetTheme,
  }
}
