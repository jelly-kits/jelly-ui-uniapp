<script setup lang="ts">
/*
 * 组件详情页：手写签名（pages/demo/signature）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 手写签名：画布是否为空 */
const signatureEmpty = ref(true)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="手写签名" route="signature" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="手写签名" description="JeSignature（canvas 绘制，可撤销 / 清空）" inset>
            <view class="demo-signature">
              <je-signature
                :height="180"
                pen-color="#1F2937"
                background-color="#F8FAFC"
                @change="signatureEmpty = $event"
              />
            </view>
            <je-cell title="画布状态" :value="signatureEmpty ? '空的' : '已书写'" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
