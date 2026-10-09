<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useSlots,
  watch,
  type CSSProperties,
} from 'vue'
import JeOrgChartNodeView from '../je-org-chart-node/je-org-chart-node.vue'
import { layoutTree, treeAncestors, treeParentMap, type JeTreeLayout } from '../../core/treeLayout'
import {
  jeOrgChartKey,
  type JeOrgChartContext,
  type JeOrgChartHit,
  type JeOrgChartNode,
  type JeOrgChartPointerEvent,
  type JeOrgChartProps,
  type JeOrgChartSpouse,
} from './types'

defineOptions({ name: 'JeOrgChart' })

const props = withDefaults(defineProps<JeOrgChartProps>(), {
  nodes: () => [],
  rootId: undefined,
  nodeWidth: 208,
  nodeHeight: 76,
  gapX: 32,
  gapY: 64,
  spouseWidth: undefined,
  spouseGap: 20,
  defaultExpandDepth: 2,
  minScale: 0.12,
  maxScale: 2.5,
  linkStyle: 'curve',
  editable: false,
  draggable: false,
  addable: false,
  removable: false,
  undoable: false,
  background: '',
  label: '组织架构图',
})

const emit = defineEmits<{
  /** 点击主卡时触发（点折叠按钮与配偶卡不会触发它），第二个参数是原始鼠标 / 触摸事件 */
  'node-click': [node: JeOrgChartNode, event: JeOrgChartPointerEvent]
  /** 点击配偶卡时触发，第二、三个参数是配偶所属的主节点与原始鼠标 / 触摸事件 */
  'spouse-click': [spouse: JeOrgChartSpouse, host: JeOrgChartNode, event: JeOrgChartPointerEvent]
  /** 折叠或展开一个节点后触发，collapsed 是切换后的状态 */
  toggle: [node: JeOrgChartNode, collapsed: boolean]
  /** locate() 命中一个节点后触发 */
  locate: [node: JeOrgChartNode]
  /** 编辑保存后触发（仅 editable 为 true 时会有），抛出替换后的完整扁平数组 */
  'update:nodes': [nodes: JeOrgChartNode[]]
  /** 拖拽改层级松手后触发：依次是移动的节点、原父 id、新父 id（无父时为 null） */
  'node-move': [node: JeOrgChartNode, oldParentId: string | null, newParentId: string | null]
  /** 新增节点后触发：依次是新建的节点与它的父 id */
  'node-add': [node: JeOrgChartNode, parentId: string | null]
  /** 删除节点后触发：依次是被删除的整棵子树（含该节点自身）与被点的那个节点 */
  'node-remove': [removed: JeOrgChartNode[], node: JeOrgChartNode]
  /** 撤销 / 重做的可用状态变化时触发，两个参数分别是「能否撤销」「能否重做」 */
  'history-change': [canUndo: boolean, canRedo: boolean]
}>()

/** 折叠按钮视觉半径（设计稿 px），圆心落在节点块下沿中点 */
const TOGGLE_RADIUS = 10
/**
 * 折叠按钮的触控热区半径（直径 44px，满足移动端最小触控尺寸）。
 * 中心比视觉按钮略向下偏移，避免热区压到卡片本体、把卡片自身的点击吞掉。
 */
const TOGGLE_HIT_RADIUS = 22
const TOGGLE_HIT_OFFSET_Y = 10
/** 详情浮层：与卡片的间距、距容器边缘的最小内缩、估算宽度 */
const POPUP_GAP = 16
const POPUP_MARGIN = 8
const POPUP_WIDTH = 240
/** 拖拽改层级的启动阈值（px）：位移超过它才算拖拽，否则仍按点击处理 */
const DRAG_THRESHOLD = 4
/** 鼠标通道的伪触点 id（触摸用 touch.identifier） */
const MOUSE_ID = -1
/** 内置「添加下级」生成的新节点名 */
const NEW_NODE_NAME = '新节点'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** 模板 ref 在小程序端可能是组件实例，取真实 DOM 前先解包（H5 下就是元素本身） */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const rootRef = ref<HTMLElement | null>(null)
const instance = getCurrentInstance()
/** 用于探测 node-popup / spouse-popup 插槽是否提供 */
const slots = useSlots()

/* ---------------------------------------------------------------- 数据 */

const nodeMap = computed(() => {
  const map = new Map<string, JeOrgChartNode>()
  for (const node of props.nodes ?? []) {
    const id = String(node.id)
    if (!map.has(id)) map.set(id, node)
  }
  return map
})

