import type { InjectionKey } from 'vue'

/** 节点状态 */
export type JeStepStatus = 'wait' | 'process' | 'finish' | 'error' | 'success'
/** 排列方向 */
export type JeStepsDirection = 'horizontal' | 'vertical'

/** 父级下发给子项的上下文 */
export interface JeStepsContext {
  /** 读取当前激活下标 */
  getActive: () => number
  /** 读取「已完成」节点使用的状态 */
  getFinishStatus: () => JeStepStatus
  /** 读取「进行中」节点使用的状态 */
  getProcessStatus: () => JeStepStatus
  /**
   * 读取排列方向。
   * 小程序的样式隔离会让「子组件 wxss 里引用父组件类名」的后代选择器失效
   * （`.je-steps--horizontal .je-step__line` 匹配不到），所以方向等布局状态
   * 必须下发到子项，由子项挂在自己的根节点上自产自销。
   */
  getDirection: () => JeStepsDirection
  /** 是否居中对齐 */
  getAlignCenter: () => boolean
  /** 是否简洁模式 */
  getSimple: () => boolean
  /** 注册子项，父级据此分配下标 */
  registerStep: (uid: string) => void
  /** 注销子项 */
  unregisterStep: (uid: string) => void
  /** 子项在父级中的下标 */
  indexOf: (uid: string) => number
  /** 子项总数 */
  count: () => number
}

/** 子项通过它拿到父级 active 与自身下标 */
export const jeStepsKey: InjectionKey<JeStepsContext> = Symbol('jeSteps')
