/**
 * 树形布局内核 —— 供 `JeOrgChart` 使用（从主库 `src/core/treeLayout.ts` 原样移植）。
 *
 * 固定尺寸节点的「紧凑树」布局：先自底向上算每棵子树的宽度，再自顶向下把子节点块
 * 居中挂在父节点下方。节点尺寸一致时这个做法既不会重叠、也不需要 Reingold–Tilford
 * 的轮廓线程（contour threading），整体 O(n)。
 *
 * **布局与渲染解耦**：这里只产出设计稿坐标，缩放 / 平移只改视口矩阵、不触发重算；
 * 折叠也只是换个 `collapsed` 集合重跑一次，代价与「可见节点数」同阶。
 *
 * 与主库完全同源（纯函数、零 DOM 依赖），uni 端原样复用，不要各抄一份。
 */

/** 布局输入的扁平节点：只要 id 与 parentId，业务字段由调用方自己按 id 取 */
export interface JeTreeSourceNode {
  id: string
  parentId: string | null
  /**
   * 该节点在树里占用的水平宽度；缺省取 `options.nodeWidth`。
   * 族谱里「主卡 + 配偶卡」并排时靠它把一个节点声明得更宽 —— 布局按整块居中，
   * 卡片本身仍画在 `x` 处、宽度由渲染侧决定。
   */
  boxWidth?: number
}

export interface JeTreeLayoutOptions {
  /** 节点卡片宽（设计稿 px） */
  nodeWidth: number
  /** 节点卡片高（设计稿 px） */
  nodeHeight: number
  /** 兄弟节点之间的水平间距 */
  gapX: number
  /** 父子层级之间的垂直间距 */
  gapY: number
  /** 多棵树之间的额外水平间距，缺省 `gapX * 2` */
  rootGap?: number
}

/** 可见节点（折叠子树的下级不会出现在结果里） */
export interface JeTreeLayoutNode {
  id: string
  parentId: string | null
  depth: number
  /** 直接子节点总数（不受折叠影响，折叠按钮上的角标用它） */
  childCount: number
  children: JeTreeLayoutNode[]
  /** 卡片左上角 x（设计稿 px） */
  x: number
  /** 卡片左上角 y（设计稿 px） */
  y: number
  /** 该节点占用的水平宽度（含配偶卡等附加卡片），布局居中按它算 */
  boxWidth: number
  /** 该节点为根的子树宽度，布局中间量，导出给调试 / 断言用 */
  subtreeWidth: number
}

/** 一条父子连线（起止点都取节点块边缘中点，渲染侧再决定肘形 / 斜线） */
export interface JeTreeEdge {
  parentId: string
  childId: string
  /** 父节点块底边中点 */
  fromX: number
  fromY: number
  /** 子节点块顶边中点 */
  toX: number
  toY: number
}

export interface JeTreeLayout {
  /** 可见节点，先序（父一定排在子前面） */
  nodes: JeTreeLayoutNode[]
  /** 可见的父子连线 */
  edges: JeTreeEdge[]
  /** 可见节点按 id 的索引 */
  index: Map<string, JeTreeLayoutNode>
  /** 内容包围盒尺寸（布局从 0,0 开始，故等于最大右下角） */
  width: number
  height: number
  /** 根节点 id（可能多棵） */
  roots: string[]
}

interface LinkNode {
  id: string
  parentId: string | null
  children: string[]
  boxWidth: number
}

interface VisibleNode {
  id: string
  depth: number
  childCount: number
  children: VisibleNode[]
  x: number
  y: number
  boxWidth: number
  subtreeWidth: number
}

/**
 * 建 id → 父 id 的映射（含被折叠起来的节点），供「展开到某人」时回溯祖先链。
 */
export const treeParentMap = (sources: JeTreeSourceNode[]): Map<string, string | null> => {
  const parentMap = new Map<string, string | null>()
  const known = new Set<string>()
  for (const source of sources) known.add(source.id)
  for (const source of sources) {
    if (parentMap.has(source.id)) continue
    const parentId = source.parentId == null ? null : String(source.parentId)
    parentMap.set(source.id, parentId && known.has(parentId) && parentId !== source.id ? parentId : null)
  }
  return parentMap
}

/**
 * 解析出一棵（或多棵）可见树并算好坐标。
 *
 * - `parentId` 指向不存在的节点、或自指 / 成环的节点会被当作根，避免无限递归；
 * - `collapsed` 里的节点不展开下级，但 `childCount` 保留真实数量（角标要用）。
 */