/** 配偶统一按数组处理：单个 / 数组都接受 */
const spousesOf = (node: JeOrgChartNode | undefined): JeOrgChartSpouse[] => {
  const raw = node?.spouse
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

const spouseWidth = computed(() => props.spouseWidth ?? props.nodeWidth)

/** 节点块占用的水平宽度 = 主卡 + 并排的各张配偶卡（布局按整块居中） */
const boxWidthOf = (node: JeOrgChartNode | undefined): number =>
  props.nodeWidth + spousesOf(node).length * (props.spouseGap + spouseWidth.value)

/** 第 index 张配偶卡的左上角 x（世界坐标） */
const spouseX = (node: { x: number }, index: number): number =>
  node.x + props.nodeWidth + props.spouseGap + index * (spouseWidth.value + props.spouseGap)

const sources = computed(() => {
  const list = [...nodeMap.value.entries()].map(([id, node]) => ({
    id,
    parentId: node.parentId == null ? null : String(node.parentId),
    boxWidth: boxWidthOf(node),
  }))
  const rootId = props.rootId == null ? null : String(props.rootId)
  if (!rootId || !nodeMap.value.has(rootId)) return list

  // 指定了 rootId：只保留它可达的子树
  const children = new Map<string, string[]>()
  for (const item of list) {
    if (!item.parentId) continue
    const bucket = children.get(item.parentId)
    if (bucket) bucket.push(item.id)
    else children.set(item.parentId, [item.id])
  }
  const keep = new Set<string>()
  const walk = (id: string) => {
    if (keep.has(id)) return
    keep.add(id)
    for (const childId of children.get(id) ?? []) walk(childId)
  }
  walk(rootId)
  return list.filter((item) => keep.has(item.id))
})

const parentMap = computed(() => treeParentMap(sources.value))

/** 子节点表（按输入顺序）；父 id 非法 / 指向不存在节点的条目已在 treeParentMap 里兜底成根 */
const childrenMap = computed(() => {
  const map = new Map<string, string[]>()
  for (const [id, parentId] of parentMap.value) {
    if (!parentId) continue
    const bucket = map.get(parentId)
    if (bucket) bucket.push(id)
    else map.set(parentId, [id])
  }
  return map
})

/**
 * 布局内核产出的设计稿坐标。它既是「可视节点 / 连线 / 包围盒」的唯一几何口径，
 * 也是命中测试、详情浮层定位、fit 的坐标来源；递归 DOM 渲染与它按同一套公式
 * （boxWidth 居中 + gapX / gapY）排布，两者天然对齐。
 */
const layout = computed<JeTreeLayout>(() =>
  layoutTree(sources.value, collapsed.value, {
    nodeWidth: props.nodeWidth,
    nodeHeight: props.nodeHeight,
    gapX: props.gapX,
    gapY: props.gapY,
  }),
)

/* ------------------------------------------------------------ 折叠状态 */

const collapsed = ref<Set<string>>(new Set())

/** 单个节点的深度（按 parentId 逐级上溯，带缓存与成环保护） */
const depthOf = (id: string, cache: Map<string, number>, visiting: Set<string>): number => {
  const cached = cache.get(id)
  if (cached !== undefined) return cached
  if (visiting.has(id)) return 0
  visiting.add(id)
  const parent = parentMap.value.get(id) ?? null
  const depth = parent && parent !== id ? depthOf(parent, cache, visiting) + 1 : 0
  visiting.delete(id)
  cache.set(id, depth)
  return depth
}

/** 按 defaultExpandDepth 重置折叠集合：深度 >= 该值的节点一律折叠 */
const applyDefaultCollapse = () => {
  const cache = new Map<string, number>()
  const next = new Set<string>()
  for (const id of nodeMap.value.keys()) {
    if (depthOf(id, cache, new Set()) >= props.defaultExpandDepth) next.add(id)
  }
  collapsed.value = next
}

const toggleNode = (id: string, force?: boolean) => {
  const next = new Set(collapsed.value)
  const target = force ?? !next.has(id)
  if (target) next.add(id)
  else next.delete(id)
  collapsed.value = next
  const data = nodeMap.value.get(id)
  if (data) emit('toggle', data, target)
}

/** 展开从根到 id 的整条祖先链（locate 与 expandTo 共用） */
const expandTo = (id: string) => {
  const ancestors = treeAncestors(parentMap.value, id)
  if (!ancestors.length) return
  const next = new Set(collapsed.value)
  let changed = false
  for (const ancestor of ancestors) if (next.delete(ancestor)) changed = true
  if (changed) collapsed.value = next
}

const expandAll = () => {
  collapsed.value = new Set()
}

const collapseTo = (depth = 0) => {
  const cache = new Map<string, number>()
  const next = new Set<string>()
  for (const id of nodeMap.value.keys()) {
    if (depthOf(id, cache, new Set()) >= depth) next.add(id)
  }
  collapsed.value = next
}

/* -------------------------------------------------------------- 视口 */

/** 根容器相对视口的矩形：既是尺寸来源，也是把屏幕坐标换算成世界坐标的原点 */
const viewRect = ref({ left: 0, top: 0, width: 0, height: 0 })
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const panning = ref(false)

const localOf = (clientX: number, clientY: number) => ({
  x: clientX - viewRect.value.left,
  y: clientY - viewRect.value.top,
})

const centerContent = () => {
  const l = layout.value
  const { width, height } = viewRect.value
  if (!width || !height || !l.width) return
  offsetX.value = (width - l.width * scale.value) / 2
  offsetY.value = (height - l.height * scale.value) / 2
}

/** 初次进入：装得下就整棵居中，装不下就 1:1 从根节点看起 */
const resetView = () => {
  const l = layout.value
  const { width, height } = viewRect.value
  if (!width || !height || !l.width) return
  const padding = 24
  const fitScale = Math.min((width - padding * 2) / l.width, (height - padding * 2) / l.height)
  if (fitScale >= 0.6) {
    scale.value = clamp(Math.min(1, fitScale), props.minScale, props.maxScale)
    centerContent()
    return
  }
  scale.value = clamp(1, props.minScale, props.maxScale)
  const root = l.index.get(l.roots[0] ?? '')
  offsetX.value = root
    ? width / 2 - (root.x + root.boxWidth / 2) * scale.value
    : (width - l.width * scale.value) / 2
  offsetY.value = padding
}

/** 把整张图适配进视口（可能缩到很小，用于「总览」） */
const fit = () => {
  const l = layout.value
  const { width, height } = viewRect.value
  if (!width || !height || !l.width) return
  const padding = 24
  scale.value = clamp(
    Math.min((width - padding * 2) / l.width, (height - padding * 2) / l.height),
    props.minScale,
    props.maxScale,
  )
  centerContent()
}

const zoomAt = (localX: number, localY: number, nextScale: number) => {
  const next = clamp(nextScale, props.minScale, props.maxScale)
  const k = next / scale.value
  offsetX.value = localX - (localX - offsetX.value) * k
  offsetY.value = localY - (localY - offsetY.value) * k
  scale.value = next
}

/** 定位到某节点：放大到至少 1:1 并把它居中（主库用弹簧飞行，这里直接落位） */
const centerOn = (id: string) => {
  const node = layout.value.index.get(id)
  const { width, height } = viewRect.value
  if (!node || !width || !height) return
  const nextScale = clamp(Math.max(scale.value, 1), props.minScale, props.maxScale)
  scale.value = nextScale
  offsetX.value = width / 2 - (node.x + node.boxWidth / 2) * nextScale
  offsetY.value = height / 2 - (node.y + props.nodeHeight / 2) * nextScale
}

/* -------------------------------------------------------- 悬停 / 选中 */

const hoverId = ref<string | null>(null)
const hoverSpouseIndex = ref<number | null>(null)
const hoverZone = ref<JeOrgChartHit['zone'] | null>(null)
const activeId = ref<string | null>(null)
const activeSpouseIndex = ref<number | null>(null)

/* -------------------------------------------------------- 撤销 / 重做 */

/**
 * 历史栈（仅 `undoable` 时记录）：`past` 从旧到新、`future` 从近到远，
 * `present` 是「组件最近抛出的那份数据」—— 用它区分「宿主把我们抛出的数组写回」
 * 与「宿主换了整份新数据」（后者要作废历史），同时充当变更基准。
 */
const historyPast = ref<JeOrgChartNode[][]>([])
const historyFuture = ref<JeOrgChartNode[][]>([])
const historyPresent = ref<JeOrgChartNode[] | null>(null)

watch(
  () => props.nodes,
  (list) => {
    if (list && list === historyPresent.value) return
    historyPresent.value = list ?? []
    historyPast.value = []
    historyFuture.value = []
  },
  { immediate: true },
)

/** 「由组件自身发起」的数据变更统一走这里：先记历史（undoable 时），再抛 update:nodes */
const commitNodes = (next: JeOrgChartNode[]) => {
  if (props.undoable) {
    const before = historyPresent.value ?? props.nodes ?? []
    historyPast.value = [...historyPast.value, before]
    historyFuture.value = []
  }
  historyPresent.value = next
  emit('update:nodes', next)
}

/** 变更的基准数组：优先用组件自己刚抛出的那份，其次才退回 props */
const currentNodeList = (): JeOrgChartNode[] => historyPresent.value ?? props.nodes ?? []

const canUndo = computed(() => props.undoable && historyPast.value.length > 0)
const canRedo = computed(() => props.undoable && historyFuture.value.length > 0)

watch([canUndo, canRedo], ([u, r]) => emit('history-change', u, r))

const undo = (): boolean => {
  if (!canUndo.value) return false
  const past = [...historyPast.value]
  const previous = past.pop() as JeOrgChartNode[]
  const current = historyPresent.value ?? props.nodes ?? []
  historyPast.value = past
  historyFuture.value = [current, ...historyFuture.value]
  historyPresent.value = previous
  emit('update:nodes', previous)
  return true
}

const redo = (): boolean => {
  if (!canRedo.value) return false
  const [next, ...rest] = historyFuture.value
  const current = historyPresent.value ?? props.nodes ?? []
  historyFuture.value = rest
  historyPast.value = [...historyPast.value, current]
  historyPresent.value = next
  emit('update:nodes', next)
  return true
}

const clearHistory = () => {
  historyPast.value = []
  historyFuture.value = []
  historyPresent.value = props.nodes ?? []
}

/* ---------------------------------------------------------- 命中测试 */

const hitTest = (screenX: number, screenY: number): JeOrgChartHit | null => {
  const s = scale.value
  const wx = (screenX - offsetX.value) / s
  const wy = (screenY - offsetY.value) / s
  const { nodeWidth, nodeHeight } = props
  const nodes = layout.value.nodes

  // 折叠按钮压在卡片下沿外侧，先判它；落在卡片本体上的那一块要让位给卡片
  for (const node of nodes) {
    if (node.childCount === 0) continue
    const cx = node.x + node.boxWidth / 2
    const visualCy = node.y + nodeHeight
    const hitCy = visualCy + TOGGLE_HIT_OFFSET_Y
    const dx = wx - cx
    const dy = wy - hitCy
    if (dx * dx + dy * dy > TOGGLE_HIT_RADIUS ** 2) continue
    const inCard = wx >= node.x && wx <= node.x + nodeWidth && wy >= node.y && wy <= node.y + nodeHeight
    if (inCard) {
      const vx = wx - cx
      const vy = wy - visualCy
      if (vx * vx + vy * vy > (TOGGLE_RADIUS + 2) ** 2) continue
    }
    return { id: node.id, zone: 'toggle' }
  }
  for (const node of nodes) {
    if (wx >= node.x && wx <= node.x + nodeWidth && wy >= node.y && wy <= node.y + nodeHeight) {
      return { id: node.id, zone: 'body' }
    }
  }
  // 配偶卡并排在主卡右侧，横向与主卡不重叠
  const spouseW = spouseWidth.value
  for (const node of nodes) {
    const spouses = spousesOf(nodeMap.value.get(node.id))
    if (!spouses.length || wy < node.y || wy > node.y + nodeHeight) continue
    for (let i = 0; i < spouses.length; i += 1) {
      const x = spouseX(node, i)
      if (wx >= x && wx <= x + spouseW) return { id: node.id, zone: 'spouse', spouseIndex: i }
    }
  }
  return null
}

/* -------------------------------------------------------- 拖拽改层级 */

const dragId = ref<string | null>(null)
const dragTargetId = ref<string | null>(null)

/* ---------------------------------------------------------- 注入上下文 */

/**
 * 递归子组件靠注入读数据 / 状态，避免逐层透传 props。provide 必须在 setup 内同步调用，
 * 因此放在所有被引用的响应式源（nodeMap / childrenMap / collapsed / 选中 / 拖拽）声明之后。
 */
const ctx: JeOrgChartContext = {
  nodeOf: (id) => nodeMap.value.get(id),
  childIdsOf: (id) => childrenMap.value.get(id) ?? [],
  spousesOf: (id) => spousesOf(nodeMap.value.get(id)),
  isCollapsed: (id) => collapsed.value.has(id),
  isActiveNode: (id) => activeId.value === id && activeSpouseIndex.value === null,
  isActiveSpouse: (id, index) => activeId.value === id && activeSpouseIndex.value === index,
  dragId,
  dragTargetId,
  nodeWidth: computed(() => props.nodeWidth),
  nodeHeight: computed(() => props.nodeHeight),
  spouseWidth,
  spouseGap: computed(() => props.spouseGap),
  gapX: computed(() => props.gapX),
  gapY: computed(() => props.gapY),
}
provide(jeOrgChartKey, ctx)

const resolveDragTarget = (sourceId: string, hit: JeOrgChartHit | null): string | null => {
  if (!hit || hit.zone !== 'body') return null
  const targetId = hit.id
  if (targetId === sourceId) return null
  if (targetId === (parentMap.value.get(sourceId) ?? null)) return null
  let cursor: string | null = parentMap.value.get(targetId) ?? null
  const seen = new Set<string>()
  while (cursor && !seen.has(cursor)) {
    if (cursor === sourceId) return null
    seen.add(cursor)
    cursor = parentMap.value.get(cursor) ?? null
  }
  return targetId
}

const resetDrag = () => {
  dragCandidate = null
  dragId.value = null
  dragTargetId.value = null
}

/** 提交拖拽：按 id 换掉那一条的 parentId，抛 node-move 与 update:nodes */
const commitDrag = () => {
  const sourceId = dragId.value
  const targetId = dragTargetId.value
  if (!sourceId || !targetId) return
  const source = nodeMap.value.get(sourceId)
  if (!source || !nodeMap.value.has(targetId)) return
  const oldParentId = parentMap.value.get(sourceId) ?? null
  emit('node-move', source, oldParentId, targetId)
  commitNodes(
    currentNodeList().map((item) =>
      String(item.id) === sourceId ? { ...item, parentId: targetId } : item,
    ),
  )
  if (collapsed.value.has(targetId)) {
    const next = new Set(collapsed.value)
    next.delete(targetId)
    collapsed.value = next
  }
}

/* ------------------------------------------------------------ 手势 */

/*
 * 单张 canvas 时手势走 pointer 事件 + setPointerCapture；DOM 渲染下没有 pointer 通道的
 * 跨端保证，改成「触摸 + 鼠标」两条原生通道：模板上同一个视口元素同时绑了两套，
 * 小程序端 mousedown / mousemove 永不触发，H5 桌面端 touchstart 同理，互不干扰。
 * 触摸后浏览器常会补发一套合成鼠标事件，用 lastTouchTs 短暂抑制即可。
 */
const pointers = new Map<number, { x: number; y: number }>()
let panStart: { x: number; y: number; offsetX: number; offsetY: number } | null = null
let pinchStart:
  | { distance: number; scale: number; centerX: number; centerY: number; offsetX: number; offsetY: number }
  | null = null
let dragCandidate: { id: string; x: number; y: number } | null = null
let moved = false
let lastTouchTs = 0

/** 第二指落下：任何拖拽 / 平移都让位给双指缩放 */
const startPinch = () => {
  const [a, b] = [...pointers.values()]
  if (!a || !b) return
  const center = localOf((a.x + b.x) / 2, (a.y + b.y) / 2)
  pinchStart = {
    distance: Math.hypot(a.x - b.x, a.y - b.y),
    scale: scale.value,
    centerX: center.x,
    centerY: center.y,
    offsetX: offsetX.value,
    offsetY: offsetY.value,
  }
  panStart = null
}

const beginGesture = (clientX: number, clientY: number, multi: boolean) => {
  moved = false
  if (multi || pointers.size >= 2) {
    resetDrag()
    panning.value = true
    startPinch()
    return
  }
  // 单指落在可拖拽节点的主卡上 → 本次手势交给拖拽（不平移画布）
  dragCandidate = null
  if (props.draggable) {
    const local = localOf(clientX, clientY)
    const hit = hitTest(local.x, local.y)
    if (hit && hit.zone === 'body') {
      dragCandidate = { id: hit.id, x: clientX, y: clientY }
      panStart = null
      pinchStart = null
      return
    }
  }
  panStart = { x: clientX, y: clientY, offsetX: offsetX.value, offsetY: offsetY.value }
  pinchStart = null
  panning.value = true
}

const handleMove = (clientX: number, clientY: number, multi: boolean) => {
  if (multi && pinchStart) {
    const [a, b] = [...pointers.values()]
    if (!a || !b) return
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    const next = clamp(
      pinchStart.scale * (distance / Math.max(1, pinchStart.distance)),
      props.minScale,
      props.maxScale,
    )
    const k = next / pinchStart.scale
    const center = localOf((a.x + b.x) / 2, (a.y + b.y) / 2)
    offsetX.value = center.x + (pinchStart.offsetX - pinchStart.centerX) * k
    offsetY.value = center.y + (pinchStart.offsetY - pinchStart.centerY) * k
    scale.value = next
    moved = true
    return
  }

  // 拖拽改层级：位移过阈值才真正进入拖拽态，避免「点一下」被当成拖拽
  if (dragCandidate && !dragId.value) {
    const dx = clientX - dragCandidate.x
    const dy = clientY - dragCandidate.y
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
      dragId.value = dragCandidate.id
      closePopup()
    }
  }
  if (dragId.value) {
    const local = localOf(clientX, clientY)
    dragTargetId.value = resolveDragTarget(dragId.value, hitTest(local.x, local.y))
    moved = true
    return
  }

  if (panStart) {
    const dx = clientX - panStart.x
    const dy = clientY - panStart.y
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true
    offsetX.value = panStart.offsetX + dx
    offsetY.value = panStart.offsetY + dy
  }
}

