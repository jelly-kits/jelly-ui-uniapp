<script setup lang="ts">
/*
 * 组件详情页：提示与结果（pages/demo/alert-result）
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
        <text class="doc__title">提示与结果</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="提示与结果" inset>
            <view class="demo-block demo-col">
              <je-alert type="info" title="提示" description="这是一条信息提示" />
              <je-alert type="success" title="成功" description="操作已完成" />
              <je-alert type="warning" title="警告" description="请注意风险" closable />
              <je-alert type="error" title="错误" description="操作失败，请重试" />
              <je-result icon="success" title="提交成功" sub-title="我们会在 1 个工作日内处理" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
