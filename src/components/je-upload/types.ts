/** 文件状态：ready 待上传 / uploading 上传中 / success 成功 / fail 失败 */
export type JeUploadStatus = 'ready' | 'uploading' | 'success' | 'fail'

/** 列表展现形式：text 文本 / picture 图文 / picture-card 照片墙 */
export type JeUploadListType = 'text' | 'picture' | 'picture-card'

/**
 * 平台原始文件句柄。
 * 主库统一用浏览器的 File；uni 端还要照顾小程序 —— H5 仍是 File，小程序端没有 File，
 * 用「本地临时文件路径」承载同一语义（正好是 uni.uploadFile 的 filePath）。
 */
export type JeUploadRaw = File | string

/**
 * 选中文件的统一结构：H5 的 input 与小程序端的 chooseXxx 都归一到这里，
 * 之后的 beforeUpload、列表项、上传链路只认这一种形状。
 */
export interface JeUploadPickedFile {
  /** 文件名（含扩展名） */
  name: string
  /** 预览地址：H5 是 objectURL，小程序端是本地临时路径（仅图片有） */
  url?: string
  /** 字节数，拿不到时留空 */
  size?: number
  /** 原始句柄：File（H5）或本地临时路径（小程序端） */
  raw: JeUploadRaw
}

/** 单次请求要携带的表单字段；值支持 Blob 与 [值, 文件名] 元组，便于一次提交多份内容 */
export type JeUploadData = Record<string, string | Blob | [string | Blob, string] | string[]>

/**
 * 上传进度事件。
 * 主库直接复用浏览器 ProgressEvent；小程序端没有它，这里退化成一份两端都成立的纯数据
 * （字段与 ProgressEvent 对齐，percent 仍是 0~100 的百分比）。
 */
export interface JeUploadProgressEvent {
  /** 进度百分比（0~100） */
  percent: number
  /** 已上传字节数 */
  loaded: number
  /** 总字节数 */
  total: number
  /** total > 0 时为 true，即百分比可计算 */
  lengthComputable: boolean
}

/** 可取消的请求句柄：浏览器 XMLHttpRequest 与 uni 的 UploadTask 都满足这个形状 */
export interface JeUploadAbortable {
  abort(): void
}

/**
 * 自定义上传时收到的请求参数。
 * 三个回调各自只负责「把结果告诉组件」，组件据此推进文件状态并抛出事件，
 * 因此 httpRequest 里不需要、也不应该自己去改 fileList。
 */
export interface JeUploadRequestOptions {
  /** 请求地址，即 action */
  action: string
  /** 请求方法，即 method；小程序端 uni.uploadFile 恒为 POST，不透传 */
  method: string
  /** 文件字段名，即 name */
  name: string
  /** H5：浏览器 File；小程序端为 null，请改用 filePath */
  file: File | null
  /** 小程序端：本地临时文件路径；H5 为空串 */
  filePath: string
  /** 文件名（含扩展名） */
  filename: string
  /** 请求头 */
  headers: Record<string, string>
  /** 表单附加字段 */
  data: JeUploadData
  /** 是否携带 Cookie，仅 H5 的 XHR 生效 */
  withCredentials: boolean
  /** 通知组件上传成功，response 会写入 file.response */
  onSuccess: (response: unknown) => void
  /** 通知组件上传失败 */
  onError: (error: Error) => void
  /** 上报进度，组件会据此更新百分比并抛出 progress */
  onProgress: (event: JeUploadProgressEvent) => void
}

/**
 * 自定义上传函数。返回可取消句柄（XHR / UploadTask）时组件能 abort；
 * 只返回 Promise 时若要支持取消，请把 abort 挂在 Promise 上。
 */
export type JeUploadRequestHandler = (
  options: JeUploadRequestOptions,
) => JeUploadAbortable | (Promise<unknown> & { abort?: () => void })

/** 允许异步：beforeUpload 可以返回 Promise */
export type JeUploadAwaitable<T> = T | Promise<T>

/** 返回 false / 被 reject 的 Promise 会中止该文件，返回统一的选中文件则替换原来那条 */
export type JeUploadBeforeUpload = (
  file: JeUploadPickedFile,
) => JeUploadAwaitable<void | undefined | null | boolean | JeUploadPickedFile>

/** 返回 false / 被 reject 的 Promise 会阻止移除 */
export type JeUploadBeforeRemove = (
  file: JeUploadFile,
  files: JeUploadFile[],
) => JeUploadAwaitable<boolean>

/** 表单附加字段：静态对象、Promise，或按文件动态计算的函数 */
export type JeUploadFormData =
  | JeUploadData
  | ((file: JeUploadFile) => JeUploadAwaitable<JeUploadData>)

export interface JeUploadFile {
  name: string
  url?: string
  size?: number
  status?: JeUploadStatus
  /** 上传进度百分比（0~100），上传中才更新 */
  percentage?: number
  /** 服务端响应体，仅在 httpRequest / onSuccess 里能拿到 */
  response?: unknown
  /** 原始句柄：File（H5）或本地临时路径（小程序端） */
  raw?: JeUploadRaw
}

/**
 * 列表项回调。写成类型别名而不是内联联合，是为了让自动生成的 API 表里
 * 「类型」一列保持简短可读（脚本只取源码里的类型文本，不会展开别名）。
 */
export type JeUploadOnChange = (file: JeUploadFile, files: JeUploadFile[]) => void
export type JeUploadOnRemove = (file: JeUploadFile, files: JeUploadFile[]) => void
export type JeUploadOnPreview = (file: JeUploadFile) => void
export type JeUploadOnProgress = (
  event: JeUploadProgressEvent,
  file: JeUploadFile,
  files: JeUploadFile[],
) => void
export type JeUploadOnSuccess = (
  response: unknown,
  file: JeUploadFile,
  files: JeUploadFile[],
) => void
export type JeUploadOnError = (error: Error, file: JeUploadFile, files: JeUploadFile[]) => void
export type JeUploadOnExceed = (incoming: JeUploadPickedFile[], files: JeUploadFile[]) => void
