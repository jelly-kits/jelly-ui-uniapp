<script setup lang="ts">
/*
 * 组件详情页：标签与徽标（pages/demo/tag-badge）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

const clicked = ref(0)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="标签与徽标" route="tag-badge" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="标签与徽标" inset>
            <je-cell title="标签">
              <je-space wrap>
                <je-tag type="primary">primary</je-tag>
                <je-tag type="success">success</je-tag>
                <je-tag type="warning" effect="dark">warning</je-tag>
                <je-tag type="danger" round>danger</je-tag>
              </je-space>
            </je-cell>
            <je-cell title="徽标">
              <je-badge :value="clicked" :max="99">
                <je-tag type="info">点击 {{ clicked }} 次</je-tag>
              </je-badge>
            </je-cell>
            <je-cell title="头像">
              <je-space>
                <je-avatar size="small" />
                <je-avatar shape="square" />
                <je-avatar size="large" icon="user" />
              </je-space>
            </je-cell>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
