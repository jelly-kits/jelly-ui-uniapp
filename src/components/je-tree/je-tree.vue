<script setup lang="ts">
import { computed, nextTick, provide, ref, watch } from 'vue'
import JeEmpty from '../je-empty/je-empty.vue'
import JeTreeNodeView from '../je-tree-node-view/je-tree-node-view.vue'
import { useJeLocale } from '../je-locale'
import { jeTreeKey, type JeTreeNode, type JeTreeContext } from './types'

defineOptions({ name: 'JeTree' })

const props = withDefaults(
  defineProps<{
    data: JeTreeNode[]
    modelValue?: Array<string | number>
    multiple?: boolean
    checkable?: boolean
    checkStrictly?: boolean
    accordion?: boolean
    defaultExpandAll?: boolean
    defaultExpandedKeys?: Array<string | number>
    expandOnClickNode?: boolean
    /** 数据为空时的提示文案，未传时用语言包的 empty 文案 */
    emptyText?: string
  }>(),
  {
    modelValue: () => [],
    multiple: false,
    checkable: false,
    checkStrictly: false,
    accordion: false,
    defaultExpandAll: false,
    expandOnClickNode: true,
    emptyText: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Array<string | number>]
  'node-click': [node: JeTreeNode]
  'check-change': [node: JeTreeNode, checked: boolean]
  'node-expand': [keys: Array<string | number>]
  'node-collapse': [keys: Array<string | number>]
}>()

const { t } = useJeLocale()

/** 空态文案：外部没传时回退语言包的通用空态文案 */
const emptyText = computed(() => props.emptyText ?? t('empty'))

const rootRef = ref<HTMLElement | null>(null)

/** 全量节点（含被收起的）拍平成一层，便于查父级 / 求后代 */
const flatList = computed(() => {
  const list: Array<{ node: JeTreeNode; parentKey: string | number | null }> = []
  const walk = (nodes: JeTreeNode[], parentKey: string | number | null) => {
    for (const node of nodes) {
      list.push({ node, parentKey })
      if (node.children?.length) walk(node.children, node.key)
    }
  }
  walk(props.data, null)
  return list
})

const nodeMap = computed(() => {
  const map = new Map<string | number, JeTreeNode>()
  for (const item of flatList.value) map.set(item.node.key, item.node)
  return map
})

const parentMap = computed(() => {
  const map = new Map<string | number, string | number>()
  for (const item of flatList.value) {
    if (item.parentKey !== null) map.set(item.node.key, item.parentKey)
  }
  return map
})

const expandedKeys = ref<Array<string | number>>(
  props.defaultExpandAll
    ? flatList.value.map((item) => item.node.key)
    : [...(props.defaultExpandedKeys ?? [])],
)
const checkedKeys = ref<Array<string | number>>([])
const selectedKeys = computed(() => props.modelValue)
const activeKey = ref<string | number | null>(null)

const isExpanded = (key: string | number) => expandedKeys.value.includes(key)
const isChecked = (key: string | number) => checkedKeys.value.includes(key)
const isSelected = (key: string | number) => selectedKeys.value.includes(key)
const isActive = (key: string | number) => activeKey.value === key
const hasChildren = (node: JeTreeNode) => !!node.children?.length

/** 当前可见节点（收起节点的后代不参与键盘遍历） */
const visibleKeys = computed(() => {
  const keys: Array<string | number> = []
  const walk = (nodes: JeTreeNode[]) => {
    for (const node of nodes) {
      keys.push(node.key)
      if (node.children?.length && isExpanded(node.key)) walk(node.children)
    }
  }
  walk(props.data)
  return keys
})

watch(
  visibleKeys,
  (keys) => {
    if (activeKey.value === null || !keys.includes(activeKey.value)) {
      activeKey.value = keys[0] ?? null
    }
  },
  { immediate: true },
)

const collectDescendants = (node: JeTreeNode): JeTreeNode[] => {
  const result: JeTreeNode[] = []
  const walk = (children?: JeTreeNode[]) => {
    for (const child of children ?? []) {
      result.push(child)
      walk(child.children)
    }
  }
  walk(node.children)
  return result
}

const isIndeterminate = (node: JeTreeNode) => {
  if (!hasChildren(node) || isChecked(node.key)) return false
  return collectDescendants(node).some((child) => isChecked(child.key))
}

const toggleExpand = (node: JeTreeNode) => {
  if (!hasChildren(node)) return

  if (isExpanded(node.key)) {
    expandedKeys.value = expandedKeys.value.filter((key) => key !== node.key)
    emit('node-collapse', expandedKeys.value)
    return
  }

  let next = [...expandedKeys.value, node.key]
  // 手风琴：展开一个节点时，收起同级其它节点
  if (props.accordion) {
    const parentKey = parentMap.value.get(node.key)
    const siblings: JeTreeNode[] =
      parentKey == null ? props.data : nodeMap.value.get(parentKey)?.children ?? []
    const siblingKeys = new Set(siblings.map((item) => item.key))
    next = next.filter((key) => !siblingKeys.has(key) || key === node.key)
  }
  expandedKeys.value = next
  emit('node-expand', next)
}

