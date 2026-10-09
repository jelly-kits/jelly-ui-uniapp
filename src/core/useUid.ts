/**
 * 组件内唯一的 ID 生成器。
 *
 * uni 工程锁的是 vue 3.4.21，而主库依赖的 `useId()` 是 Vue 3.5 才有的 API，
 * 但 Collapse / Steps 这类组件需要递增 ID 来给 aria 属性配对，所以这里用模块级
 * 计数器自己实现一份。
 *
 * 只在 setup 里同步调用一次即可——每次调用都会自增，别放进 computed / watch。
 */
let seed = 0

export function useUid(prefix = 'je'): string {
  seed += 1
  return `${prefix}-${seed}`
}
