<script setup lang="ts">
/*
 * 组件详情页：下拉菜单栏（pages/demo/dropdown-menu）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 下拉菜单栏：两列各自受控，值互不影响 */
const dropdownMenuSort = ref<string | number>('default')

const dropdownMenuSortOptions = [
  { text: '综合排序', value: 'default' },
  { text: '销量优先', value: 'sales', tip: '近 30 天' },
  { text: '价格从低到高', value: 'price-asc' },
  { text: '价格从高到低', value: 'price-desc' },
]

const dropdownMenuStock = ref<string | number>('all')

const dropdownMenuStockOptions = [
  { text: '全部', value: 'all' },
  { text: '仅看有货', value: 'in-stock' },
  { text: '预售', value: 'presale', disabled: true },
]
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="下拉菜单栏" route="dropdown-menu" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="下拉菜单栏" description="JeDropdownMenu + JeDropdownMenuItem（选项式，两列独立）" inset>
            <je-dropdown-menu>
              <je-dropdown-menu-item v-model="dropdownMenuSort" title="排序" :options="dropdownMenuSortOptions" />
              <je-dropdown-menu-item v-model="dropdownMenuStock" title="库存" :options="dropdownMenuStockOptions" />
            </je-dropdown-menu>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
