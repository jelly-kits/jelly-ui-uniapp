<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import JeEmpty from '../je-empty/je-empty.vue'
import JeIcon from '../je-icon/je-icon.vue'
import { useJeLocale } from '../je-locale'
import type { JeTableColumn, JeTableProps, JeTableRow } from './types'

/**
 * uni 端 JeTable：主库（web 端）的移动端子集。
 *
 * 保留：卡片形态（列名 / 值区块、勾选、序号、展开行、树形数据）、基础表格形态（横向滚动）。
 * 去掉：排序 / 列筛选 / 合计行 / 分组小计 / 虚拟滚动 / 固定列 / 列宽拖拽 / 单元格框选 / hover 提示
 * —— 这些能力依赖桌面端的鼠标交互或 table-layout 语义，在移动端没有对应操作。
 *
 * 相对主库的两处 API 差异：
 * 1. 单元格插槽从 `#col-<prop>` 收集为统一的 `#cell`（小程序端 `<slot>` 的 name 必须是静态字符串，
 *    动态插槽名不可靠），作用域里带 column 供调用方分支；
 * 2. 展开行插槽固定为 `#expand`，没有 `#expand-<prop>` 变体。
 */

defineOptions({ name: 'JeTable' })

const props = withDefaults(defineProps<JeTableProps>(), {
  layout: 'auto',
  cardLabelPosition: 'left',
  size: 'default',
  border: false,
  stripe: false,
  showHeader: true,
  emptyText: undefined,
  rowKey: 'id',
  highlightCurrentRow: false,
  currentRowKey: undefined,
  rowClassName: '',
  rowStyle: undefined,
  cellClassName: '',
  cellStyle: undefined,
  spanMethod: undefined,
  defaultExpandAll: false,
  expandRowKeys: undefined,
  treeProps: () => ({ children: 'children', hasChildren: 'hasChildren' }),
})

const emit = defineEmits<{
  /** 行被点击时触发，回传行数据与行下标 */
  'row-click': [row: JeTableRow, index: number]
  /** 勾选变化时触发，回传当前全部选中行；调用暴露的 toggleRowSelection 等 API 不会触发 */
  'selection-change': [rows: JeTableRow[]]
  /** 当前高亮行变化时触发，仅在 highlightCurrentRow 生效；切换时会同时回传旧值 */
  'current-change': [currentRow: JeTableRow | null, oldCurrentRow: JeTableRow | null]
  /** 展开行展开 / 收起时触发，expanded 为最新状态 */
  'expand-change': [row: JeTableRow, expanded: boolean]
  /** 树形子行展开 / 收起时触发（与展开行的 expand-change 是两回事） */
  'tree-expand-change': [row: JeTableRow, expanded: boolean]
}>()

const { t } = useJeLocale()

/** 空态文案：外部没传时回退语言包的通用空态文案 */
const emptyText = computed(() => props.emptyText ?? t('empty'))

/**
 * 窄屏判定：小程序端没有 window，恒按窄屏处理；
 * H5 在挂载时按视口宽判一次（口径与其它组件的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

/** 卡片形态：layout 显式指定为准，auto 时由屏幕宽度决定 */
const cardMode = computed(
  () => props.layout === 'card' || (props.layout === 'auto' && isMobile.value),
)

// ---------------- key ----------------

/**
 * 行 key 支持字符串字段名与函数两种写法。
 * 字符串按 `.` 拆层读取（`user.info.id`），是为了兼容 Element Plus 的 row-key 用法。
 */
const getRowKey = (row: JeTableRow, index: number): string | number => {
  const source = props.rowKey
  let raw: unknown
  if (typeof source === 'function') {
    raw = source(row)
  } else {
    raw = source.split('.').reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[segment]
      return undefined
    }, row)
  }
  return typeof raw === 'string' || typeof raw === 'number' ? raw : index
}

/** 列 key：优先 prop，没有 prop 的特殊列退化为 type */
const colKeyOf = (column: JeTableColumn): string => column.prop ?? column.type ?? ''

// ---------------- 列 ----------------

/**
 * 叶子列：真正承载数据的列。
 * 多级表头下 columns 是一棵树，分组列（有 children 的列）只在表格形态的表头里出现，
 * 卡片形态连同子列一起被展平。
 */