const toggleCheck = (node: JeTreeNode) => {
  if (node.disabled) return
  const next = new Set(checkedKeys.value)
  const checked = !next.has(node.key)

  if (props.checkStrictly) {
    if (checked) next.add(node.key)
    else next.delete(node.key)
  } else {
    const descendants = collectDescendants(node)
    for (const child of descendants) {
      if (checked) next.add(child.key)
      else next.delete(child.key)
    }
    if (checked) next.add(node.key)
    else next.delete(node.key)

    // 自底向上回填：子级全选则父级选中，否则取消
    for (let i = flatList.value.length - 1; i >= 0; i -= 1) {
      const item = flatList.value[i]
      if (!item || !item.node.children?.length) continue
      const allChecked = item.node.children.every((child) => next.has(child.key))
      if (allChecked) next.add(item.node.key)
      else next.delete(item.node.key)
    }
  }

  checkedKeys.value = Array.from(next)
  emit('check-change', node, checked)
}

const selectNode = (node: JeTreeNode) => {
  if (node.disabled) return
  emit('node-click', node)

  const current = props.modelValue
  if (props.multiple) {
    emit(
      'update:modelValue',
      current.includes(node.key)
        ? current.filter((key) => key !== node.key)
        : [...current, node.key],
    )
  } else if (!current.includes(node.key)) {
    emit('update:modelValue', [node.key])
  }
}

const onNodeClick = (node: JeTreeNode) => {
  if (node.disabled) return
  if (props.expandOnClickNode && hasChildren(node)) toggleExpand(node)
  selectNode(node)
}

// #ifdef H5
/** H5 下模板 ref 指向的是 uni-view 实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const findRow = (key: string | number): HTMLElement | null => {
  const root = pick(rootRef.value)
  if (!root) return null
  const rows = root.querySelectorAll<HTMLElement>('[data-tree-key]')
  for (const row of rows) {
    if (row.dataset.treeKey === String(key)) return row
  }
  return null
}

const focusKey = (key: string | number) => {
  activeKey.value = key
  nextTick(() => findRow(key)?.focus())
}
// #endif

const setActive = (key: string | number) => {
  activeKey.value = key
}

/**
 * 键盘导航只存在于 H5：小程序端没有 keydown 事件，整块按 #ifdef 收进 H5，
 * 避免把 document / DOM 调用编进小程序包（端上 @keydown 永不触发）。
 */
const onKeydown = (event: KeyboardEvent) => {
  // #ifdef H5
  const keys = visibleKeys.value
  if (!keys.length) return

  const index = activeKey.value === null ? -1 : keys.indexOf(activeKey.value)
  const current = activeKey.value !== null ? nodeMap.value.get(activeKey.value) : undefined

  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault()
      const next = keys[Math.min(index + 1, keys.length - 1)]
      if (next !== undefined) focusKey(next)
      break
    }
    case 'ArrowUp': {
      event.preventDefault()
      const prev = keys[Math.max(index - 1, 0)]
      if (prev !== undefined) focusKey(prev)
      break
    }
    case 'ArrowRight': {
      if (!current?.children?.length) return
      event.preventDefault()
      if (isExpanded(current.key)) {
        const first = current.children[0]
        if (first) focusKey(first.key)
      } else {
        toggleExpand(current)
      }
      break
    }
    case 'ArrowLeft': {
      if (!current) return
      event.preventDefault()
      if (current.children?.length && isExpanded(current.key)) {
        toggleExpand(current)
      } else {
        const parentKey = parentMap.value.get(current.key)
        if (parentKey !== undefined) focusKey(parentKey)
      }
      break
    }
    case 'Enter':
    case ' ': {
      if (!current) return
      event.preventDefault()
      selectNode(current)
      break
    }
  }
  // #endif
}

const context: JeTreeContext = {
  expandedKeys,
  checkedKeys,
  selectedKeys,
  activeKey,
  checkable: computed(() => props.checkable),
  isExpanded,
  isChecked,
  isSelected,
  isActive,
  isIndeterminate,
  hasChildren,
  setActive,
  toggleExpand,
  toggleCheck,
  onNodeClick,
}

provide(jeTreeKey, context)
</script>

<template>
  <view ref="rootRef" class="je-tree" role="tree" @keydown="onKeydown">
    <template v-if="data.length">
      <JeTreeNodeView v-for="node in data" :key="node.key" :node="node" :level="1" />
    </template>

    <view v-else class="je-tree__empty">
      <JeEmpty :description="emptyText" :image-size="80" />
    </view>
  </view>
</template>

<style scoped>
.je-tree {
  box-sizing: border-box;
  font-family: inherit;
  outline: none;
}

.je-tree__empty {
  padding: 8px 0;
}
</style>
