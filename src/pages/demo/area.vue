<script setup lang="ts">
/*
 * 组件详情页：省市区选择（pages/demo/area）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { computed, ref } from 'vue'
import type { JeAreaOption } from '../../components/je-area'

/** 省市区 */
const areaValue = ref<(string | number)[]>([])

const areaList: JeAreaOption[] = [
  {
    text: '浙江省',
    value: '330000',
    children: [
      {
        text: '杭州市',
        value: '330100',
        children: [
          { text: '西湖区', value: '330106' },
          { text: '滨江区', value: '330108' },
        ],
      },
      {
        text: '宁波市',
        value: '330200',
        children: [{ text: '海曙区', value: '330203' }],
      },
    ],
  },
  {
    text: '广东省',
    value: '440000',
    children: [
      {
        text: '深圳市',
        value: '440300',
        children: [{ text: '南山区', value: '440305' }],
      },
    ],
  },
]

/** 把「省 / 市 / 区」这类树形选中值翻译成可读文案（JeArea / JeCascader 共用） */
interface DemoTreeNode {
  value: string | number
  text?: string
  label?: string
  children?: DemoTreeNode[]
}

const resolveLabels = (values: (string | number)[], nodes: DemoTreeNode[]) => {
  const labels: string[] = []
  let level: DemoTreeNode[] = nodes
  for (const value of values) {
    const node = level.find((item) => item.value === value)
    if (!node) break
    labels.push(node.label ?? node.text ?? String(value))
    level = node.children ?? []
  }
  return labels.join(' / ')
}

const areaText = computed(() => resolveLabels(areaValue.value, areaList) || '—')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="省市区选择" route="area" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="省市区选择" description="JeArea" inset>
            <view class="demo-block">
              <je-area v-model="areaValue" :area-list="areaList" title="选择地区" />
            </view>
            <je-cell title="已选" :value="areaText" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
