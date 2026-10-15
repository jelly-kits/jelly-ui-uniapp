<script setup lang="ts">
/*
 * 组件详情页：按钮（pages/demo/button）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

const clicked = ref(0)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="按钮" route="button" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="按钮" description="JeButton + JeButtonGroup" inset>
            <view class="demo-block demo-col">
              <je-space wrap>
                <je-button @click="clicked += 1">默认</je-button>
                <je-button type="success">成功</je-button>
                <je-button type="warning">警告</je-button>
                <je-button type="danger">危险</je-button>
                <je-button type="info">信息</je-button>
                <je-button type="default">中性</je-button>
              </je-space>
              <je-space wrap>
                <je-button variant="ghost">ghost</je-button>
                <je-button plain>素色</je-button>
                <je-button dashed>虚线</je-button>
                <je-button text>文字</je-button>
                <je-button link>链接</je-button>
                <je-button round>胶囊</je-button>
                <je-button size="small">小号</je-button>
                <je-button size="large">大号</je-button>
              </je-space>
              <je-space wrap>
                <je-button icon="plus">新建</je-button>
                <je-button loading>加载中</je-button>
                <je-button disabled>禁用</je-button>
                <je-button circle icon="search" />
                <je-button circle icon="star" disabled />
              </je-space>
            </view>
            <je-cell title="点击次数" :value="clicked" />
            <view class="demo-block demo-col">
              <je-button block>块级按钮</je-button>
              <je-button-group>
                <je-button type="default">左</je-button>
                <je-button type="default">中</je-button>
                <je-button type="default">右</je-button>
              </je-button-group>
              <je-button-group direction="vertical">
                <je-button size="small">上</je-button>
                <je-button size="small">中</je-button>
                <je-button size="small">下</je-button>
              </je-button-group>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