const updateHover = (clientX: number, clientY: number) => {
  const local = localOf(clientX, clientY)
  const hit = hitTest(local.x, local.y)
  const next = hit?.id ?? null
  if (hoverId.value !== next) hoverId.value = next
  const nextSpouse = hit?.zone === 'spouse' ? hit.spouseIndex ?? null : null
  if (hoverSpouseIndex.value !== nextSpouse) hoverSpouseIndex.value = nextSpouse
  const nextZone = hit?.zone ?? null
  if (hoverZone.value !== nextZone) hoverZone.value = nextZone
}

const clearHover = () => {
  if (hoverId.value !== null) hoverId.value = null
  if (hoverSpouseIndex.value !== null) hoverSpouseIndex.value = null
  if (hoverZone.value !== null) hoverZone.value = null
}

const finishGesture = (
  clientX: number,
  clientY: number,
  remaining: number,
  allowTap: boolean,
  event: JeOrgChartPointerEvent,
) => {
  // 还有手指按着（双指缩放中途抬起一指）：只重设基准，不结算点击 / 拖拽
  if (remaining > 0) {
    if (remaining === 1) {
      const [point] = [...pointers.values()]
      if (point) panStart = { x: point.x, y: point.y, offsetX: offsetX.value, offsetY: offsetY.value }
      pinchStart = null
    }
    moved = true
    return
  }

  if (dragId.value) {
    commitDrag()
    resetDrag()
  } else if (!moved && allowTap) {
    handleTap(clientX, clientY, event)
  }

  dragCandidate = null
  panStart = null
  pinchStart = null
  moved = false
  panning.value = false
}

