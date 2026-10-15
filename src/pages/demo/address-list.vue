<script setup lang="ts">
/*
 * 组件详情页：地址列表（pages/demo/address-list）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 地址列表 */
const addressList = [
  {
    id: 1,
    name: '张三',
    tel: '138****8000',
    address: '浙江省杭州市西湖区文三路 100 号',
    isDefault: true,
    tag: '家',
  },
  {
    id: 2,
    name: '李四',
    tel: '139****9000',
    address: '上海市浦东新区世纪大道 1 号',
    tag: '公司',
  },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="地址列表" route="address-list" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="地址列表" inset>
            <view class="demo-block demo-col">
              <je-address-list :list="addressList" switchable show-edit show-delete />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
