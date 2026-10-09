import type { InjectionKey } from 'vue'

/*
 * 与主库的差异（都是小程序端跑不了的 DOM 能力）：
 * - 没有 `teleportTo`：小程序没有 Teleport，浮层一律就地渲染在触发区旁边；
 * - 方位只按 `placement` 指定的边与对齐方式落位，**不做碰撞检测与自动翻转**
 *   （详见 `core/placement.ts`）；
 * - 方向键高亮只在 H5 生效，小程序端没有可聚焦的 Tab 序列。
 */

/** 父级下拉菜单通过 provide 暴露给子项的能力 */
export interface JeDropdownContext {
  /** 选中某项 */
  handleSelect: (command: string | number) => void
  /** 收起菜单 */
  close: () => void
}

/** 子项用这个 key 注入父级上下文 */
export const jeDropdownKey: InjectionKey<JeDropdownContext> = Symbol('je-dropdown')
