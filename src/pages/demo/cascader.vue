<script setup lang="ts">
/*
 * 组件详情页：级联选择（pages/demo/cascader）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { computed, ref } from 'vue'
import type { JeCascaderOption } from '../../components/je-cascader'

/** 级联 */
const cascaderValue = ref<(string | number)[]>([])

const cascaderOptions: JeCascaderOption[] = [
  {
    value: 'zj',
    label: '浙江',
    children: [
      {
        value: 'hz',
        label: '杭州',
        children: [
          { value: 'xh', label: '西湖区' },
          { value: 'gs', label: '拱墅区' },
          { value: 'bj', label: '滨江区', disabled: true },
        ],
      },
      { value: 'nb', label: '宁波', children: [{ value: 'hs', label: '海曙区' }] },
    ],
  },
  {
    value: 'gd',
    label: '广东',
    children: [{ value: 'sz', label: '深圳', children: [{ value: 'ns', label: '南山区' }] }],
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

const cascaderText = computed(() => resolveLabels(cascaderValue.value, cascaderOptions) || '—')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="级联选择" route="cascader" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="级联选择" description="JeCascader" inset>
            <view class="demo-block">
              <je-cascader v-model="cascaderValue" :options="cascaderOptions" />
            </view>
            <je-cell title="已选" :value="cascaderText" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
