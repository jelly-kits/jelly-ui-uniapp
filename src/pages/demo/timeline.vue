<script setup lang="ts">
/*
 * 组件详情页：时间线（pages/demo/timeline）
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
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">时间线</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="时间线" inset>
            <view class="demo-block demo-col">
              <je-timeline>
                <je-timeline-item timestamp="2026-10-01" type="success" icon="check">
                  创建了项目
                </je-timeline-item>
                <je-timeline-item timestamp="2026-10-02" type="primary">
                  补充了 66 个组件
                </je-timeline-item>
                <je-timeline-item timestamp="2026-10-06" type="warning" hollow>
                  正在迁移到 uni-app
                </je-timeline-item>
              </je-timeline>
              <je-divider />
              <je-timeline reverse>
                <je-timeline-item timestamp="倒序 1" type="primary">最早的一条排在下方</je-timeline-item>
                <je-timeline-item timestamp="倒序 2" type="success">最新的一条排在上方</je-timeline-item>
              </je-timeline>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
