import type { InjectionKey } from 'vue'

/** 底部导航下发给子项的选中态约定 */
export interface JeTabbarContext {
  /** 当前选中的子项 name */
  getActive: () => string | number | undefined
  /** 子项被点击时回传给父级 */
  select: (name: string | number) => void
}

/** 底部导航子项通过它拿到父级的选中态 */
export const jeTabbarKey: InjectionKey<JeTabbarContext> = Symbol('jeTabbar')
