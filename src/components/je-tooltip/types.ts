import type { JePlacementValue } from '../../core/placement'

/**
 * 与主库的差异（都是小程序端跑不了的 DOM 能力）：
 * - 没有 `teleportTo`：小程序没有 Teleport，浮层一律就地渲染在触发元素旁边；
 * - 方位只按给定的边落位，**不做碰撞检测与自动翻转**（详见 `core/placement.ts`）。
 */
export type JeTooltipPlacement = JePlacementValue