const handleTap = (clientX: number, clientY: number, event: JeOrgChartPointerEvent) => {
  const local = localOf(clientX, clientY)
  const hit = hitTest(local.x, local.y)
  if (!hit) {
    activeId.value = null
    activeSpouseIndex.value = null
    return
  }
  if (hit.zone === 'toggle') {
    toggleNode(hit.id)
    return
  }
  if (hit.zone === 'spouse') {
    const host = nodeMap.value.get(hit.id)
    const index = hit.spouseIndex ?? 0
    const spouse = spousesOf(host)[index]
    if (host && spouse) {
      activeId.value = hit.id
      activeSpouseIndex.value = index
      emit('spouse-click', spouse, host, event)
    }
    return
  }
  const data = nodeMap.value.get(hit.id)
  if (data) {
    activeId.value = hit.id
    activeSpouseIndex.value = null
    emit('node-click', data, event)
  }
}

const syncTouches = (event: TouchEvent) => {
  pointers.clear()
  for (const touch of Array.from(event.touches ?? [])) {
    pointers.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
  }
}

const onTouchStart = (event: TouchEvent) => {
  lastTouchTs = Date.now()
  measure()
  syncTouches(event)
  const first = (event.touches ?? [])[0]
  if (!first) return
  beginGesture(first.clientX, first.clientY, (event.touches?.length ?? 0) >= 2)
}

