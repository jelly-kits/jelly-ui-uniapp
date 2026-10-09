/** 命令式调用的配置项 */
export interface JeLoadingOptions {
  /** 转圈下方的提示文案 */
  text?: string
  /** 是否全屏覆盖，命令式默认 true */
  fullscreen?: boolean
  /** 覆盖遮罩底色，如 rgba(0, 0, 0, 0.6) */
  background?: string
}

/** 命令式实例句柄 */
export interface JeLoadingInstance {
  /** 关闭并销毁 */
  close: () => void
}
