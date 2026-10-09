/**
 * `JeOrgChart` 的类型定义（uni 端）。
 *
 * 数据是**扁平的节点数组**（id + parentId），而不是嵌套树：这样上万人的数据只需要
 * 一次 O(n) 建表，折叠 / 搜索 / 增量更新都不用重排整棵树，业务侧也更好从接口拿数据。
 *
 * 与主库的差异：主库用单张 `<canvas>` 承载全部绘制（含 `renderNode` 绘制钩子、主题色对象、
 * LOD 分级），uni 端改成**递归 `<view>` + 纯 CSS 连线**（小程序端禁用内联 SVG / canvas 离屏导出），
 * 因此：
 *  - 不保留 `renderNode` 绘制钩子与 `JeOrgChartRenderContext` / `JeOrgChartTheme`
 *    —— 那三者都是「拿到 CanvasRenderingContext2D 自己画」的接口，DOM 渲染下无对应物；
 *  - `linkStyle` 的 `curve`（贝塞尔）在纯 CSS 下无法绘制，退化为直角折线。
 * 其余 props / 事件 / 方法口径与主库一一对齐。
 */

import type { ComputedRef, InjectionKey, Ref } from 'vue'

/**
 * 族谱里的配偶：并排画在主卡右侧，不参与树的层级（下级仍挂在主卡上）。
 */
export interface JeOrgChartSpouse {
  /** 可选 id；给了就能被 `locate()` 搜到 */
  id?: string | number
  /** 姓名 */
  name: string
  /** 副标题（称谓 / 备注），不传则只画姓名一行 */
  title?: string
  /** 头像图片地址；缺省或加载失败时退化为姓名首字的圆形色块 */
  avatar?: string
  /** 任意业务字段，点击时原样带出 */
  [key: string]: unknown
}

/** 组织架构 / 族谱里的一个人（或一个部门节点） */
export interface JeOrgChartNode {
  /** 唯一标识，重复 id 只取第一个 */
  id: string | number
  /** 上级 id；留空或指向不存在的节点都会当作根 */
  parentId?: string | number | null
  /** 主标题（姓名） */
  name: string
  /** 副标题（职位 / 部门），不传则只画姓名一行 */
  title?: string
  /** 头像图片地址；缺省或加载失败时退化为姓名首字的圆形色块 */
  avatar?: string
  /** 族谱用的配偶：单个或多个都会并排画在主卡右侧 */
  spouse?: JeOrgChartSpouse | JeOrgChartSpouse[]
  /** 任意业务字段，点击节点时原样带出，方便外部渲染详情 */
  [key: string]: unknown
}

/** 连线样式：直角折线（缺省）/ 斜线；uni 端纯 CSS 画不出贝塞尔，`curve` 退化为折线 */
export type JeOrgChartLinkStyle = 'curve' | 'elbow' | 'straight'

/**
 * 事件里携带的原始指针事件：H5 是 `MouseEvent`，小程序端是 `TouchEvent`。
 * （主库只跑在浏览器里，可以直接写 `MouseEvent`。）
 */
export type JeOrgChartPointerEvent = MouseEvent | TouchEvent

/** 导出参数（uni 端 DOM 渲染没有离屏 canvas，导出能力不可用，保留签名以对齐主库 API） */
export interface JeOrgChartExportOptions {
  /** 导出倍率（相对设计稿尺寸），缺省 1，传 2 即两倍图 */
  scale?: number
  /** 导出底色，缺省沿用组件的 background；都没有则透明 */
  background?: string
  /** 图片类型，缺省 image/png */
  type?: string
  /** JPEG / WebP 的质量（0 - 1） */
  quality?: number
}

/** 命中测试结果：节点卡片、它下方的折叠按钮，还是旁边的配偶卡 */
export interface JeOrgChartHit {
  id: string
  /** body 为本人卡片，toggle 为折叠按钮，spouse 为配偶卡 */
  zone: 'body' | 'toggle' | 'spouse'
  /** zone 为 spouse 时，是第几个配偶（从 0 开始） */
  spouseIndex?: number
}