const onTouchMove = (event: TouchEvent) => {
  syncTouches(event)
  const first = (event.touches ?? [])[0]
  if (!first) return
  handleMove(first.clientX, first.clientY, (event.touches?.length ?? 0) >= 2)
}

const onTouchEnd = (event: TouchEvent) => {
  syncTouches(event)
  const changed = (event.changedTouches ?? [])[0]
  finishGesture(changed?.clientX ?? 0, changed?.clientY ?? 0, event.touches?.length ?? 0, true, event)
}

const onTouchCancel = (event: TouchEvent) => {
  pointers.clear()
  resetDrag()
  panStart = null
  pinchStart = null
  moved = false
  panning.value = false
  clearHover()
  void event
}

const onMouseDown = (event: MouseEvent) => {
  // 触摸设备上浏览器会在触摸后补发一套合成鼠标事件，忽略之
  if (Date.now() - lastTouchTs < 600) return
  if (event.button !== 0) return
  measure()
  pointers.clear()
  pointers.set(MOUSE_ID, { x: event.clientX, y: event.clientY })
  beginGesture(event.clientX, event.clientY, false)
}

const onMouseMove = (event: MouseEvent) => {
  if (!pointers.has(MOUSE_ID)) {
    updateHover(event.clientX, event.clientY)
    return
  }
  pointers.set(MOUSE_ID, { x: event.clientX, y: event.clientY })
  handleMove(event.clientX, event.clientY, false)
}

const onMouseUp = (event: MouseEvent) => {
  if (!pointers.has(MOUSE_ID)) return
  pointers.delete(MOUSE_ID)
  finishGesture(event.clientX, event.clientY, 0, true, event)
}

const onMouseLeave = () => {
  if (pointers.has(MOUSE_ID)) {
    pointers.delete(MOUSE_ID)
    // 鼠标移出容器 = 手势结束，不再结算点击（避免在容器外交付出一次假点击）
    finishGesture(0, 0, 0, false, { clientX: 0, clientY: 0 } as unknown as MouseEvent)
  }
  if (pointers.size === 0) clearHover()
}

const onWheel = (event: WheelEvent) => {
  // #ifdef H5
  event.preventDefault()
  const local = localOf(event.clientX, event.clientY)
  zoomAt(local.x, local.y, scale.value * Math.exp(-event.deltaY * 0.0015))
  // #endif
}

const cursor = computed(() => {
  if (dragId.value || panning.value) return 'grabbing'
  if (!hoverId.value) return 'grab'
  return props.draggable && hoverZone.value === 'body' ? 'move' : 'pointer'
})

/* ---------------------------------------------------------- 详情浮层 */

/** 选中目标所属的主卡数据（选中配偶卡时，这里仍是它所属的主卡） */
const popupHost = computed(() => (activeId.value ? nodeMap.value.get(activeId.value) ?? null : null))

const popupZone = computed<'node' | 'spouse'>(() =>
  activeSpouseIndex.value === null ? 'node' : 'spouse',
)

const popupSpouse = computed<JeOrgChartSpouse | null>(() => {
  const index = activeSpouseIndex.value
  const host = popupHost.value
  if (index === null || !host) return null
  return spousesOf(host)[index] ?? null
})

/** 目标有效、且对应插槽存在（或已开启内置编辑 / 增删）时才渲染浮层 */
const popupVisible = computed(() => {
  if (!popupHost.value) return false
  if (popupZone.value === 'spouse') return Boolean(slots['spouse-popup']) && Boolean(popupSpouse.value)
  return Boolean(slots['node-popup']) || props.editable || props.addable || props.removable
})

/** 锚点矩形（世界坐标）：配偶卡锚到那张配偶卡，主卡锚到「主卡 + 各配偶卡」整块 */
const popupAnchor = computed(() => {
  const id = activeId.value
  const node = id ? layout.value.index.get(id) : undefined
  if (!node) return null
  const index = activeSpouseIndex.value
  if (index !== null) {
    return { x: spouseX(node, index), y: node.y, width: spouseWidth.value, height: props.nodeHeight }
  }
  return { x: node.x, y: node.y, width: node.boxWidth, height: props.nodeHeight }
})

/**
 * 浮层落在卡片下方（纯 CSS 落位，不依赖 Teleport）：把锚点经视口矩阵换算成屏幕坐标，
 * 横向夹在容器内，箭头对准锚点中心。
 */
const popupStyle = computed<CSSProperties>(() => {
  const anchor = popupAnchor.value
  if (!anchor) return { display: 'none' }
  const s = scale.value
  const anchorX = (anchor.x + anchor.width / 2) * s + offsetX.value
  const top = (anchor.y + anchor.height) * s + offsetY.value + POPUP_GAP
  const maxLeft = Math.max(POPUP_MARGIN, viewRect.value.width - POPUP_WIDTH - POPUP_MARGIN)
  const left = clamp(anchorX - POPUP_WIDTH / 2, POPUP_MARGIN, maxLeft)
  return { left: `${left}px`, top: `${top}px` }
})

const popupArrowStyle = computed<CSSProperties>(() => {
  const anchor = popupAnchor.value
  if (!anchor) return {}
  const s = scale.value
  const anchorX = (anchor.x + anchor.width / 2) * s + offsetX.value
  const left = Number(popupStyle.value.left?.toString().replace('px', '') ?? POPUP_MARGIN)
  return { left: `${clamp(anchorX - left, 16, Math.max(16, POPUP_WIDTH - 16))}px` }
})

const closePopup = () => {
  activeId.value = null
  activeSpouseIndex.value = null
}

/* ---------------------------------------------------------- 表单编辑 */

const draftName = ref('')
const draftTitle = ref('')

watch(
  () => (props.editable && popupZone.value === 'node' ? popupHost.value : null),
  (host) => {
    draftName.value = host ? String(host.name ?? '') : ''
    draftTitle.value = host ? String(host.title ?? '') : ''
  },
  { immediate: true },
)

