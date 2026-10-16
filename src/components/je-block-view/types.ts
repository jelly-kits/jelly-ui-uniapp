import type { JeBlock, JeBlockDocument } from '../je-block-editor/types'

/** 渲染数据：完整文档（{ version, blocks }）或直接的块数组都行 */
export type JeBlockViewValue = JeBlockDocument | JeBlock[]
