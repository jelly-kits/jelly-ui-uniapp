<script setup lang="ts">
/*
 * 组件详情页：上传（pages/demo/upload）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="上传" route="upload" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="上传" description="JeUpload（照片墙，前端模拟上传进度）" inset>
            <view class="demo-block">
              <je-upload list-type="picture-card" multiple :limit="6" auto-upload tip="最多上传 6 张图片" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