/** 主标题必填，空串不允许保存 */
const canSaveEdit = computed(() => draftName.value.trim().length > 0)

const saveEdit = () => {
  const host = popupHost.value
  if (!props.editable || !host || !canSaveEdit.value) return
  const id = String(host.id)
  const name = draftName.value.trim()
  const title = draftTitle.value.trim()
  commitNodes(
    currentNodeList().map((item) =>
      String(item.id) === id ? { ...item, name, title: title || undefined } : item,
    ),
  )
  closePopup()
}

/* ---------------------------------------------------------- 增删节点 */

/** 浮层里「删除」按钮的二次确认态：非 null 时浮层显示确认条 */
const confirmRemoveId = ref<string | null>(null)
/** 确认条上显示的下级数量（不含被点的节点自身） */
const pendingRemoveCount = ref(0)

watch([activeId, activeSpouseIndex], () => {
  if (confirmRemoveId.value !== null) {
    confirmRemoveId.value = null
    pendingRemoveCount.value = 0
  }
})

/** 新节点 id 的自增段（与时间戳一起保证本地唯一） */
let newNodeSeed = 0

const genNodeId = (): string => {
  let id = ''
  do {
    newNodeSeed += 1
    id = `node-${Date.now().toString(36)}-${newNodeSeed}`
  } while (currentNodeList().some((item) => String(item.id) === id))
  return id
}

/** 收集某节点及其全部下级（先序）；成环数据也不会死循环 */
const collectSubtree = (rootId: string): JeOrgChartNode[] => {
  const byId = new Map<string, JeOrgChartNode>()
  const children = new Map<string, string[]>()
  for (const node of currentNodeList()) {
    const id = String(node.id)
    if (!byId.has(id)) byId.set(id, node)
    const parent = node.parentId == null ? null : String(node.parentId)
    if (!parent) continue
    const bucket = children.get(parent)
    if (bucket) bucket.push(id)
    else children.set(parent, [id])
  }
  const out: JeOrgChartNode[] = []
  const seen = new Set<string>()
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop() as string
    if (seen.has(id)) continue
    seen.add(id)
    const node = byId.get(id)
    if (node) out.push(node)
    for (const childId of children.get(id) ?? []) stack.push(childId)
  }
  return out
}

/** 在指定节点下追加一个下级（需 addable） */
const addChild = (parentId: string | number): boolean => {
  if (!props.addable) return false
  const pid = String(parentId)
  if (!currentNodeList().some((item) => String(item.id) === pid)) return false
  const node: JeOrgChartNode = { id: genNodeId(), parentId: pid, name: NEW_NODE_NAME }
  emit('node-add', node, pid)
  commitNodes([...currentNodeList(), node])
  if (collapsed.value.has(pid)) {
    const next = new Set(collapsed.value)
    next.delete(pid)
    collapsed.value = next
  }
  activeId.value = String(node.id)
  activeSpouseIndex.value = null
  return true
}

/** 删除某节点及其全部下级（需 removable） */
const removeNode = (id: string | number): boolean => {
  if (!props.removable) return false
  const target = String(id)
  const removed = collectSubtree(target)
  const origin = removed[0]
  if (!origin) return false
  const removedIds = new Set(removed.map((item) => String(item.id)))
  emit('node-remove', removed, origin)
  commitNodes(currentNodeList().filter((item) => !removedIds.has(String(item.id))))
  closePopup()
  return true
}

const onAddChild = () => {
  const host = popupHost.value
  if (host) addChild(host.id)
}

const askRemove = () => {
  const host = popupHost.value
  if (!props.removable || !host) return
  const id = String(host.id)
  confirmRemoveId.value = id
  pendingRemoveCount.value = Math.max(0, collectSubtree(id).length - 1)
}

const cancelRemove = () => {
  confirmRemoveId.value = null
  pendingRemoveCount.value = 0
}

const doRemove = () => {
  const id = confirmRemoveId.value
  cancelRemove()
  if (id) removeNode(id)
}

/* -------------------------------------------------------------- 定位 */

/**
 * 定位到指定节点：先按 id 精确匹配，再按 name / title 模糊匹配。
 * 会自动展开它到根的整条路径、居中放大并高亮；找不到返回 false。
 */
const locate = (keyword: string | number): boolean => {
  const raw = String(keyword ?? '').trim()
  if (!raw) return false

  let target: JeOrgChartNode | null = null
  for (const node of nodeMap.value.values()) {
    if (String(node.id) === raw) {
      target = node
      break
    }
  }
  if (!target) {
    const lower = raw.toLowerCase()
    for (const node of nodeMap.value.values()) {
      if (`${node.name ?? ''} ${node.title ?? ''}`.toLowerCase().includes(lower)) {
        target = node
        break
      }
    }
  }
  if (!target) return false

  const id = String(target.id)
  expandTo(id)
  activeId.value = id
  activeSpouseIndex.value = null
  emit('locate', target)
  void nextTick(() => centerOn(id))
  return true
}

/** 当前可见节点的 id 列表（先序），便于外部统计或断言 */
const getVisibleIds = () => layout.value.nodes.map((node) => node.id)

defineExpose({
  /** 定位到某个节点（id 精确匹配或 name / title 模糊匹配），自动展开祖先并居中高亮 */
  locate,
  /** 展开从根到指定节点 id 的整条路径 */
  expandTo,
  /** 展开全部节点 */
  expandAll,
  /** 折叠到指定层级，缺省 0 即只留根节点 */
  collapseTo,
  /** 把整张图适配进当前视口 */
  fit,
  /** 当前可见节点的 id 列表 */
  getVisibleIds,
  /** 在指定节点下追加一个下级（需 addable），成功返回 true；插槽自定义 UI 时可用 */
  addChild,
  /** 删除某节点及其全部下级（需 removable），成功返回 true；插槽自定义 UI 时可用 */
  removeNode,
  /** 撤销上一次「增删 / 编辑 / 拖拽」（需 undoable）；成功返回 true，没得撤返回 false */
  undo,
  /** 重做被撤销的变更（需 undoable）；成功返回 true，没得重做返回 false */
  redo,
  /** 清空历史（需 undoable），之后 canUndo / canRedo 都为 false */
  clearHistory,
})

/* ------------------------------------------------------------ 连线 */

