import type { CSSProperties } from 'vue'

/**
 * uni 端 JeTable 的类型定义。
 *
 * 与主库（web 端）的差异：uni 端只保留**移动端有意义**的子集，因此这里没有
 * 排序 / 列筛选 / 合计行 / 虚拟滚动 / 分组小计 / 固定列 / 列宽拖拽 / 单元格框选
 * 等一批 props —— 它们要么依赖桌面端的 hover / 鼠标拖拽，要么在卡片形态下本就不生效。
 * 需要这些能力请在 web 端使用主库的 JeTable。
 *
 * 表格形态用 flex 行 / 列模拟（小程序没有 <table>），所以：
 * - 只支持横向合并 colspan；rowspan 无法在 flex 行里表达，一律按 1 处理；
 * - 列宽只认 width / minWidth，不做「剩余宽度按比例分配」的 table-layout 语义。
 */

/**
 * 表格行数据。
 *
 * 用 index signature 而不是 unknown：组件里通过 `row[column.prop]` 取值，
 * 只有 any/unknown 索引签名才允许这种动态读取；调用方传具体行类型（如 UserRow[]）时
 * 依然能结构化匹配。单元格插槽 / formatter 内部再做收窄，避免把 any 泄到使用方。
 */
export type JeTableRow = Record<string, any>

/** 合并单元格的返回结构，等价于 [rowspan, colspan] */
export interface JeTableCellSpan {
  /** uni 端不生效，恒按 1 处理；保留是为了对齐主库的写法 */
  rowspan?: number
  /** 横向合并的列数；返回 0 表示该单元格被左侧的单元格合并掉，不再渲染 */
  colspan?: number
}

/**
 * 合并单元格回调。
 *
 * 与 Element Plus 的差异：EP 要求「返回 [rowspan, colspan] 数组，调用方自己补 undefined」，
 * 这里额外允许直接返回 { rowspan, colspan } 对象，并且两者都省略 key 就等价于 [1, 1]。
 *
 * uni 端只实现横向合并：返回 0 的格子被左侧单元格吸收，rowspan 忽略。
 * rowIndex 是**当前渲染出来的行**下标（已按树形展平），columnIndex 是**叶子列**下标。
 */
export type JeTableSpanMethod = (payload: {
  row: JeTableRow
  column: JeTableColumn
  rowIndex: number
  columnIndex: number
}) => JeTableCellSpan | [number, number] | undefined

/** 行样式：对象表示所有行共用，函数则按行返回 */
export type JeTableRowStyle = CSSProperties | ((payload: { row: JeTableRow; rowIndex: number }) => CSSProperties)

/** 单元格样式：列上的 cellStyle 优先于表格上的 cellStyle */
export type JeTableCellStyle =
  | CSSProperties
  | ((payload: {
      row: JeTableRow
      column: JeTableColumn
      rowIndex: number
      columnIndex: number
    }) => CSSProperties)

/** 表格列定义 */
export interface JeTableColumn {
  /** 取值字段名；selection / index / expand 类型列可省略 */
  prop?: string
  /** 表头文案 */
  label: string
  /**
   * 列宽，数字按 px 处理。
   * 卡片形态下列宽不生效（一律撑满一行）；表格形态下未写 width 的列用默认宽度。
   */
  width?: number | string
  /** 列最小宽度，仅在未设置 width 时生效 */
  minWidth?: number | string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 表头对齐方式；不写则跟随 align */
  headerAlign?: 'left' | 'center' | 'right'
  /**
   * 特殊列类型：
   * - selection：多选勾选列
   * - index：序号列
   * - expand：展开行，点箭头后在该行下方插入一整段 `#expand-<prop>` / `#expand` 插槽内容
   *
   * 三类特殊列在卡片形态下都不占「列名 + 值」的行，改为显示在区块头部。
   */
  type?: 'selection' | 'index' | 'expand'
  /** 单元格文本格式化；返回值按纯文本渲染 */
  formatter?: (row: JeTableRow, column: JeTableColumn) => string
  /** 追加到该列所有单元格上的类名，便于外部用选择器精确覆盖样式 */
  className?: string
  /** 追加到该列表头单元格上的类名 */
  labelClassName?: string
  /** 该列单元格的行内样式，会覆盖表格级 cellStyle 的同名属性 */
  cellStyle?: JeTableCellStyle
  /** 该列单元格的附加类名回调，与 className 叠加生效 */
  cellClassName?: (payload: {
    row: JeTableRow
    column: JeTableColumn
    rowIndex: number
    columnIndex: number
  }) => string
  /** selection 列：返回 false 的行不渲染勾选框（禁用态），全选时也会跳过 */
  selectable?: (row: JeTableRow, index: number) => boolean
  /**
   * index 列的序号偏移量：写 1 则第一行显示 2。
   * 分页场景把 (当前页 - 1) * pageSize 传进来即可显示全局序号。
   */
  index?: number | ((index: number) => number)
  /**
   * 分组表头的子列。
   *
   * 写了 children 的列不承载数据：卡片形态下它连同子列一起被展平成叶子列，
   * 表格形态下它在表头里占一个横跨所有子列的单元格。
   */
  children?: JeTableColumn[]
}