const leafColumns = computed<JeTableColumn[]>(() => {
  const out: JeTableColumn[] = []
  const walk = (columns: JeTableColumn[]) => {
    columns.forEach((column) => {
      if (column.children?.length) walk(column.children)
      else out.push(column)
    })
  }
  walk(props.columns)
  return out
})

const selectionColumn = computed(() => leafColumns.value.find((column) => column.type === 'selection'))
const indexColumn = computed(() => leafColumns.value.find((column) => column.type === 'index'))
const expandTypeColumn = computed(() => leafColumns.value.find((column) => column.type === 'expand'))
const hasExpandColumn = computed(() => !!expandTypeColumn.value)

/** 卡片正文显示的列：勾选 / 序号 / 展开三类特殊列不占「列名 + 值」的行，改为在区块头部呈现 */
const cardColumns = computed(() => leafColumns.value.filter((column) => !column.type))

/** 树形箭头落在第一个普通列（非 selection / index / expand）上 */
const treeColumnIndex = computed(() => {
  const index = leafColumns.value.findIndex((column) => !column.type)
  return index === -1 ? 0 : index
})

/** 单元格对齐：显式 align 优先；勾选 / 序号 / 展开三类特殊列默认居中 */
const alignOf = (column: JeTableColumn, header = false): 'left' | 'center' | 'right' | undefined => {
  const fallback = column.type ? 'center' : undefined
  return header ? column.headerAlign ?? column.align ?? fallback : column.align ?? fallback
}

const DEFAULT_COLUMN_WIDTH = 120

/** 特殊列的默认宽度：勾选 / 展开要够手指点，序号稍宽一点 */
const defaultWidthOf = (column: JeTableColumn): number => {
  if (column.type === 'selection' || column.type === 'expand') return 64
  if (column.type === 'index') return 72
  return DEFAULT_COLUMN_WIDTH
}

/**
 * 列宽：数字按 px、字符串原样，都没写就用该列的默认宽度。
 * flexGrow 1 + flexShrink 0：一屏放得下时各列均分富余空间，放不下时按 flexBasis 撑开供横向滚动。
 */
const columnBasisStyle = (column: JeTableColumn) => {
  const raw = column.width ?? column.minWidth
  const basis =
    typeof raw === 'number'
      ? `${raw}px`
      : typeof raw === 'string' && raw
        ? raw
        : `${defaultWidthOf(column)}px`
  return { flexGrow: 1, flexShrink: 0, flexBasis: basis }
}

// ---------------- 树形数据 ----------------

const treeChildrenKey = computed(() => props.treeProps?.children ?? 'children')

/** 行的直接子行；字段不是数组时视为没有子行 */
const treeChildrenOf = (row: JeTableRow): JeTableRow[] => {
  const raw = row[treeChildrenKey.value]
  return Array.isArray(raw) ? (raw as JeTableRow[]) : []
}

const hasTreeChildren = (row: JeTableRow): boolean => treeChildrenOf(row).length > 0

/** 顶层行里是否存在树形结构；没有的话整条树形渲染链路都空转 */
const hasTreeData = computed(() => props.data.some((row) => hasTreeChildren(row)))

/** 树形行的展开状态，与展开行（type=expand 列）的 expandedKeys 完全分开 */
const treeExpandedKeys = ref<Array<string | number>>([])

const toggleTreeRow = (row: JeTableRow, index: number) => {
  const key = getRowKey(row, index)
  if (treeExpandedKeys.value.includes(key)) {
    treeExpandedKeys.value = treeExpandedKeys.value.filter((item) => item !== key)
    emit('tree-expand-change', row, false)
    return
  }
  treeExpandedKeys.value = [...treeExpandedKeys.value, key]
  emit('tree-expand-change', row, true)
}

/** 递归收集所有含子行的 key，供 defaultExpandAll 一次性铺开 */
const collectTreeKeys = (rows: JeTableRow[]): Array<string | number> => {
  const keys: Array<string | number> = []
  rows.forEach((row, index) => {
    if (!hasTreeChildren(row)) return
    keys.push(getRowKey(row, index))
    keys.push(...collectTreeKeys(treeChildrenOf(row)))
  })
  return keys
}

// ---------------- 行索引 ----------------

/**
 * 行对象 ↔ key 的双向索引。
 * 树形子行不在 props.data 顶层，`data.indexOf(row)` 找不到，所以整棵树都建上索引。
 */
