<script setup lang="ts">
/*
 * 组件详情页：地址列表（pages/demo/address-list）
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
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">地址列表</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="地址列表" inset>
            <view class="demo-block demo-col">
              <je-address-list :list="addressList" switchable show-edit show-delete />
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
