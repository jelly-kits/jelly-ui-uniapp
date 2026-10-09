import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'

/** 组件尺寸档位 */
export type JeConfigSize = 'small' | 'default' | 'large'

/**
 * 由 JeConfigProvider 向子树提供的配置（子树级缺省，不是应用级）。
 *
 * 与主库的差异（都源自小程序端跑不了的能力）：
 * - 没有 `teleportTo`：uni 两端都没有 Teleport（没有 `document.body` 可挂，浮层一律就地渲染，
 *   见 je-menu / je-dialog / je-popup 等组件的 types.ts），主库 `useTeleportTarget()` 那条
 *   「组件 prop → ConfigProvider → configureJelly → body」的回退链随之取消；
 * - 没有「应用级单例」：主库回退链的倒数第二层是 `configureJelly()`（`src/core/globalConfig.ts`），
 *   uni 端不迁移该单例，所以这里只保留「组件自身 prop → 内置缺省」。
 *
 * 语言（`locale`）**不走这里** —— 与主库一致，由 JeConfigProvider 另行 `provideJeLocale()`，
 * 走 je-locale 那条独立的注入链。
 */
export interface JeConfigContext {
  /** 子树默认尺寸，组件自身传了 size 时以自身为准 */
  size: ComputedRef<JeConfigSize>
}

export const jeConfigKey: InjectionKey<JeConfigContext> = Symbol('jeConfig')

/** 没有祖先 provide 时的缺省上下文（uni 端没有应用级单例，直接内置缺省） */
const fallback: JeConfigContext = {
  size: computed<JeConfigSize>(() => 'default'),
}

/** 读取全局配置，没有祖先提供时返回缺省配置 */
export function useJeConfig(): JeConfigContext {
  return inject(jeConfigKey, null) ?? fallback
}
