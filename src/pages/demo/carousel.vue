<script setup lang="ts">
/*
 * 组件详情页：轮播（pages/demo/carousel）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 演示图片（远程占位图，最后一张故意给了无效地址用来演示失败态） */
const demoImage =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20cute%20orange%20jelly%20dessert%20on%20a%20white%20plate%2C%20soft%20studio%20lighting%2C%20minimal%20background&image_size=landscape_4_3'

const demoImageSecond =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20glass%20of%20colorful%20fruit%20jelly%20with%20mint%2C%20bright%20clean%20background&image_size=portrait_4_3'

/** 轮播：两张远程图 + 一张纯色兜底 */
const carouselSlides = [
  { name: '果冻甜品', image: demoImage },
  { name: '水果果冻', image: demoImageSecond },
  { name: '纯色兜底', image: '' },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="轮播" route="carousel" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="轮播" description="JeCarousel + JeCarouselItem（可拖动、自动播放、点箭头与指示点）" inset>
            <view class="demo-block">
              <je-carousel height="180px" arrow="always">
                <je-carousel-item v-for="(slide, i) in carouselSlides" :key="i" :name="slide.name">
                  <image v-if="slide.image" class="demo-carousel__slide" :src="slide.image" mode="aspectFill" />
                  <view v-else class="demo-carousel__slide demo-carousel__slide--plain">
                    {{ slide.name }}
                  </view>
                </je-carousel-item>
              </je-carousel>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
