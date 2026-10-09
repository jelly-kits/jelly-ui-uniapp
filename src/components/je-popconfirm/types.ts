/**
 * JePopconfirm 的公开类型。
 *
 * 与主库的差异（都是小程序端跑不了的 DOM 能力）：
 * - 没有 `teleportTo`：小程序没有 Teleport，浮层一律就地渲染在触发元素旁边；
 * - 不消费 `useFloating`：方位只按 `placement` 指定的边落位，**不做碰撞检测与自动翻转**
 *   （详见 `core/placement.ts`），箭头位置也交给 CSS；
 * - `width` 只在宽屏生效，窄屏固定为贴底弹层的整宽；
 * - 窄屏锁页面的方式不同：H5 锁 body，小程序端靠遮罩层的 catchtouchmove。
 */

/** 确认按钮的语义色，决定确认按钮的配色 */
export type JePopconfirmType = 'primary' | 'danger' | 'warning'