const rowKeyIndex = computed(() => {
  const byRow = new Map<JeTableRow, string | number>()
  const byKey = new Map<string | number, JeTableRow>()
  const walk = (rows: JeTableRow[]) => {
    rows.forEach((row, index) => {
      const key = getRowKey(row, index)
      byRow.set(row, key)
      if (!byKey.has(key)) byKey.set(key, row)
      walk(treeChildrenOf(row))
    })
  }
  walk(props.data)
  return { byRow, byKey }
})

const rowByKey = (key: string | number | null | undefined): JeTableRow | null =>
  key == null ? null : rowKeyIndex.value.byKey.get(key) ?? null

/** 命令式 API 传入的行对象到 key 的换算 */
const keyOf = (row: JeTableRow): string | number => {
  const found = rowKeyIndex.value.byRow.get(row)
  if (found != null) return found
  const index = props.data.indexOf(row)
  return getRowKey(row, index === -1 ? 0 : index)
}

// ---------------- 多选 ----------------

const selectedKeys = ref<Array<string | number>>([])

/** selection 列可以按行禁用；被禁用的行不参与全选 */
const isSelectable = (row: JeTableRow, index: number) => {
  const column = selectionColumn.value
  return column?.selectable ? column.selectable(row, index) !== false : true
}

const selectableIndexes = computed(() =>
  props.data.reduce<number[]>((list, row, index) => {
    if (isSelectable(row, index)) list.push(index)
    return list
  }, []),
)

const isRowSelected = (row: JeTableRow, index: number) =>
  selectedKeys.value.includes(getRowKey(row, index))

const selectedRows = computed(() =>
  props.data.filter((row, index) => selectedKeys.value.includes(getRowKey(row, index))),
)

const allSelected = computed(
  () =>
    selectableIndexes.value.length > 0 &&
    selectableIndexes.value.every((index) =>
      selectedKeys.value.includes(getRowKey(props.data[index], index)),
    ),
)

const someSelected = computed(() => selectedRows.value.length > 0 && !allSelected.value)

const toggleRow = (row: JeTableRow, index: number) => {
  const key = getRowKey(row, index)
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter((item) => item !== key)
    : [...selectedKeys.value, key]
  emit('selection-change', selectedRows.value)
}

const toggleAll = () => {
  selectedKeys.value = allSelected.value
    ? []
    : selectableIndexes.value.map((index) => getRowKey(props.data[index], index))
  emit('selection-change', selectedRows.value)
}

/**
 * data 变了一次就按 key 重新过滤选中项。
 * 不这么做的话，重新请求之后 key 已经不存在的行仍会被算进 selectedRows，「已选 N 行」会跟着错。
 */
watch(
  [() => props.data, () => props.rowKey],
  () => {
    // 树形子行也算有效行，否则展开出来的子行勾选会被当成脏数据清掉
    const valid = new Set(rowKeyIndex.value.byRow.values())
    const next = selectedKeys.value.filter((key) => valid.has(key))
    if (next.length !== selectedKeys.value.length) selectedKeys.value = next

    if (!currentControlled.value && currentKey.value != null && !valid.has(currentKey.value)) {
      currentKey.value = null
    }
  },
  { deep: false },
)

// ---------------- 展开行 ----------------

const expandedKeys = ref<Array<string | number>>([])

const isExpanded = (row: JeTableRow, index: number) =>
  expandedKeys.value.includes(getRowKey(row, index))

const setRowExpanded = (row: JeTableRow, index: number, expanded: boolean) => {
  const key = getRowKey(row, index)
  if (expanded === expandedKeys.value.includes(key)) return
  expandedKeys.value = expanded
    ? [...expandedKeys.value, key]
    : expandedKeys.value.filter((item) => item !== key)
  emit('expand-change', row, expanded)
}

const toggleRowExpansionByIndex = (row: JeTableRow, index: number) => {
  setRowExpanded(row, index, !isExpanded(row, index))
}

const expandIcon = (row: JeTableRow, index: number) =>
  isExpanded(row, index) ? 'chevron-down' : 'chevron-right'

const expandAriaLabel = (row: JeTableRow, index: number) =>
  isExpanded(row, index) ? '收起展开行' : '展开行'

