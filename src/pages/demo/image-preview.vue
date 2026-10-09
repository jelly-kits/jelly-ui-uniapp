<script setup lang="ts">
/*
 * 组件详情页：图片预览（pages/demo/image-preview）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

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

const demoImages = [demoImage, demoImageSecond, 'https://example.invalid/not-found.png']

/** 图片预览 */
const imagePreviewVisible = ref(false)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">图片预览</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="图片预览" description="JeImagePreview" inset>
            <je-cell title="打开预览（3 张）" is-link @click="imagePreviewVisible = true" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-image-preview v-model="imagePreviewVisible" :images="demoImages" show-indicators />
  </view>
</template>
