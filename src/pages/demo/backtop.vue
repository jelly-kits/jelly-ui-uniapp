<script setup lang="ts">
/*
 * 组件详情页：回到顶部（pages/demo/backtop）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/*
 * 页面真正滚动的是内容区那个 scroll-view 的内部节点（不是 window），
 * 回到顶部需要指向它才能读到滚动量、也才能滚回去。
 * 选择器只在 H5 生效；小程序端一律按页面滚动判断，target 会被忽略。
 */
const scrollTarget = '.doc__body .uni-scroll-view > .uni-scroll-view'

/** 撑高页面，滚过 300px 后右下角才会浮现回顶按钮；给足长度，按钮出现后能停留很长一段滚动距离 */
const backtopParagraphs = [
  '回到顶部按钮默认在滚动超过 300px 后出现，出现阈值可以用 visibility-height 调整。',
  '它与页面右下角的距离分别由 right 与 bottom 控制，窄屏会自动收窄并避开底部安全区。',
  '按钮出现与收起走的是 visibility 过渡，因此出场与退场都带一点位移和缩放动画。',
  '点击后会把滚动容器平滑地滚回顶部；如果用户开启了“减弱动效”，则退化成瞬时跳转。',
  '这一整段都是用来撑高页面的演示内容，真实业务里换成任何列表或长文都可以。',
  '列表越长，按钮出现后能停留的滚动距离就越长，也越容易观察到“滚动时才出现”的行为。',
  '阈值判断只读取滚动量，不看内容高度，因此对无限加载这类不断变长的列表同样成立。',
  '按钮本身是固定定位的浮层，不会跟着内容滚走，也不会把后面的内容顶开。',
  '把它放在页面根节点之外（本页就是放在内容区之后），可以避免被滚动容器裁掉。',
  '颜色、大小与圆角都走主题变量，切换明暗主题时外观会自动跟随变化。',
  '点击后除了滚动，还会触发一次点击回调，业务可以在里面做数据上报之类的收尾动作。',
  '继续往下滚，右下角的圆形按钮会一直在那里；点一下，内容区就会回到最上面。',
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="回到顶部" route="backtop" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="回到顶部" description="JeBacktop（往下滚 300px 后右下角出现）" inset>
            <je-cell title="提示" value="滚到页面下方看右下角" />
            <view v-for="(text, index) in backtopParagraphs" :key="index" class="demo-anchor">
              <text class="demo-anchor__title">第 {{ index + 1 }} 段</text>
              <text class="demo-anchor__desc">{{ text }}</text>
            </view>
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-backtop :target="scrollTarget" :visibility-height="300" :right="20" :bottom="96" />
  </view>
</template>
