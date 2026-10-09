import { getCurrentInstance, onScopeDispose, ref, type Ref } from 'vue'
import { springTo, type SpringConfig } from './spring'

export interface UseSpringReturn {
  /** 当前值，直接用于模板 / computed 即可获得逐帧更新 */
  value: Ref<number>
  /** 弹性过渡到目标值，第三个参数可覆盖本次动画参数 */
  set: (target: number, config?: Partial<SpringConfig>) => void
  /** 不做动画，立刻跳到目标值 */
  jump: (target: number) => void
  /** 中断当前动画 */
  stop: () => void
}

interface MediaQueryList {
  matches: boolean
}

function prefersReducedMotion(): boolean {
  // 小程序端没有 window / matchMedia，按「未开启减弱动效」处理
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return (window.matchMedia('(prefers-reduced-motion: reduce)') as MediaQueryList).matches
}

/**
 * 单值弹簧：返回一个会被弹簧逐帧驱动的 ref。
 *
 * 组件卸载（作用域销毁）时自动中断动画，不会泄漏定时器；
 * 开启「减弱动效」时直接落到终点。
 */
export function useSpring(initial: number, config: SpringConfig): UseSpringReturn {
  const value = ref(initial)
  let cancel: (() => void) | null = null

  const stop = () => {
    cancel?.()
    cancel = null
  }

  const jump = (target: number) => {
    stop()
    value.value = target
  }

  const set = (target: number, override?: Partial<SpringConfig>) => {
    stop()

    if (target === value.value || prefersReducedMotion()) {
      value.value = target
      return
    }

    cancel = springTo(value.value, target, { ...config, ...override }, (v, done) => {
      value.value = v
      if (done) cancel = null
    })
  }

  // uni 端（小程序 / App）的 vue 运行时是按需裁剪的，没有导出 getCurrentScope：
  // 一旦调用就抛 TypeError 并中断整个组件的 setup，模板不再渲染（动态 class / props / 插槽全丢）。
  // 改用各端都有的 getCurrentInstance 判断「是否处于组件 setup 中」。
  if (getCurrentInstance() && typeof onScopeDispose === 'function') onScopeDispose(stop)

  return { value, set, jump, stop }
}
