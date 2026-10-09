export { default as JeTab } from './je-tab.vue'
/* 子组件按 easycom 约定独占顶层目录，这里跨目录导出以对齐主库的入口形状 */
export { default as JeTabItem } from '../je-tab-item/je-tab-item.vue'
export { jeTabKey, type JeTabContext, type JeTabItemState, type JeTabName } from './types'
