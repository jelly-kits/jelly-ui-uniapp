<script setup lang="ts">
/*
 * 组件详情页：提示与结果（pages/demo/alert-result）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="提示与结果" route="alert-result" />

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
