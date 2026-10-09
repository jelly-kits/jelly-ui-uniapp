<script setup lang="ts">
/*
 * 组件详情页：弹出层（pages/demo/popup）
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

/** 弹出层：三个方向各开一个实例 */
const popupCenter = ref(false)

const popupBottom = ref(false)

const popupLeft = ref(false)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">弹出层</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="弹出层" description="JePopup" inset>
            <je-cell title="居中弹窗" is-link @click="popupCenter = true" />
            <je-cell title="底部弹出" is-link @click="popupBottom = true" />
            <je-cell title="左侧抽屉" is-link @click="popupLeft = true" />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-popup v-model="popupCenter" round closeable>
      <view class="popup-demo">
        <text class="popup-demo__title">居中弹窗</text>
        <text class="popup-demo__desc">点遮罩、右上角 × 或下面按钮都能关闭</text>
        <je-button size="small" @click="popupCenter = false">知道了</je-button>
      </view>
    </je-popup>

    <je-popup v-model="popupBottom" position="bottom" round safe-area-inset-bottom>
      <view class="popup-demo">
        <text class="popup-demo__title">底部弹出</text>
        <text class="popup-demo__desc">底部预留了安全区（safe-area-inset-bottom）</text>
        <je-button size="small" @click="popupBottom = false">关闭</je-button>
      </view>
    </je-popup>

    <je-popup v-model="popupLeft" position="left" round>
      <view class="popup-demo">
        <text class="popup-demo__title">左侧抽屉</text>
        <text class="popup-demo__desc">宽度取 86vw 与 420px 的较小值</text>
        <je-button size="small" @click="popupLeft = false">关闭</je-button>
      </view>
    </je-popup>
  </view>
</template>