// defaultExpandAll 只在初始化时铺一次：之后用户手动收起的行不该被重新展开
if (props.defaultExpandAll && hasExpandColumn.value) {
  expandedKeys.value = props.data.map((row, index) => getRowKey(row, index))
}
if (props.defaultExpandAll && hasTreeData.value) {
  treeExpandedKeys.value = collectTreeKeys(props.data)
}

// 受控 expandRowKeys 是「合并」语义：只把外部指定的 key 并进来，不覆盖用户的手动展开
watch(
  () => props.expandRowKeys,
  (keys) => {
    if (!keys?.length) return
    const merged = new Set(expandedKeys.value)
    keys.forEach((key) => merged.add(key))
    expandedKeys.value = [...merged]
  },
  { immediate: true, deep: false },
)

// ---------------- 当前行高亮 ----------------

const currentKey = ref<string | number | null>(null)

/** 传了 currentRowKey 就完全受控：内部不再落状态，全部以外部值为准 */
const currentControlled = computed(() => props.currentRowKey !== undefined)

const highlightEnabled = computed(() => props.highlightCurrentRow === true)

const isCurrentRow = (row: JeTableRow, index: number) => {
  const key = currentControlled.value ? props.currentRowKey : currentKey.value
  return key != null && getRowKey(row, index) === key
}

const setCurrentRowByKey = (key: string | number | null) => {
  if (currentControlled.value) return
  if (currentKey.value === key) return
  const previous = rowByKey(currentKey.value)
  currentKey.value = key
  emit('current-change', rowByKey(key), previous)
}

/** row-click 是高亮与行事件共用的入口：先决定高亮，再无条件抛出点击事件 */
const onRowClick = (row: JeTableRow, index: number) => {
  if (highlightEnabled.value) {
    const key = getRowKey(row, index)
    setCurrentRowByKey(isCurrentRow(row, index) ? null : key)
  }
  emit('row-click', row, index)
}

// currentRowKey 被外部改动时也要通知出去，否则父组件拿不到「旧值」做清理
watch(
  () => props.currentRowKey,
  (key, oldKey) => {
    if (key === oldKey) return
    emit('current-change', rowByKey(key), rowByKey(oldKey))
  },
)

// ---------------- 渲染行 ----------------

interface JeTableRenderRow {
  row: JeTableRow
  key: string | number
  level: number
  hasChildren: boolean
  expanded: boolean
}

/**
 * 真正渲染的行：树形数据下按展开状态展平，收起的分支不进结果。
 * uni 端不做筛选 / 排序，所以这里只有展平一步。
 */
const renderRows = computed<JeTableRenderRow[]>(() => {
  const build = (row: JeTableRow, level: number, index: number): JeTableRenderRow[] => {
    const key = getRowKey(row, index)
    const hasChildren = hasTreeChildren(row)
    const expanded = hasChildren && treeExpandedKeys.value.includes(key)
    const list: JeTableRenderRow[] = [{ row, key, level, hasChildren, expanded }]
    if (expanded) {
      treeChildrenOf(row).forEach((child, childIndex) => {
        list.push(...build(child, level + 1, childIndex))
      })
    }
    return list
  }
  const out: JeTableRenderRow[] = []
  props.data.forEach((row, index) => out.push(...build(row, 0, index)))
  return out
})

const isTreeCell = (item: JeTableRenderRow, columnIndex: number) =>
  hasTreeData.value &&
  columnIndex === treeColumnIndex.value &&
  (item.level > 0 || item.hasChildren)

/** 区块头部是否有内容：勾选框、展开箭头、树形箭头、序号，任一存在才渲染头部 */
const cardHasHeader = (item: JeTableRenderRow) =>
  !!selectionColumn.value ||
  !!indexColumn.value ||
  hasExpandColumn.value ||
  isTreeCell(item, treeColumnIndex.value)

// ---------------- 合并单元格（仅横向） ----------------

/**
 * 横向跨度：返回 0 的单元格被左侧吸收，这里归一成 1 —— 真正的「跳过」由 layoutCells 的游标推进完成。
 * rowspan 在 flex 行里无法表达，一律忽略。
 */
const colspanOf = (row: JeTableRow, column: JeTableColumn, rowIndex: number, columnIndex: number): number => {
  const span = props.spanMethod?.({ row, column, rowIndex, columnIndex })
  if (!span) return 1
  const raw = Array.isArray(span) ? span[1] : span.colspan
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 1 ? Math.floor(raw) : 1
}

interface JeTableLayoutCell {
  column: JeTableColumn
  columnIndex: number
  colspan: number
}

