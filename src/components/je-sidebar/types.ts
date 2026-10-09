import type { ComputedRef, InjectionKey } from 'vue'

/** 侧边导航下发给子项的上下文 */
export interface JeSidebarContext {
  /** 当前选中的 name */
  active: ComputedRef<string | number | undefined>
  /** 选中某一项 */
  select: (name: string | number) => void
}

/** 侧边导航子项通过它拿到父级状态 */
export const jeSidebarKey: InjectionKey<JeSidebarContext> = Symbol('jeSidebar')