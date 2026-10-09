/*
 * 主题模块的类型增强：main.ts 用 app.mixin 给每个页面实例注入了
 * jeThemeClass / jeThemeVars 两个 computed，页面模板里直接引用即可。
 * 这里补上声明，让 vue-tsc 在模板类型检查时认识它们。
 *
 * 注意：本文件用了 `export {}`，是一个「模块」，这样 `declare module 'vue'`
 * 才是模块增强（augmentation）；否则会被当成覆盖 vue 的 ambient 声明。
 */
export {}

declare module 'vue' {
  interface ComponentCustomProperties {
    /** 页面根节点的主题类名（仅小程序端有值，见 theme/useTheme.ts） */
    jeThemeClass: string
    /** 页面根节点的主题变量（仅小程序端有值，见 theme/useTheme.ts） */
    jeThemeVars: Record<string, string>
  }
}
