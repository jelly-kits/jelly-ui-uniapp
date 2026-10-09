export { default as JeSplitter } from './je-splitter.vue'
/* 子组件按 easycom 约定独占顶层目录，这里跨目录导出以对齐主库的入口形状 */
export { default as JeSplitterPanel } from '../je-splitter-panel/je-splitter-panel.vue'
export type {
  JeSplitterContext,
  JeSplitterLayout,
  JeSplitterPanelState,
} from './types'
