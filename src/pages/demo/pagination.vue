<script setup lang="ts">
/*
 * 组件详情页：分页（pages/demo/pagination）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 分页 */
const paginationPage = ref(3)
const paginationSize = ref(10)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="分页" route="pagination" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="分页" description="JePagination（页码 / 每页条数 / 跳页）" inset>
            <view class="demo-block">
              <je-pagination
                v-model="paginationPage"
                :total="120"
                :page-size="paginationSize"
                layout="total, sizes, prev, pager, next, jumper"
                background
                @update:page-size="paginationSize = $event"
              />
            </view>
            <je-cell title="当前页" :value="paginationPage" />
            <je-cell title="每页条数" :value="`${paginationSize} 条/页`" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
