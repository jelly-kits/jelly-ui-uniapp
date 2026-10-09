/**
 * 浮层方位：四条边，可再指定对齐方式（`-start` 贴起始边 / `-end` 贴结束边）。
 *
 * 主库里这个联合类型由 `useFloating` 导出并伴随碰撞检测；uni 端没有可靠的浮层尺寸
 * 测量，只保留类型本身给各浮层组件共用，落位一律交给 CSS。
 */
export type JePlacementSide = 'top' | 'bottom' | 'left' | 'right'

export type JePlacementValue = JePlacementSide | `${JePlacementSide}-start` | `${JePlacementSide}-end`