export interface JeOrgChartProps {
  /** 扁平节点数组 */
  nodes: JeOrgChartNode[]
  /** 指定根节点 id；缺省时把 parentId 为空（或指向不存在的节点）的都当作根 */
  rootId?: string | number
  /** 节点卡片宽度（设计稿 px） */
  nodeWidth?: number
  /** 节点卡片高度（设计稿 px） */
  nodeHeight?: number
  /** 兄弟节点之间的水平间距（设计稿 px） */
  gapX?: number
  /** 层级之间的垂直间距（设计稿 px） */
  gapY?: number
  /** 配偶卡宽度（设计稿 px），缺省与 nodeWidth 一致 */
  spouseWidth?: number
  /** 配偶卡与主卡之间的间距（设计稿 px） */
  spouseGap?: number
  /** 初始展开层级：0 表示只显示根节点，2 表示根往下展开两层（depth 0/1/2 可见） */
  defaultExpandDepth?: number
  /** 缩放下限 */
  minScale?: number
  /** 缩放上限 */
  maxScale?: number
  /** 连线样式，缺省 curve（uni 端与 elbow 同为直角折线） */
  linkStyle?: JeOrgChartLinkStyle
  /**
   * 是否开启表单编辑：缺省 false 即纯展示、不可编辑。
   * 传 true 后点击主卡会弹出内置编辑浮层（主标题 / 副标题两个字段），保存时通过 update:nodes
   * 事件抛出替换后的完整扁平数组（配合 v-model:nodes 使用）。组件仍是受控的，只抛数据，
   * 落库 / 校验 / 撤销由业务侧决定；配偶卡不参与编辑。
   */
  editable?: boolean
  /**
   * 是否开启拖拽改层级：缺省 false 即不可拖拽。
   * 传 true 后可按住某张主卡拖到另一张主卡上，松手即把它改挂到目标节点下，通过 node-move 与
   * update:nodes 抛出结果（配合 v-model:nodes 使用）。同样是受控组件，只抛数据；拖回原位、
   * 拖到自己的后代等非法落点会被忽略，配偶卡与折叠按钮不可拖。
   */
  draggable?: boolean
  /**
   * 是否开启「添加下级」：缺省 false。
   * 传 true 后点击主卡弹出的内置浮层里会多一个「添加下级」按钮，点它即在该节点下追加一个新节点
   * （id 自动生成为**字符串**、name 取「新节点」），并抛 node-add 与 update:nodes。
   * 提供了 node-popup 插槽时内置浮层不出现，可改用暴露的 addChild(id) 自行调用。
   */
  addable?: boolean
  /**
   * 是否开启「删除节点」：缺省 false。
   * 传 true 后内置浮层里会多一个「删除」按钮，点击需**二次确认**；确认后删除该节点**及其全部下级**
   * （整棵子树），抛 node-remove（被删的整棵子树）与 update:nodes。提供了 node-popup 插槽时
   * 改用暴露的 removeNode(id) 自行调用。
   */
  removable?: boolean
  /**
   * 是否开启撤销 / 重做：缺省 false。
   * 传 true 后组件会为**自己发起的每一次变更**（编辑保存 / 拖拽改层级 / 增删节点）记一份历史，
   * 通过暴露的 undo() / redo() / clearHistory() 调用，每次可用状态变化抛 history-change。
   * 宿主若换掉整份数据（不是组件刚抛出的那份），历史自动清空。
   */
  undoable?: boolean
  /** 画布底色，缺省透明（对应根节点背景） */
  background?: string
  /** 无障碍描述，缺省「组织架构图」 */
  label?: string
}

/**
 * 递归节点视图（`je-org-chart-node`）与根组件共享的数据 / 状态。
 *
 * 单张 canvas 时命中测试靠坐标逆变换，DOM 递归渲染下每个卡片自己就能接事件、
 * 折叠与选中状态也直接读根组件的响应式源，所以这里只暴露「取数据 / 读状态」的访问器，
 * 深层节点不必层层透传 props。
 */
export interface JeOrgChartContext {
  /** 按 id 取节点数据（重复 id 只保留第一条） */
  nodeOf: (id: string) => JeOrgChartNode | undefined
  /** 某节点的直接子节点 id（按输入顺序；已被 rootId 过滤） */
  childIdsOf: (id: string) => string[]
  /** 配偶统一按数组返回 */
  spousesOf: (id: string) => JeOrgChartSpouse[]
  /** 该节点是否处于折叠态 */
  isCollapsed: (id: string) => boolean
  /** 主卡是否选中 */
  isActiveNode: (id: string) => boolean
  /** 第 index 张配偶卡是否选中 */
  isActiveSpouse: (id: string, index: number) => boolean
  /** 正在被拖拽的主卡 id */
  dragId: Ref<string | null>
  /** 当前拖拽落点目标 id */
  dragTargetId: Ref<string | null>
  /** 卡片尺寸 / 间距（设计稿 px），由根组件按 props 下发 */
  nodeWidth: ComputedRef<number>
  nodeHeight: ComputedRef<number>
  spouseWidth: ComputedRef<number>
  spouseGap: ComputedRef<number>
  gapX: ComputedRef<number>
  gapY: ComputedRef<number>
}

export const jeOrgChartKey: InjectionKey<JeOrgChartContext> = Symbol('je-org-chart')