/** 一行里真正渲染的单元格：被上一个单元格 colspan 覆盖的列直接跳过 */
const layoutCells = (row: JeTableRow, rowIndex: number): JeTableLayoutCell[] => {
  const columns = leafColumns.value
  const out: JeTableLayoutCell[] = []
  let index = 0
  while (index < columns.length) {
    const column = columns[index]
    const colspan = props.spanMethod ? colspanOf(row, column, rowIndex, index) : 1
    out.push({ column, columnIndex: index, colspan })
    index += colspan
  }
  return out
}

// ---------------- 内容与样式 ----------------

const display = (row: JeTableRow, column: JeTableColumn): string => {
  if (column.formatter) return column.formatter(row, column)
  const value = column.prop ? row[column.prop] : undefined
  return value == null ? '' : String(value)
}

/** type=index 列的序号：支持数字偏移与自定义函数，分页时的全局序号靠它 */
const indexText = (column: JeTableColumn, index: number) => {
  const base = index + 1
  const custom = column.index
  if (typeof custom === 'function') return String(custom(index))
  if (typeof custom === 'number') return String(base + custom)
  return String(base)
}

/** 单元格行内样式：列上的 cellStyle 覆盖表格级 cellStyle 的同名属性 */
const cellInlineStyle = (column: JeTableColumn, row: JeTableRow, rowIndex: number, columnIndex: number) => {
  const base =
    typeof props.cellStyle === 'function'
      ? props.cellStyle({ row, column, rowIndex, columnIndex })
      : props.cellStyle
  const own =
    typeof column.cellStyle === 'function'
      ? column.cellStyle({ row, column, rowIndex, columnIndex })
      : column.cellStyle
  return { ...(base ?? {}), ...(own ?? {}) }
}

/** 单元格类名：列自身 className + 列级回调 + 表格级（字符串或回调） */
const cellClassOf = (column: JeTableColumn, row: JeTableRow, rowIndex: number, columnIndex: number) => {
  const names: Array<string | undefined> = [column.className]
  if (typeof column.cellClassName === 'function') {
    names.push(column.cellClassName({ row, column, rowIndex, columnIndex }))
  }
  names.push(
    typeof props.cellClassName === 'function'
      ? props.cellClassName({ row, column, rowIndex, columnIndex })
      : props.cellClassName,
  )
  return names.filter(Boolean).join(' ')
}

const headerCellClassOf = (column: JeTableColumn) =>
  [column.className, column.labelClassName].filter(Boolean).join(' ')

const rowBind = (row: JeTableRow, rowIndex: number) => {
  const customStyle =
    typeof props.rowStyle === 'function' ? props.rowStyle({ row, rowIndex }) : props.rowStyle
  return {
    class: [
      typeof props.rowClassName === 'function'
        ? props.rowClassName({ row, rowIndex })
        : props.rowClassName,
      {
        'is-current': highlightEnabled.value && isCurrentRow(row, rowIndex),
        // 斑马纹走类名而不是 :nth-child(even)：展开行会插进行列表，用 DOM 序号会让斑马纹错位
        'is-stripe-row': props.stripe && rowIndex % 2 === 1,
      },
    ],
    style: customStyle,
  }
}

/** 树形缩进：一层 16px，箭头本身占 24px */
const treeIndentStyle = (item: JeTableRenderRow) => ({
  paddingLeft: `${item.level * 16}px`,
})

// ---------------- 命令式 API ----------------

const clearSelection = () => {
  selectedKeys.value = []
  emit('selection-change', [])
}

const getSelectionRows = () => selectedRows.value

const toggleRowSelection = (row: JeTableRow, selected?: boolean) => {
  const key = keyOf(row)
  const has = selectedKeys.value.includes(key)
  const next = selected ?? !has
  if (next === has) return
  selectedKeys.value = next
    ? [...selectedKeys.value, key]
    : selectedKeys.value.filter((item) => item !== key)
  emit('selection-change', selectedRows.value)
}

const toggleAllSelection = () => toggleAll()

const toggleRowExpansion = (row: JeTableRow, expanded?: boolean) => {
  const index = props.data.indexOf(row)
  const safeIndex = index === -1 ? 0 : index
  setRowExpanded(row, safeIndex, expanded ?? !isExpanded(row, safeIndex))
}

