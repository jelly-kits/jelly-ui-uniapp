/** 头像尺寸：数字按 px 处理，或使用预设档位（28 / 40 / 52） */
export type JeAvatarSize = number | 'small' | 'default' | 'large'

/** 头像形状 */
export type JeAvatarShape = 'circle' | 'square'

/** 图片填充方式，透传给 object-fit */
export type JeAvatarFit = 'fill' | 'contain' | 'cover'
