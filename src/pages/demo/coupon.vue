<script setup lang="ts">
/*
 * 组件详情页：优惠券（pages/demo/coupon）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="优惠券" route="coupon" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="优惠券" inset>
            <view class="demo-block demo-col">
              <je-coupon value="20" title="满 100 减 20" condition="满 100 元可用" validity="2026-12-31 到期" />
              <je-coupon value="9" unit="折" type="success" title="新客折扣" condition="无门槛" />
              <je-coupon value="50" type="danger" title="已使用" status="used" />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