export const layoutTree = (
  sources: JeTreeSourceNode[],
  collapsed: ReadonlySet<string>,
  options: JeTreeLayoutOptions,
): JeTreeLayout => {
  const { nodeWidth, nodeHeight, gapX, gapY } = options
  const rootGap = options.rootGap ?? gapX * 2

  // ① 建节点表与父子关系
  const table = new Map<string, LinkNode>()
  for (const source of sources) {
    if (!table.has(source.id)) {
      table.set(source.id, {
        id: source.id,
        parentId: null,
        children: [],
        boxWidth: source.boxWidth ?? nodeWidth,
      })
    }
  }
  const parentMap = treeParentMap(sources)
  for (const [id, parentId] of parentMap) {
    const node = table.get(id)
    if (!node) continue
    node.parentId = parentId
    if (parentId) table.get(parentId)?.children.push(id)
  }

  // ② 根 = 没有父的节点；再把因成环而不可达的节点也接进来，保证每个节点都能落地
  const roots: string[] = []
  for (const node of table.values()) if (!node.parentId) roots.push(node.id)
  const reachable = new Set<string>()
  const mark = (id: string) => {
    if (reachable.has(id)) return
    reachable.add(id)
    for (const childId of table.get(id)?.children ?? []) mark(childId)
  }
  roots.forEach(mark)
  for (const id of table.keys()) {
    if (!reachable.has(id)) {
      roots.push(id)
      mark(id)
    }
  }

  // ③ 按折叠状态建可见树
  const seen = new Set<string>()
  const build = (id: string, depth: number): VisibleNode | null => {
    if (seen.has(id)) return null
    seen.add(id)
    const node = table.get(id)
    if (!node) return null
    const childIds = collapsed.has(id) ? [] : node.children
    const children = childIds
      .map((childId) => build(childId, depth + 1))
      .filter((child): child is VisibleNode => child !== null)
    return {
      id,
      depth,
      childCount: node.children.length,
      children,
      x: 0,
      y: 0,
      boxWidth: node.boxWidth,
      subtreeWidth: node.boxWidth,
    }
  }
  const visibleRoots = roots
    .map((id) => build(id, 0))
    .filter((root): root is VisibleNode => root !== null)

  // ④ 自底向上量子树宽度：叶子 = 节点块宽；否则 = 子节点块宽（不足自身块宽时取自身块宽）
  const measure = (node: VisibleNode): void => {
    if (node.children.length === 0) {
      node.subtreeWidth = node.boxWidth
      return
    }
    let total = 0
    node.children.forEach((child, index) => {
      measure(child)
      total += child.subtreeWidth + (index > 0 ? gapX : 0)
    })
    node.subtreeWidth = Math.max(node.boxWidth, total)
  }
  visibleRoots.forEach(measure)

  // ⑤ 自顶向下分配坐标：节点块整体居中于自己的子树宽度内
  const place = (node: VisibleNode, left: number): void => {
    node.y = node.depth * (nodeHeight + gapY)
    node.x = left + (node.subtreeWidth - node.boxWidth) / 2
    if (node.children.length === 0) return
    let childrenWidth = 0
    node.children.forEach((child, index) => {
      childrenWidth += child.subtreeWidth + (index > 0 ? gapX : 0)
    })
    let cursor = left + (node.subtreeWidth - childrenWidth) / 2
    for (const child of node.children) {
      place(child, cursor)
      cursor += child.subtreeWidth + gapX
    }
  }
  let cursor = 0
  for (const root of visibleRoots) {
    place(root, cursor)
    cursor += root.subtreeWidth + rootGap
  }

  // ⑥ 先序展平 + 生成连线 + 统计包围盒
  const nodes: JeTreeLayoutNode[] = []
  const edges: JeTreeEdge[] = []
  const index = new Map<string, JeTreeLayoutNode>()
  let maxRight = 0
  let maxBottom = 0

  const visit = (node: VisibleNode, parentId: string | null): JeTreeLayoutNode => {
    const flat: JeTreeLayoutNode = {
      id: node.id,
      parentId,
      depth: node.depth,
      childCount: node.childCount,
      children: [],
      x: node.x,
      y: node.y,
      boxWidth: node.boxWidth,
      subtreeWidth: node.subtreeWidth,
    }
    nodes.push(flat)
    index.set(flat.id, flat)
    maxRight = Math.max(maxRight, node.x + node.boxWidth)
    maxBottom = Math.max(maxBottom, node.y + nodeHeight)
    for (const child of node.children) {
      const childFlat = visit(child, node.id)
      flat.children.push(childFlat)
      edges.push({
        parentId: node.id,
        childId: child.id,
        fromX: node.x + node.boxWidth / 2,
        fromY: node.y + nodeHeight,
        toX: child.x + child.boxWidth / 2,
        toY: child.y,
      })
    }
    return flat
  }
  visibleRoots.forEach((root) => visit(root, null))

  return {
    nodes,
    edges,
    index,
    width: maxRight,
    height: maxBottom,
    roots: visibleRoots.map((root) => root.id),
  }
}

/** 从 `id` 往上的祖先链（不含自身），用于「展开到某人」时逐级展开 */
export const treeAncestors = (
  parentMap: ReadonlyMap<string, string | null>,
  id: string,
): string[] => {
  const chain: string[] = []
  const seen = new Set<string>()
  let current = parentMap.get(id) ?? null
  while (current && !seen.has(current)) {
    chain.push(current)
    seen.add(current)
    current = parentMap.get(current) ?? null
  }
  return chain
}