/**
 * 纯 CSS 连线：主库在 canvas 里画贝塞尔 / 肘形 / 斜线，uni 端一律用 `<view>` 的
 * `border-top` / `border-left` 直角折线拼出来（`curve` 与 `elbow` 同为折线，`straight`
 * 用一条旋转的横线表示）。每段的坐标由布局内核的 `edges`（设计稿 px）给出。
 */
const linkSegments = computed<CSSProperties[]>(() => {
  const list: CSSProperties[] = []
  const style = props.linkStyle
  for (const edge of layout.value.edges) {
    if (style === 'straight') {
      const dx = edge.toX - edge.fromX
      const dy = edge.toY - edge.fromY
      const length = Math.hypot(dx, dy)
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI
      list.push({
        left: `${edge.fromX}px`,
        top: `${edge.fromY}px`,
        width: `${length}px`,
        height: '0px',
        borderTopWidth: '1.5px',
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 0',
      })
      continue
    }
    const midY = (edge.fromY + edge.toY) / 2
    const left = Math.min(edge.fromX, edge.toX)
    const right = Math.max(edge.fromX, edge.toX)
    // 父节点块下沿中点 → 中线
    list.push({
      left: `${edge.fromX}px`,
      top: `${edge.fromY}px`,
      width: '0px',
      height: `${midY - edge.fromY}px`,
      borderLeftWidth: '1.5px',
    })
    // 中线横段
    list.push({
      left: `${left}px`,
      top: `${midY}px`,
      width: `${right - left}px`,
      height: '0px',
      borderTopWidth: '1.5px',
    })
    // 中线 → 子节点块上沿中点
    list.push({
      left: `${edge.toX}px`,
      top: `${midY}px`,
      width: '0px',
      height: `${edge.toY - midY}px`,
      borderLeftWidth: '1.5px',
    })
  }
  return list
})

/* ------------------------------------------------------------ 样式 */

const rootStyle = computed<CSSProperties>(() => ({
  background: props.background || undefined,
}))

const stageStyle = computed<CSSProperties>(() => ({
  width: `${layout.value.width}px`,
  height: `${layout.value.height}px`,
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
}))

/** 多棵树之间的间距与布局内核的 rootGap（gapX * 2）一致 */
const rootsStyle = computed<CSSProperties>(() => ({ gap: `${props.gapX * 2}px` }))

const viewportStyle = computed<CSSProperties>(() => ({ cursor: cursor.value }))

/* -------------------------------------------------------------- 测量 */

/** 汇总到一处的容器矩形更新：首次拿到有效尺寸时按初始视口摆位 */
const applyRect = (left: number, top: number, width: number, height: number) => {
  const first = viewRect.value.width === 0
  viewRect.value = { left, top, width, height }
  if (first) void nextTick(resetView)
}

/**
 * 量取根容器相对视口的矩形。H5 直接读真实 DOM（每次手势开始重算，页面滚动后依然准确）；
 * 小程序端没有 DOM，只能异步走 SelectorQuery，量一次后复用（页面滚动后的偏移不做同步修正）。
 */
const measure = () => {
  // #ifdef H5
  const el = pick(rootRef.value)
  if (el) {
    const rect = el.getBoundingClientRect()
    applyRect(rect.left, rect.top, rect.width, rect.height)
  }
  // #endif
  // #ifndef H5
  if (viewRect.value.width === 0 && instance?.proxy) {
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select('.je-org-chart')
      .boundingClientRect()
      .exec((res) => {
        const rect = res?.[0] as unknown as
          | { left?: number; top?: number; width?: number; height?: number }
          | null
          | undefined
        if (rect) applyRect(rect.left ?? 0, rect.top ?? 0, rect.width ?? 0, rect.height ?? 0)
      })
  }
  // #endif
}

// #ifdef H5
let resizeObserver: ResizeObserver | null = null
// #endif

/* ------------------------------------------------------------ 生命周期 */

/** 是否已经用「首屏数据」摆好默认折叠与初始视口（编辑等后续数据变化不再重置视口） */
let viewInitialized = false

watch(
  sources,
  (list) => {
    if (!list.length || viewInitialized) return
    viewInitialized = true
    applyDefaultCollapse()
    void nextTick(resetView)
  },
  { immediate: true },
)

watch(layout, (l) => {
  // 折叠后原本选中 / 悬停的节点可能被藏起来，及时清掉
  if (hoverId.value && !l.index.has(hoverId.value)) hoverId.value = null
  if (activeId.value && !l.index.has(activeId.value)) {
    activeId.value = null
    activeSpouseIndex.value = null
  }
})

onMounted(() => {
  // #ifdef H5
  measure()
  const el = pick(rootRef.value)
  if (el && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(el)
  }
  // #endif
  // #ifndef H5
  measure()
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  resizeObserver?.disconnect()
  resizeObserver = null
  // #endif
})
</script>

