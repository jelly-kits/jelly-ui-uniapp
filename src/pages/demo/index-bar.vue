<script setup lang="ts">
/*
 * 组件详情页：索引栏（pages/demo/index-bar）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
/** 索引栏：用完整字母表演示右侧字母条与滚动定位 */
const indexLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** 每个字母分组造 3 条数据，列表够长才能看出吸顶与索引跳转 */
const indexRows = (letter: string) =>
  [1, 2, 3].map((n) => ({
    id: `${letter}-${n}`,
    title: `${letter} 组联系人 ${n}`,
    value: `NO.${letter}${n}`,
  }))
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="索引栏" route="index-bar" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="索引栏" description="JeIndexBar + JeIndexAnchor（点字母或在字母条上滑动）" inset>
            <je-index-bar :index-list="indexLetters">
              <je-index-anchor v-for="letter in indexLetters" :key="letter" :index="letter">
                <je-cell
                  v-for="row in indexRows(letter)"
                  :key="row.id"
                  :title="row.title"
                  :value="row.value"
                />
              </je-index-anchor>
            </je-index-bar>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
