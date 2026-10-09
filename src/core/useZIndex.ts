/**
 * 浮层层级管理。
 *
 * 全局只维护一个递增游标：后打开的浮层一定压住先打开的，
 * 于是「弹窗里再开一个下拉」这类叠加场景无需手工算 z-index。
 */
let base = 2000
let seed = base

/** 浮层起始层级的初始值，业务里自绘的弹层可以从这里往上排 */
export const JE_Z_INDEX_BASE = base

/** 当前生效的起始层级（configureJelly 调过 zIndexBase 后会变） */
export function getZIndexBase(): number {
  return base
}

/**
 * 调整浮层起始层级，返回本次是否生效。
 *
 * 只升不降 —— 低于当前游标的值一律忽略：否则新开的浮层层级反而低于
 * 已在屏上的那个，出现「后开的被先开的压住」。降级值只在配置里也不留，
 * 避免 getJellyConfig().zIndexBase 报出一个并未生效的数字。
 */
export function setZIndexBase(next: number): boolean {
  if (!Number.isFinite(next)) return false
  const value = Math.floor(next)
  if (value <= seed) return false
  base = value
  seed = value
  return true
}

/** 取下一个可用层级 */
export function nextZIndex(): number {
  seed += 1
  return seed
}