<template>
  <view
    ref="rootRef"
    class="je-org-chart"
    role="img"
    :aria-label="label"
    :style="rootStyle"
  >
    <view
      class="je-org-chart__viewport"
      :style="viewportStyle"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
      @wheel="onWheel"
    >
      <view class="je-org-chart__stage" :style="stageStyle">
        <!-- 连线层：纯 CSS 直角折线，由布局内核的 edges 下标绝对定位，压在所有卡片之下 -->
        <view class="je-org-chart__links" aria-hidden="true">
          <view v-for="(seg, index) in linkSegments" :key="index" class="je-org-chart__link" :style="seg" />
        </view>
        <!-- 节点层：递归渲染，几何与布局内核同源 -->
        <view class="je-org-chart__roots" :style="rootsStyle">
          <JeOrgChartNodeView v-for="rootId in layout.roots" :key="rootId" :node-id="rootId" />
        </view>
      </view>
    </view>

    <view v-if="popupVisible" class="je-org-chart__popup" :style="popupStyle">
      <view class="je-org-chart__popup-arrow is-up" :style="popupArrowStyle" />
      <!-- 主卡详情浮层：插槽参数 node 是当前节点数据，close 收起浮层 -->
      <slot
        v-if="popupZone === 'node' && slots['node-popup']"
        name="node-popup"
        :node="popupHost"
        :close="closePopup"
      />
      <!-- 内置操作浮层（未提供 node-popup 插槽时生效）：可编辑时是表单，另有增删入口 -->
      <view v-else-if="popupZone === 'node'" class="je-org-chart__editor">
        <template v-if="editable">
          <view class="je-org-chart__field">
            <text class="je-org-chart__label">名称</text>
            <input
              v-model="draftName"
              class="je-org-chart__input"
              type="text"
              :maxlength="40"
              @confirm="saveEdit"
            />
          </view>
          <view class="je-org-chart__field">
            <text class="je-org-chart__label">职位</text>
            <input
              v-model="draftTitle"
              class="je-org-chart__input"
              type="text"
              :maxlength="40"
              @confirm="saveEdit"
            />
          </view>
        </template>
        <!-- 只开增删、没开编辑时，用一行只读名字给浮层一点上下文 -->
        <view v-else class="je-org-chart__readonly">
          <text class="je-org-chart__readonly-text">{{ popupHost?.name }}</text>
        </view>

        <!-- 删除的二次确认态：替换掉下面的操作行 -->
        <template v-if="confirmRemoveId">
          <text class="je-org-chart__confirm">
            {{
              pendingRemoveCount > 0
                ? `将删除该节点及其 ${pendingRemoveCount} 个下级，确定吗？`
                : '确定删除该节点吗？'
            }}
          </text>
          <view class="je-org-chart__actions">
            <button type="button" class="je-org-chart__btn" @tap="cancelRemove">取消</button>
            <button type="button" class="je-org-chart__btn is-danger" @tap="doRemove">确定</button>
          </view>
        </template>
        <view v-else class="je-org-chart__actions is-split">
          <view class="je-org-chart__action-group">
            <button v-if="addable" type="button" class="je-org-chart__btn" @tap="onAddChild">
              添加下级
            </button>
            <button
              v-if="removable"
              type="button"
              class="je-org-chart__btn is-danger-ghost"
              @tap="askRemove"
            >
              删除
            </button>
          </view>
          <view v-if="editable" class="je-org-chart__action-group">
            <button type="button" class="je-org-chart__btn" @tap="closePopup">取消</button>
            <button
              type="button"
              class="je-org-chart__btn is-primary"
              :disabled="!canSaveEdit"
              @tap="saveEdit"
            >
              确定
            </button>
          </view>
        </view>
      </view>
      <!-- 配偶详情浮层：插槽参数 spouse 是配偶数据、host 是配偶所属的主卡、close 收起浮层 -->
      <slot v-else name="spouse-popup" :spouse="popupSpouse" :host="popupHost" :close="closePopup" />
    </view>
  </view>
</template>

<style scoped>
.je-org-chart {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  font-family: inherit;
  user-select: none;
  -webkit-user-select: none;
}

/* 视口：铺满根节点、裁掉溢出内容；手势由指针 / 触摸事件全权处理 */
.je-org-chart__viewport {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: hidden;
  touch-action: none;
}

/* 舞台：设计稿坐标空间，整体做缩放 / 平移，连线与节点一起变换 */
.je-org-chart__stage {
  position: relative;
  transform-origin: 0 0;
  will-change: transform;
}

.je-org-chart__links {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

/* 连线的一段：只画上 / 左边框，颜色跟随主题（--je-org-edge 可覆盖） */
.je-org-chart__link {
  position: absolute;
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;
  border-color: var(--je-org-edge, var(--je-border-color));
}

/* 节点层压在连线之上 */
.je-org-chart__roots {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
}

/* ------------------------------------------------ 详情 / 编辑浮层 */

.je-org-chart__popup {
  position: absolute;
  z-index: 2;
  width: max-content;
  max-width: 288px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--je-text);
  background: var(--je-org-popup-bg, var(--je-surface));
  border: 1px solid var(--je-org-popup-border, var(--je-border-color));
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
}

/* 浮层在卡片下方 → 箭头朝上；三角形与浮层同色，像个对话气泡 */
.je-org-chart__popup-arrow {
  position: absolute;
  width: 0;
  height: 0;
  margin-left: -8px;
  border-right: 8px solid transparent;
  border-left: 8px solid transparent;
}

.je-org-chart__popup-arrow.is-up {
  top: -7px;
  border-bottom: 8px solid var(--je-org-popup-bg, var(--je-surface));
}

.je-org-chart__editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 208px;
}

.je-org-chart__field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.je-org-chart__label {
  flex: 0 0 auto;
  width: 42px;
  font-size: 12px;
  color: var(--je-text-muted);
}

.je-org-chart__input {
  flex: 1 1 auto;
  box-sizing: border-box;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  font-family: inherit;
  font-size: 13px;
  color: var(--je-text);
  background: var(--je-bg-page-from, transparent);
  border: 1px solid var(--je-border-color);
  border-radius: 6px;
  /* 根节点为了拖拽平移禁用了文本选择，输入框里必须放开 */
  user-select: text;
  -webkit-user-select: text;
}

.je-org-chart__readonly {
  max-width: 240px;
  overflow: hidden;
}

.je-org-chart__readonly-text {
  font-weight: 600;
  color: var(--je-text);
  white-space: nowrap;
}

.je-org-chart__confirm {
  margin: 0;
  color: var(--je-text);
  white-space: normal;
}

.je-org-chart__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}

/* 增删入口在左、确定取消在右；挤不下时换行而不是溢出浮层 */
.je-org-chart__actions.is-split {
  flex-wrap: wrap;
  justify-content: space-between;
}

.je-org-chart__action-group {
  display: flex;
  gap: 8px;
}

/* 原生 button 自带 margin-left/right: auto 与 ::after 描边，显式压掉 */
.je-org-chart button {
  margin: 0;
}

.je-org-chart button::after {
  border: none;
}

.je-org-chart__btn {
  box-sizing: border-box;
  min-height: 0;
  height: 28px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1;
  color: var(--je-text);
  background: var(--je-surface);
  border: 1px solid var(--je-border-color);
  border-radius: 6px;
}

/* 彩色表面上的文字走 on-color（见主题铁律），不要退回 --je-text */
.je-org-chart__btn.is-primary {
  color: var(--je-text-on-color);
  background: var(--je-primary);
  border-color: var(--je-primary);
}

/* 删除确认的实体危险按钮 */
.je-org-chart__btn.is-danger {
  color: var(--je-text-on-color);
  background: var(--je-danger);
  border-color: var(--je-danger);
}

/* 浮层里的「删除」入口是描边危险色 —— 底色仍是普通表面，文字直接用 danger 即可 */
.je-org-chart__btn.is-danger-ghost {
  color: var(--je-danger);
  border-color: color-mix(in srgb, var(--je-danger) 45%, transparent);
}

.je-org-chart__btn:disabled {
  opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
  .je-org-chart__stage {
    transition: none;
  }
}
</style>