const setCurrentRow = (row?: JeTableRow | null) => {
  setCurrentRowByKey(row ? keyOf(row) : null)
}

defineExpose({
  clearSelection,
  getSelectionRows,
  toggleRowSelection,
  toggleAllSelection,
  toggleRowExpansion,
  setCurrentRow,
})
</script>

<template>
  <view
    class="je-table"
    :class="[
      `je-table--${size}`,
      {
        'is-card': cardMode,
        'is-border': border && !cardMode,
        'is-stripe': stripe && !cardMode,
        'is-highlight': highlightEnabled,
        'is-tree': hasTreeData,
        'is-label-top': cardLabelPosition === 'top',
      },
    ]"
  >
    <!-- 卡片形态：宽屏表格在窄屏下的降级形态，也是小程序端的默认形态 -->
    <view v-if="cardMode" class="je-table__cards">
      <view v-if="!renderRows.length" class="je-table__empty">
        <JeEmpty :description="emptyText" :image-size="80" />
      </view>

      <view
        v-for="(item, rowIndex) in renderRows"
        :key="item.key"
        class="je-table-card"
        :class="rowBind(item.row, rowIndex).class"
        :style="rowBind(item.row, rowIndex).style"
        @tap="onRowClick(item.row, rowIndex)"
      >
        <view v-if="cardHasHeader(item)" class="je-table-card__head">
          <!-- 勾选框用 view 自绘：小程序原生 checkbox 的样式没法跟主题变量对齐 -->
          <view
            v-if="selectionColumn"
            class="je-table__check"
            :aria-label="`选择第 ${rowIndex + 1} 行`"
            @tap.stop="toggleRow(item.row, rowIndex)"
          >
            <view
              class="je-table__check-box"
              :class="{
                'is-checked': isRowSelected(item.row, rowIndex),
                'is-disabled': !isSelectable(item.row, rowIndex),
              }"
            >
              <JeIcon v-if="isRowSelected(item.row, rowIndex)" name="check" :size="12" />
            </view>
          </view>

          <!-- 树形箭头：卡片模式不做缩进，用箭头直接表达「能否展开子行」 -->
          <view
            v-if="isTreeCell(item, treeColumnIndex)"
            class="je-table__tree-toggle"
            :aria-label="item.expanded ? '收起子行' : '展开子行'"
            @tap.stop="toggleTreeRow(item.row, rowIndex)"
          >
            <JeIcon :name="item.expanded ? 'chevron-down' : 'chevron-right'" :size="16" />
          </view>

          <view
            v-if="hasExpandColumn"
            class="je-table__expand"
            :aria-label="expandAriaLabel(item.row, rowIndex)"
            @tap.stop="toggleRowExpansionByIndex(item.row, rowIndex)"
          >
            <JeIcon :name="expandIcon(item.row, rowIndex)" :size="16" />
          </view>

          <text v-if="indexColumn" class="je-table-card__index">
            {{ indexText(indexColumn, rowIndex) }}
          </text>
        </view>

        <view class="je-table-card__body">
          <view
            v-for="(column, columnIndex) in cardColumns"
            :key="colKeyOf(column) || columnIndex"
            class="je-table-card__field"
          >
            <text class="je-table-card__label">{{ column.label }}</text>
            <view class="je-table-card__value">
              <!-- 与表格形态共用 #cell，作用域保持一致；rowspan / colspan 在卡片里恒为 1 -->
              <slot
                name="cell"
                :row="item.row"
                :column="column"
                :value="display(item.row, column)"
                :index="rowIndex"
                :rowspan="1"
                :colspan="1"
                :level="item.level"
                :has-children="item.hasChildren"
              >
                <text>{{ display(item.row, column) }}</text>
              </slot>
            </view>
          </view>
        </view>

        <!-- 展开内容：与表格形态共用同一个插槽 -->
        <view v-if="hasExpandColumn && isExpanded(item.row, rowIndex)" class="je-table-card__expand">
          <slot name="expand" :row="item.row" :index="rowIndex" :expanded="true" />
        </view>
      </view>
    </view>

    <!-- 表格形态：列多时横向滚动；不做固定列 / 列宽拖拽 / 虚拟滚动 -->
    <scroll-view v-else scroll-x class="je-table__scroll-x">
      <view class="je-table__grid">
        <view v-if="showHeader" class="je-table__row je-table__row--head">
          <view
            v-for="column in leafColumns"
            :key="`head-${colKeyOf(column) || column.label}`"
            class="je-table__cell je-table__cell--head"
            :class="headerCellClassOf(column)"
            :style="[columnBasisStyle(column), { textAlign: alignOf(column, true) }]"
          >
            <!-- selection 列表头放全选：卡片形态没有表头，因此只有表格形态提供全选入口 -->
            <view
              v-if="column.type === 'selection'"
              class="je-table__check"
              aria-label="全选"
              @tap.stop="toggleAll"
            >
              <view
                class="je-table__check-box"
                :class="{ 'is-checked': allSelected, 'is-indeterminate': someSelected }"
              >
                <JeIcon v-if="allSelected" name="check" :size="12" />
                <view v-else-if="someSelected" class="je-table__check-dash" />
              </view>
            </view>
            <text v-else class="je-table__head-text">{{ column.label }}</text>
          </view>
        </view>

        <view v-if="!renderRows.length" class="je-table__empty">
          <JeEmpty :description="emptyText" :image-size="80" />
        </view>

        <template v-for="(item, rowIndex) in renderRows" :key="item.key">
          <view
            class="je-table__row"
            :class="rowBind(item.row, rowIndex).class"
            :style="rowBind(item.row, rowIndex).style"
            @tap="onRowClick(item.row, rowIndex)"
          >
            <view
              v-for="cell in layoutCells(item.row, rowIndex)"
              :key="colKeyOf(cell.column) || cell.columnIndex"
              class="je-table__cell"
              :class="cellClassOf(cell.column, item.row, rowIndex, cell.columnIndex)"
              :style="[
                columnBasisStyle(cell.column),
                cellInlineStyle(cell.column, item.row, rowIndex, cell.columnIndex),
                { textAlign: alignOf(cell.column) },
                cell.colspan > 1 ? { flexGrow: cell.colspan } : {},
              ]"
            >
              <view v-if="cell.column.type === 'selection'" class="je-table__check" @tap.stop="toggleRow(item.row, rowIndex)">
                <view
                  class="je-table__check-box"
                  :class="{
                    'is-checked': isRowSelected(item.row, rowIndex),
                    'is-disabled': !isSelectable(item.row, rowIndex),
                  }"
                >
                  <JeIcon v-if="isRowSelected(item.row, rowIndex)" name="check" :size="12" />
                </view>
              </view>

              <text v-else-if="cell.column.type === 'index'" class="je-table__cell-text">
                {{ indexText(cell.column, rowIndex) }}
              </text>

              <view
                v-else-if="cell.column.type === 'expand'"
                class="je-table__expand"
                :aria-label="expandAriaLabel(item.row, rowIndex)"
                @tap.stop="toggleRowExpansionByIndex(item.row, rowIndex)"
              >
                <JeIcon :name="expandIcon(item.row, rowIndex)" :size="16" />
              </view>

              <view v-else class="je-table__cell-inner" :style="treeIndentStyle(item)">
                <view
                  v-if="isTreeCell(item, cell.columnIndex)"
                  class="je-table__tree-toggle"
                  :aria-label="item.expanded ? '收起子行' : '展开子行'"
                  @tap.stop="toggleTreeRow(item.row, rowIndex)"
                >
                  <JeIcon :name="item.expanded ? 'chevron-down' : 'chevron-right'" :size="16" />
                </view>

                <slot
                  name="cell"
                  :row="item.row"
                  :column="cell.column"
                  :value="display(item.row, cell.column)"
                  :index="rowIndex"
                  :rowspan="1"
                  :colspan="cell.colspan"
                  :level="item.level"
                  :has-children="item.hasChildren"
                >
                  <text class="je-table__cell-text">{{ display(item.row, cell.column) }}</text>
                </slot>
              </view>
            </view>
          </view>

          <view
            v-if="hasExpandColumn && isExpanded(item.row, rowIndex)"
            class="je-table__row je-table__row--expand"
          >
            <view class="je-table__cell je-table__cell--expand">
              <slot name="expand" :row="item.row" :index="rowIndex" :expanded="true" />
            </view>
          </view>
        </template>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.je-table {
  box-sizing: border-box;
  font-family: inherit;
  font-size: 14px;
  color: var(--je-text);
}

