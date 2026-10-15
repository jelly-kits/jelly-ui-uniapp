<script setup lang="ts">
/*
 * 组件详情页：锚点（pages/demo/anchor）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/*
 * 页面真正滚动的是内容区那个 scroll-view 的内部节点（不是 window），
 * 锚点的滚动定位与高亮必须显式指向它，否则点击与联动都监听不到。
 * 选择器只在 H5 生效；小程序端锚点一律走页面滚动，container 会被忽略。
 */
const scrollContainer = '.doc__body .uni-scroll-view > .uni-scroll-view'

/** 演示段落：内容给足，锚点跳转与滚动高亮才看得出来 */
const anchorSections = [
  {
    id: 'demo-anchor-1',
    title: '主题变量',
    desc: '颜色、圆角、动效时长都收敛在一组 CSS 变量里，换肤只改一处。默认提供明暗两套取值，跟随系统偏好自动切换。',
  },
  {
    id: 'demo-anchor-2',
    title: '零运行时依赖',
    desc: '组件不引入任何第三方运行时，样式与逻辑都跟着组件走。打包体积可控，也避免了多版本共存带来的重复实例问题。',
  },
  {
    id: 'demo-anchor-3',
    title: '跨端一致',
    desc: 'H5 与小程序共用同一套类名与坐标口径，差异集中在少量条件编译分支里，减少两套维护成本。',
  },
  {
    id: 'demo-anchor-4',
    title: '可访问性',
    desc: '交互元素带完整语义：按钮是 button、弹层是 dialog、进度是 progressbar，键盘与读屏都能正常工作。',
  },
  {
    id: 'demo-anchor-5',
    title: '按需引入',
    desc: '每个组件单独导出，业务可以只引入用到的部分。样式随组件注入，不依赖额外的一次性全局注册。',
  },
  {
    id: 'demo-anchor-6',
    title: '扩展与定制',
    desc: '面板、浮层、单元格等容器都留出插槽，业务内容可以自由拼装，而不必复制一份组件源码再改。',
  },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="锚点" route="anchor" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="锚点" description="JeAnchor + JeAnchorLink（点文字滚到对应段落）" inset>
            <view class="demo-block">
              <je-anchor direction="horizontal" :container="scrollContainer">
                <je-anchor-link
                  v-for="section in anchorSections"
                  :key="section.id"
                  :href="`#${section.id}`"
                  :title="section.title"
                />
              </je-anchor>
            </view>
            <view v-for="section in anchorSections" :id="section.id" :key="section.id" class="demo-anchor">
              <text class="demo-anchor__title">{{ section.title }}</text>
              <text class="demo-anchor__desc">{{ section.desc }}</text>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
