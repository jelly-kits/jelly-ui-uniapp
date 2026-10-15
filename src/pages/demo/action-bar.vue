<script setup lang="ts">
/*
 * 组件详情页：操作栏（pages/demo/action-bar）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

const clicked = ref(0)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="操作栏" route="action-bar" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="操作栏" description="JeActionBar + Button / Icon" inset>
            <je-action-bar>
              <je-action-bar-icon icon="home" text="首页" @click="clicked += 1" />
              <je-action-bar-icon icon="star" text="收藏" :badge="3" @click="clicked += 1" />
              <je-action-bar-icon icon="user" text="我的" dot @click="clicked += 1" />
              <je-action-bar-button text="立即购买" @click="clicked += 1" />
            </je-action-bar>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
