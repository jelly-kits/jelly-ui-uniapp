<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 顶栏是页面 .doc（纵向 flex）的第一个子项，靠根节点承担固定高度与宽度。小程序自定义组件
   * 默认多包一层宿主节点，flex 子项会变成宿主，根节点的高度就落不到实处，故声明 virtualHost。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
/*
 * 演示页顶栏：返回演示入口 + 切到上一个 / 下一个组件。
 *
 * 93 个演示页的顶栏原本是同一段复制粘贴，抽到这里后各页只写一行 <doc-demo-bar title route />。
 * 放在 components 下由 easycom 自动注册（与 doc-theme-panel 同一套约定），不写进 pages.json。
 *
 * 样式为什么写在组件里而不是跟页面一样放 theme/demo.css：小程序端自定义组件与 app.wxss 是
 * 样式隔离的，全局的 .doc__* 进不来，顶栏会掉样式。所以这里自带一份，类名另起 demo-bar__ 前缀。
 */
import { computed } from 'vue'
import { flatSections } from '../../pages/index/sections'

const props = defineProps<{
  /** 当前组件展示名，与 pages/index/sections.ts 里的 title 一致 */
  title: string
  /** 当前演示页的路由片段，即 pages/demo/<route> 里的 <route>，也就是文件名 */
  route: string
}>()

/** 切换顺序即目录页的展示顺序；认不出的路由两端都禁用，不会跳到别的组件 */
const index = computed(() => flatSections.findIndex((item) => item.route === props.route))
const prev = computed(() => (index.value > 0 ? flatSections[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < flatSections.length - 1 ? flatSections[index.value + 1] : null,
)

/** 回演示入口；直接从链接打开演示页时没有返回栈，退化成重启到入口页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/demo/index' })
    },
  })
}

/**
 * 切到相邻组件。用 redirectTo 而不是 navigateTo：连续切换不会把页面栈堆高，
 * 「返回」始终回到演示入口。
 */
const open = (target: string) => {
  uni.redirectTo({ url: `/pages/demo/${target}` })
}
</script>

<template>
  <view class="demo-bar">
    <view class="demo-bar__inner">
      <view class="demo-bar__back" role="button" aria-label="返回演示入口" @tap="goBack">
        <je-icon name="chevron-left" :size="22" />
      </view>

      <text class="demo-bar__title">{{ title }}</text>

      <view class="demo-bar__nav">
        <view
          class="demo-bar__nav-btn"
          :class="{ 'is-disabled': !prev }"
          role="button"
          :aria-label="prev ? `上一个：${prev.title}` : '已是第一个组件'"
          @tap="prev && open(prev.route)"
        >
          <je-icon name="chevron-left" :size="18" />
        </view>
        <view
          class="demo-bar__nav-btn"
          :class="{ 'is-disabled': !next }"
          role="button"
          :aria-label="next ? `下一个：${next.title}` : '已是最后一个组件'"
          @tap="next && open(next.route)"
        >
          <je-icon name="chevron-right" :size="18" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/*
 * 尺寸与 theme/demo.css 里页面级的 .doc__bar 保持一致，只是换了一套类名前缀：
 * 页面级那份给目录页（pages/index/index）与演示入口页（pages/demo/index）用，
 * 这份给 93 个演示页用 —— 小程序端进不了 app.wxss，两边各写一份。
 */
.demo-bar {
  flex: 0 0 auto;
  box-sizing: border-box;
  /* 页面是自定义导航栏，从屏幕最顶上开始渲染，顶栏要自己让出状态栏高度
     （--status-bar-height 是 uni 的全局变量：小程序端为状态栏高度，H5 端为 0） */
  height: calc(56px + var(--status-bar-height, 0px));
  padding: var(--status-bar-height, 0px) 16px 0;
  background: var(--je-popup);
  border-bottom: var(--je-border);
}

.demo-bar__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
}

.demo-bar__back {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: -8px;
  color: var(--je-text);
}

/* 当前组件名：占满剩余宽度、超长省略 */
.demo-bar__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: 17px;
  font-weight: 600;
  color: var(--je-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 顶栏右侧：切到上一个 / 下一个组件 */
.demo-bar__nav {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  margin-right: -8px;
}

.demo-bar__nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--je-text);
  border-radius: 9px;
}

.demo-bar__nav-btn:active {
  background: var(--je-surface-hover);
}

/* 已经是首 / 末个组件：按钮置灰，并让点击落空 */
.demo-bar__nav-btn.is-disabled {
  color: var(--je-text-faint);
  opacity: 0.4;
  pointer-events: none;
}

/* #ifdef MP-WEIXIN */
/*
 * 微信的胶囊按钮（固定 87×32、右边距 7–10px）常驻右上角且无法隐藏。
 * 顶栏是自定义导航栏（navigationStyle: custom），右侧按钮要自己让出这段宽度，
 * 否则会被胶囊盖住，点击也会被它吃掉。88px 是在 16px 右侧内边距之外补的余量。
 */
.demo-bar__nav {
  margin-right: 88px;
}
/* #endif */
</style>
