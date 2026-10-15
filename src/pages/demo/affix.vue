<script setup lang="ts">
/*
 * 组件详情页：固钉（pages/demo/affix）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 滚动后用于撑高页面，让固钉有足够的滚动距离可以“钉住” */
const affixParagraphs = [
  '固钉会先量出自身的高度与宽度，固定时用同样尺寸的占位元素顶住原来的位置，页面不会因为元素脱离文档流而跳动。',
  '页面内容区的滚动由 scroll-view 承担，固钉监听的是捕获阶段的滚动事件，所以任意滚动容器都能触发重新判定。',
  'position 设为 top 时，元素顶边越过吸附线即固定；设为 bottom 时则贴着容器底部固定。',
  '固定的位置由 offset 决定，这里给到 56px，正好落在页面顶栏下方，不会把返回按钮挡住。',
  '继续往下滚，工具条会一直停在顶栏下方；往回滚到原位，它又会自然地回到文档流里。',
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="固钉" route="affix" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="固钉" description="JeAffix（继续往下滚，工具条会吸在页面顶部）" inset>
            <view class="demo-affix">
              <je-affix position="top" :offset="56">
                <view class="demo-affix__bar">吸顶工具条</view>
              </je-affix>
              <view v-for="(text, index) in affixParagraphs" :key="index" class="demo-affix__body">
                {{ text }}
              </view>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
