<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // 演示工程暂无启动逻辑
})
</script>

<style>
/* 全局 CSS 变量在 main.ts 中引入（见 theme/variables.css）。 */
page {
  background: var(--je-bg-page-from);
}

/* #ifdef MP-WEIXIN */
/*
 * page 元素拿不到 .je-theme-dark（那挂在 .doc 上，而 CSS 变量只能向下继承），
 * 它的浅色默认值在全屏的 .doc 渲染出来之前会露出来，是转场闪白的第二层来源。
 * 这里按系统主题单独兜一层，取值与 theme.json 的 bgColor 保持一致。
 * prefers-color-scheme 需要 manifest 里开了 darkmode 才会生效。
 */
@media (prefers-color-scheme: dark) {
  page {
    background: #1a1a2e;
  }
}
/* #endif */
</style>
