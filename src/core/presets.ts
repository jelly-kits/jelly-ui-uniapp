import type { SpringConfig } from './spring'

/**
 * 调好的弹簧预设，参数取自参考实现 test.html。
 * 想改手感时优先在这里调，而不是散落在各组件里。
 */
export const jePresets = {
  /** 卡片 / 面板入场：缓慢，几乎不回弹 */
  soft: { stiffness: 0.12, damping: 0.75 },
  /** 展开：回弹明显 */
  bouncy: { stiffness: 0.2, damping: 0.7 },
  /** 收起 / 归位：干脆一些 */
  settle: { stiffness: 0.3, damping: 0.8 },
  /** 按下：快速挤压 */
  press: { stiffness: 0.4, damping: 0.45 },
  /** 松开：回弹归位 */
  release: { stiffness: 0.18, damping: 0.7 },
  /**
   * 数字滚动（统计值等）。
   * 实测：过冲 0.07%、约 433ms 收敛。数字不能像位移那样回弹——
   * 冲过目标值会让统计数字瞬间显示成一个偏大的数，看着就是错的。
   */
  count: { stiffness: 0.4, damping: 0.4 },
} satisfies Record<string, SpringConfig>

export type JePresetName = keyof typeof jePresets
