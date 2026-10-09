import { createSSRApp } from 'vue'
import App from './App.vue'
import { initTheme, themeClassForRoot, themeVarsForRoot } from './theme/useTheme'
import './theme/variables.css'
import './theme/demo.css'

export function createApp() {
  const app = createSSRApp(App)

  // #ifdef H5
  /*
   * 预览态：文档站右侧的手机框以 `#/pages/demo/xxx?preview=1` 打开演示页，
   * 在这个 iframe 里我们要的是「只有演示内容」，不要演示页自带的顶栏外壳。
   * 这里给 <html> 打个标记，由 theme/demo.css 里的规则隐藏 .doc__bar。
   */
  if (typeof window !== 'undefined' && window.location.hash.includes('preview=1')) {
    document.documentElement.classList.add('je-preview')
  }
  // #endif

  /*
   * 主题变量下发（小程序端）：
   * 小程序没有 `document`，改不了根节点，变量只能靠 CSS 自定义属性的继承往下传。
   * 这里用全局 mixin 给每个页面实例挂两个 computed，页面根节点一行搞定：
   *
   *   <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
   *
   * H5 端两者都是空值（深色走 <html data-theme>、主色写在 documentElement 上），
   * 所以这行绑定在 H5 是无副作用的空操作，两端共用同一套页面模板。
   */
  app.mixin({
    computed: {
      jeThemeClass: () => themeClassForRoot(),
      jeThemeVars: () => themeVarsForRoot(),
    },
  })

  // 读持久化偏好 + 探测系统主题 + 首次应用，早于任何页面渲染
  initTheme()

  return { app }
}