/** JeTable 的 props */
export interface JeTableProps {
  /** 表格数据 */
  data: JeTableRow[]
  /** 列配置 */
  columns: JeTableColumn[]
  /**
   * 显示形态：auto 由屏幕宽度决定（窄屏用卡片、宽屏用表格），table 恒为表格，card 恒为卡片，默认 auto。
   *
   * 卡片模式下每条记录渲染为一个独立区块，区块内按列逐行显示「列名 + 值」，适合窄屏表单式浏览。
   * 该模式不渲染表头，勾选 / 序号 / 展开 / 树形箭头统一放在区块头部；spanMethod 不生效。
   */
  layout?: 'auto' | 'table' | 'card'
  /** 卡片模式下列名的位置：left 列名在左、值在右（默认），top 列名在上、值在下 */
  cardLabelPosition?: 'left' | 'top'
  /** 表格尺寸 */
  size?: 'small' | 'default' | 'large'
  /** 是否显示纵向边框（仅表格形态） */
  border?: boolean
  /** 是否显示斑马纹（仅表格形态） */
  stripe?: boolean
  /** 是否显示表头（仅表格形态） */
  showHeader?: boolean
  /** 数据为空时的提示文案，未传时用语言包的 empty 文案 */
  emptyText?: string
  /** 行唯一键的字段名（支持 `user.info.id` 这种多级路径），或自定义取值函数 */
  rowKey?: string | ((row: JeTableRow) => string | number)
  /** 点击行时高亮该行，并把选中行通过 current-change 抛出 */
  highlightCurrentRow?: boolean
  /** 由外部指定当前高亮行的 key；传入后当前行状态完全受控 */
  currentRowKey?: string | number
  /** 行类名，字符串表示所有行共用，函数按行返回 */
  rowClassName?: string | ((payload: { row: JeTableRow; rowIndex: number }) => string)
  /** 行内样式，字符串表示所有行共用，函数按行返回 */
  rowStyle?: JeTableRowStyle
  /** 单元格类名，字符串表示所有单元格共用，函数按行列返回 */
  cellClassName?:
    | string
    | ((payload: {
        row: JeTableRow
        column: JeTableColumn
        rowIndex: number
        columnIndex: number
      }) => string)
  /** 单元格行内样式；列上的 cellStyle 会覆盖此处返回的同名属性 */
  cellStyle?: JeTableCellStyle
  /** 合并单元格（仅表格形态，且只支持横向 colspan） */
  spanMethod?: JeTableSpanMethod
  /** 默认展开所有展开行（表格内有 type: 'expand' 列时生效） */
  defaultExpandAll?: boolean
  /** 受控的展开行 key 列表，需配合 rowKey 使用 */
  expandRowKeys?: Array<string | number>
  /**
   * 树形数据配置：children 指明子行数组挂在行数据的哪个字段上。
   * 默认 { children: 'children', hasChildren: 'hasChildren' }；树形数据必须配 rowKey。
   */
  treeProps?: { children?: string; hasChildren?: string }
}

/** 单元格插槽作用域：#cell / #expand 共用 */
export interface JeTableCellSlotScope {
  /** 当前行数据 */
  row: JeTableRow
  /** 当前行下标（相对传入的 data） */
  index: number
  /** 当前列配置 */
  column: JeTableColumn
  /** 单元格格式化后的文本，插槽内做兜底展示很方便 */
  value: string
  /** 纵向跨度，uni 端恒为 1 */
  rowspan: number
  /** 横向跨度 */
  colspan: number
  /** 树形层级，从 0 开始；非树形数据恒为 0 */
  level: number
  /** 该行是否还有可展开的子行 */
  hasChildren: boolean
}

/** 展开行插槽作用域 */
export interface JeTableExpandSlotScope {
  /** 当前行数据 */
  row: JeTableRow
  /** 当前行下标 */
  index: number
  /** 当前是否已展开 */
  expanded: boolean
}

/** defineExpose 暴露出去的方法集合 */
export interface JeTableExpose {
  /** 清空当前选中 */
  clearSelection: () => void
  /** 读取当前选中行，用于提交表单等场景 */
  getSelectionRows: () => JeTableRow[]
  /** 单选一行（不传 selected 表示取反）；等价于 Element Plus 的 toggleRowSelection */
  toggleRowSelection: (row: JeTableRow, selected?: boolean) => void
  /** 切换全选 / 全不选 */
  toggleAllSelection: () => void
  /** 展开或收起某行的展开行 */
  toggleRowExpansion: (row: JeTableRow, expanded?: boolean) => void
  /** 设置当前高亮行，传空即清除 */
  setCurrentRow: (row?: JeTableRow | null) => void
}