.je-table--small {
  font-size: 12px;
}

.je-table--large {
  font-size: 16px;
}

.je-table__empty {
  padding: 24px 0;
  text-align: center;
}

/* ---------------- 卡片形态 ---------------- */

.je-table__cards {
  box-sizing: border-box;
  padding: 12px;
  background: var(--je-surface);
}

.je-table-card {
  box-sizing: border-box;
  margin-bottom: 12px;
  overflow: hidden;
  background: var(--je-surface);
  border: 1px solid var(--je-border-color);
  border-radius: var(--je-radius);
}

/* 相邻卡片之间用 margin 分隔，最后一张不留尾巴 */
.je-table-card:last-child {
  margin-bottom: 0;
}

.je-table-card.is-current {
  border-color: var(--je-primary);
}

.je-table-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--je-surface-hover);
  border-bottom: 1px solid var(--je-border-color);
}

/* 序号靠右，勾选 / 展开 / 树形箭头从左边依次排开 */
.je-table-card__index {
  margin-left: auto;
  font-size: 13px;
  color: var(--je-text-muted);
}

.je-table-card__body {
  padding: 2px 12px;
}

.je-table-card__field {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--je-border-color);
}

/* 字段之间不重复画线，最后一条交给卡片自身的下边框 */
.je-table-card__field:last-child {
  border-bottom: none;
}

