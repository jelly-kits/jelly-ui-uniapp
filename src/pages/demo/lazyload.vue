<script setup lang="ts">
/*
 * 组件详情页：懒加载图片（pages/demo/lazyload）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/** 演示图片（远程占位图，最后一张故意给了无效地址用来演示失败态） */
const demoImage =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20cute%20orange%20jelly%20dessert%20on%20a%20white%20plate%2C%20soft%20studio%20lighting%2C%20minimal%20background&image_size=landscape_4_3'

const demoImageSecond =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20glass%20of%20colorful%20fruit%20jelly%20with%20mint%2C%20bright%20clean%20background&image_size=portrait_4_3'
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">懒加载图片</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="懒加载图片" description="JeLazyload（进入视口才加载，可配占位与兜底图）" inset>
            <view class="demo-block demo-row">
              <je-lazyload :src="demoImage" :width="140" :height="140" />
              <je-lazyload src="https://example.invalid/not-found.png" :width="140" :height="140" :error="demoImageSecond" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
