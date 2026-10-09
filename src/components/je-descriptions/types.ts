import type { InjectionKey, Ref } from 'vue'

/** 描述列表尺寸 */
export type JeDescriptionsSize = 'small' | 'default' | 'large'

/** 描述列表排布方向 */
export type JeDescriptionsDirection = 'horizontal' | 'vertical'

/** 父级下发给 Item 的上下文 */
export interface JeDescriptionsContext {
  /** 实际生效的列数（窄屏会降为 1） */
  column: number
  border: boolean
  direction: JeDescriptionsDirection
  size: JeDescriptionsSize
  labelWidth?: string | number
}

/** Item 通过它拿到列数、方向与描边开关 */
export const jeDescriptionsKey: InjectionKey<Ref<JeDescriptionsContext>> =
  Symbol('jeDescriptions')