.je-table-card__label {
  flex: 0 0 88px;
  font-size: 13px;
  color: var(--je-text-muted);
  word-break: break-word;
}

.je-table-card__value {
  flex: 1 1 0;
  min-width: 0;
  color: var(--je-text);
  word-break: break-word;
}

/* 列名在上：标签独占一行，值另起一行 */
.je-table.is-label-top .je-table-card__field {
  flex-direction: column;
  gap: 4px;
}

.je-table.is-label-top .je-table-card__label {
  flex: 0 0 auto;
}

.je-table-card__expand {
  padding: 12px;
  background: var(--je-surface-hover);
  border-top: 1px solid var(--je-border-color);
}

/* ---------------- 表格形态 ---------------- */

.je-table__scroll-x {
  width: 100%;
}

/*
 * inline-block 让栅格按内容的自然宽度撑开（行内 flex 子项 flexShrink: 0，
 * 所以自然宽度就是各列宽度之和），列多时才会真的溢出 scroll-view 触发横向滚动；
 * min-width: 100% 保证列少时仍铺满一屏。
 */
.je-table__grid {
  display: inline-block;
  min-width: 100%;
  vertical-align: top;
}

.je-table__row {
  display: flex;
  min-width: 100%;
  border-bottom: 1px solid var(--je-border-color);
}

.je-table__row--head {
  font-weight: 600;
  background: var(--je-surface-hover);
}

.je-table.is-border .je-table__cell + .je-table__cell {
  border-left: 1px solid var(--je-border-color);
}

.je-table.is-stripe .je-table__row.is-stripe-row {
  background: var(--je-surface);
}

.je-table__row.is-current {
  background: rgba(102, 126, 234, 0.12);
}

.je-table__cell {
  box-sizing: border-box;
  min-width: 0;
  padding: 10px 12px;
  overflow: hidden;
}

.je-table__cell-text {
  word-break: break-word;
}

/* 展开行整行一个单元格，内边距交给内部内容 */
.je-table__cell--expand {
  flex: 1 1 100%;
  padding: 12px;
  background: var(--je-surface-hover);
}

/* 树形单元格：箭头与文字排在同一行 */
.je-table__cell-inner {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ---------------- 勾选框 ---------------- */

.je-table__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.je-table__check-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  /* 勾只在选中时出现，固定浅色 */
  color: var(--je-text-on-color);
  border: 2px solid var(--je-border-color);
  border-radius: 6px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.je-table__check-box.is-checked,
.je-table__check-box.is-indeterminate {
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-color: transparent;
}

/* 半选横杠压在渐变底上，固定浅色 */
.je-table__check-dash {
  width: 8px;
  height: 2px;
  background: var(--je-text-on-color);
  border-radius: 2px;
}

.je-table__check-box.is-disabled {
  opacity: 0.45;
}

/* ---------------- 展开 / 树形箭头 ---------------- */

.je-table__expand,
.je-table__tree-toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  color: var(--je-text-muted);
  border-radius: 6px;
}

@media (prefers-reduced-motion: reduce) {
  .je-table__check-box {
    transition: none;
  }
}
</style>
