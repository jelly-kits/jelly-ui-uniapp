import type { JeIconName } from '../je-icon/icons'

/** 块类型：一段文本 / 一张图片 / 一个视频 / 一条超链接 */
export type JeBlockType = 'text' | 'image' | 'video' | 'link'

/**
 * 当前数据结构版本，写进 JeBlockDocument.version —— 以后加块类型时靠它认旧数据。
 * 只是新增可选字段（如 width / height / fit）时不用升版本，旧数据照样读得懂。
 */
export const JE_BLOCK_VERSION = 1

/** 图片 / 视频的缩放方式：与主库同口径，展示侧各自映射到平台的填充模式 */
export type JeBlockFit = 'contain' | 'cover' | 'fill'

/** 宽度档位：编辑器里点一下就写进 width，手填数值时走自定义 */
export type JeBlockWidthPreset = '25%' | '50%' | '75%' | '100%'

/** 长度单位，宽高输入框右侧的单位切换 */
export type JeBlockLengthUnit = '%' | 'px'

interface JeBlockCommon {
  /** 唯一标识：拖动排序、v-for 的 key、外部增删改查都靠它 */
  id: string
}

/** 图片 / 视频共用的尺寸与缩放字段 */
interface JeBlockMedia {
  /**
   * 宽度，CSS 长度值：'100%' / '360px'。
   * 不传即占满一行（展示侧按 100% 处理）。
   */
  width?: string
  /** 高度，CSS 长度值：'240px'。不传即按素材比例自适应 */
  height?: string
  /** 缩放方式，不传即 contain（完整显示） */
  fit?: JeBlockFit
}

export interface JeBlockText extends JeBlockCommon {
  type: 'text'
  /** 文本内容，换行原样保留 */
  text: string
}

export interface JeBlockImage extends JeBlockCommon, JeBlockMedia {
  type: 'image'
  url: string
  /** 替代文字 */
  alt?: string
}

export interface JeBlockVideo extends JeBlockCommon, JeBlockMedia {
  type: 'video'
  url: string
  /** 封面图地址 */
  poster?: string
}

export interface JeBlockLink extends JeBlockCommon {
  type: 'link'
  url: string
  /** 链接标题，留空时展示地址本身 */
  title?: string
}

/** 一个块 */
export type JeBlock = JeBlockText | JeBlockImage | JeBlockVideo | JeBlockLink

/** 带尺寸字段的块（图片 / 视频） */
export type JeBlockMediaBlock = JeBlockImage | JeBlockVideo

/**
 * 编辑器与渲染组件收发的完整数据。
 *
 * 只有这一份结构、不含 HTML，所以小程序 / 原生端拿到 JSON 后按 type 分支渲染即可，
 * 展示侧可以直接参考 JeBlockView 的实现。
 */
export interface JeBlockDocument {
  version: number
  blocks: JeBlock[]
}

/** 可以外部改写的块字段（自定义按钮里改内容用） */
export interface JeBlockPatch {
  text?: string
  url?: string
  alt?: string
  poster?: string
  title?: string
  width?: string
  height?: string
  fit?: JeBlockFit
}

/** 插入用的块：id 可以省略，组件会自己补一个 */
export type JeBlockInput = (
  | Omit<JeBlockText, 'id'>
  | Omit<JeBlockImage, 'id'>
  | Omit<JeBlockVideo, 'id'>
  | Omit<JeBlockLink, 'id'>
) & { id?: string }

/**
 * 上传回调收到的原始句柄。
 *
 * 与 JeUpload 同口径：H5 端是浏览器的 File，小程序端没有 File，
 * 用「本地临时文件路径」承载同一语义。
 */
export type JeBlockUploadFile = File | string

/** 上传回调，返回可直接访问的地址；多图上传时组件会逐个调用 */
export type JeBlockUpload = (file: JeBlockUploadFile) => Promise<string>

/** 自定义按钮的回调参数：拿到块与下标，以及几个能直接改数据的动作 */
export interface JeBlockButtonContext {
  /** 按钮所属的块；顶部操作栏的按钮不属于任何块，是 undefined */
  block?: JeBlock
  /** 块在列表里的下标；顶部操作栏的按钮为 -1 */
  index: number
  /** 在 at（缺省为末尾）插入一个新块，返回新块的 id */
  insert: (block: JeBlockInput, at?: number) => string
  /** 按 id 改某个块的内容 */
  update: (id: string, patch: JeBlockPatch) => void
  /** 按 id 删掉某个块 */
  remove: (id: string) => void
  /** 把 from 处的块移到 to 处 */
  move: (from: number, to: number) => void
  /** 打开某个块的编辑窗口，让自定义按钮也能复用内置的编辑流程 */
  openEditor: (id: string) => void
}

/** 工具栏 / 块头部里的自定义按钮 */
export interface JeBlockButton {
  /** 唯一标识（同时用作 v-for 的 key） */
  key: string
  /** 悬停提示与读屏文案 */
  title: string
  /** JeIcon 的图标名，与 text 二选一（都给时以 text 优先） */
  icon?: JeIconName
  /** 文字按钮的文案 */
  text?: string
  onClick: (context: JeBlockButtonContext) => void
  /** 是否显示选中态 */
  isActive?: (context: JeBlockButtonContext) => boolean
  /** 是否禁用；不传时跟随组件的 disabled */
  disabled?: boolean | ((context: JeBlockButtonContext) => boolean)
}

/** 顶部操作栏的内置按钮：key 就是块类型 */
export type JeBlockInsertKey = JeBlockType

/** 每块头部的内置按钮：拖动把手、编辑、上移、下移、复制、删除 */
export type JeBlockActionKey = 'drag' | 'edit' | 'up' | 'down' | 'copy' | 'remove'

/** 顶部操作栏的一项：内置块类型 / 分组竖线 / 自定义按钮 */
export type JeBlockToolbarItem = JeBlockInsertKey | 'divider' | JeBlockButton

/** 块头部的一项：内置动作 / 分组竖线 / 自定义按钮 */
export type JeBlockActionItem = JeBlockActionKey | 'divider' | JeBlockButton
