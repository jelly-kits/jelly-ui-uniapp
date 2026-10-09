<script setup lang="ts">
/*
 * 组件详情页：手写签名（pages/demo/signature）
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

/** 手写签名：画布是否为空 */
const signatureEmpty = ref(true)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">手写签名</text>
      </view>
    </view>

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
