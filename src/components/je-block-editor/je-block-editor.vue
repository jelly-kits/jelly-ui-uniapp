<script setup lang="ts">
/*
 * 块编辑器（uni 版）：一段文本 / 一张图片 / 一个视频 / 一条超链接各占一块，
 * 每块宽度占满、可拖动排序，数据是一份不含 HTML 的纯 JSON（JeBlockDocument）。
 *
 * 交互口径与主库完全一致：
 * - 列表里每个块都只是「预览」，点一下选中（出现高亮边框），未选中时不显示任何图标；
 * - 选中后才显示块头部的图标：拖动把手 + 编辑 / 上移 / 下移 / 复制 / 删除，
 *   点「编辑」才弹出这个块真正的编辑窗口（居中弹窗，改完点确定才落数据）；
 * - 从顶部操作栏添加新块时，自动选中并直接打开它的编辑窗口。
 *
 * 与主库的差异（平台能力所致，对外 API 不变）：
 * - 拖动走 touchstart / touchmove / touchend，块的位置用 createSelectorQuery 量一次，
 *   移动过程中只做数值比较；量不到位置时（极少数环境）拖动不生效，仍可用上移 / 下移；
 * - 选文件走 H5 的原生 input 与小程序端的 uni.chooseMedia，传给 upload 的
 *   分别是 File 与本地临时路径（与 JeUpload 同一口径）。
 */
import { computed, getCurrentInstance, ref, watch } from 'vue'
import JeButton from '../je-button/je-button.vue'
import JeDialog from '../je-dialog/je-dialog.vue'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import { useJeLocale } from '../je-locale'
import { JE_BLOCK_VERSION } from './types'
import type {
  JeBlock,
  JeBlockActionItem,
  JeBlockActionKey,
  JeBlockButton,
  JeBlockButtonContext,
  JeBlockDocument,
  JeBlockFit,
  JeBlockImage,
  JeBlockInput,
  JeBlockInsertKey,
  JeBlockLengthUnit,
  JeBlockPatch,
  JeBlockToolbarItem,
  JeBlockType,
  JeBlockUpload,
  JeBlockUploadFile,
  JeBlockWidthPreset,
} from './types'

defineOptions({ name: 'JeBlockEditor' })

const props = withDefaults(
  defineProps<{
    /** 完整数据，v-model 绑定 */
    modelValue?: JeBlockDocument
    /** 允许添加的块类型白名单，不传则四种都能加 */
    blockTypes?: JeBlockType[]
    /**
     * 顶部操作栏：内置「添加块」按钮写块类型 key（同时就是白名单与顺序），
     * `'divider'` 画分组竖线，也可以直接混入自定义按钮对象。不传则四种块都可加。
     */
    toolbar?: JeBlockToolbarItem[]
    /**
     * 每块头部的操作按钮：内置 key 是 `'drag' | 'edit' | 'up' | 'down' | 'copy' | 'remove'`，
     * 同样支持 `'divider'` 与自定义按钮对象。不传即全部六个。
     */
    blockActions?: JeBlockActionItem[]
    /** 文本块的占位文案 */
    placeholder?: string
    /** 图片 / 视频上传回调，不传则编辑窗口里只能填地址 */
    upload?: JeBlockUpload
    disabled?: boolean
  }>(),
  {
    modelValue: undefined,
    blockTypes: undefined,
    toolbar: undefined,
    blockActions: undefined,
    placeholder: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeBlockDocument]
  /** 数据变化，与 update:modelValue 同值，便于 v-model 之外单独监听 */
  change: [value: JeBlockDocument]
  /** 上传失败（回调抛错时派发） */
  'upload-error': [file: JeBlockUploadFile, error: unknown]
}>()

const { t } = useJeLocale()

/** 默认顶部操作栏：四种块各一个按钮 */
const DEFAULT_TOOLBAR: JeBlockToolbarItem[] = ['text', 'image', 'video', 'link']
/** 默认块头部：把手 + 编辑 / 上移 / 下移 / 复制 / 删除 */
const DEFAULT_ACTIONS: JeBlockActionItem[] = ['drag', 'edit', 'up', 'down', 'copy', 'remove']

const ALL_TYPES: JeBlockType[] = ['text', 'image', 'video', 'link']
/** 编辑窗口里的宽度档位 */
const WIDTH_PRESETS: JeBlockWidthPreset[] = ['25%', '50%', '75%', '100%']
/** 编辑窗口里的缩放方式 */
const FIT_OPTIONS: JeBlockFit[] = ['contain', 'cover', 'fill']
/** 长度输入框的单位切换候选项 */
const UNIT_OPTIONS: JeBlockLengthUnit[] = ['%', 'px']

/** 新块的 id：时间戳 + 自增，够用且不依赖 crypto */
let seed = 0
const createId = () => `blk_${Date.now().toString(36)}${(seed += 1).toString(36)}`

const clone = (blocks: JeBlock[]): JeBlock[] => blocks.map((block) => ({ ...block }))

/** 组件实例：createSelectorQuery 要靠它把查询范围收在当前组件内 */
const instance = getCurrentInstance()

/** 端上输入事件没有 DOM 的 target.value，值统一从 event.detail.value 里取 */
const readDetail = (event: Event): string => {
  const detail = (event as unknown as { detail?: { value?: string } }).detail
  return detail?.value ?? ''
}

const localBlocks = ref<JeBlock[]>(clone(props.modelValue?.blocks ?? []))

const buildDocument = (): JeBlockDocument => ({
  // 版本号沿用外部传进来的，方便宿主自己升版本
  version: props.modelValue?.version ?? JE_BLOCK_VERSION,
  blocks: clone(localBlocks.value),
})

const commit = () => {
  const document = buildDocument()
  emit('update:modelValue', document)
  emit('change', document)
}

watch(
  () => props.modelValue,
  (value) => {
    const incoming = value?.blocks ?? []
    // 自己刚 emit 出去的值会绕回来，内容一致就整段跳过，
    // 否则每次改动都会重建整个列表，拖动态会被打断
    if (JSON.stringify(incoming) === JSON.stringify(localBlocks.value)) return
    localBlocks.value = clone(incoming)
    // 外部换了一整份数据，之前选中 / 正在编辑 / 正在播放的块可能已经不存在了
    if (!localBlocks.value.some((block) => block.id === selectedId.value)) selectedId.value = ''
    if (!localBlocks.value.some((block) => block.id === playingId.value)) playingId.value = ''
    if (!localBlocks.value.some((block) => block.id === editingId.value)) closeEditor()
  },
  { deep: true },
)

/* -------------------- 选中态 -------------------- */

/** 当前选中的块，空串表示没选中；只有选中的块才显示头部图标 */
const selectedId = ref('')

const selectBlock = (id: string) => {
  if (props.disabled || dragIndex.value >= 0) return
  // 已被删掉的块（点删除时事件会冒泡上来）不再回填选中
  if (id && !localBlocks.value.some((block) => block.id === id)) return
  selectedId.value = id
}

/* -------------------- 视频播放 -------------------- */

/**
 * 正在播放的视频块，空串表示都还停在封面上。
 * 视频默认不挂载播放器（只渲染封面 + 播放键），点了才挂载，免得一进页面就拉视频流量。
 */
const playingId = ref('')

const playVideo = (id: string) => {
  playingId.value = id
}

/* -------------------- 增删改 -------------------- */

const createBlock = (type: JeBlockType): JeBlock => {
  const id = createId()
  if (type === 'text') return { id, type, text: '' }
  if (type === 'image') return { id, type, url: '' }
  if (type === 'video') return { id, type, url: '' }
  return { id, type, url: '', title: '' }
}

/** 插入一个块，返回它的 id（外部可以不传 id，这里补上） */
const insertBlock = (input: JeBlockInput, at?: number): string => {
  if (props.disabled) return ''
  const id = input.id ?? createId()
  const block: JeBlock = { ...input, id } as JeBlock
  localBlocks.value.splice(at ?? localBlocks.value.length, 0, block)
  commit()
  return id
}

/** 按类型追加一个空块 */
const addBlock = (type: JeBlockType): string => insertBlock(createBlock(type))

/** 把空的字符串字段收成 undefined，免得存库的 JSON 里全是空串 */
const compact = (value: string) => (value === '' ? undefined : value)

const patchBlock = (id: string, patch: JeBlockPatch) => {
  const target = localBlocks.value.find((block) => block.id === id)
  if (!target) return
  Object.assign(target, patch)
  commit()
}

const removeBlock = (id: string) => {
  const index = localBlocks.value.findIndex((block) => block.id === id)
  if (index < 0) return
  localBlocks.value.splice(index, 1)
  if (selectedId.value === id) selectedId.value = ''
  if (playingId.value === id) playingId.value = ''
  if (editingId.value === id) closeEditor()
  commit()
}

const copyBlock = (id: string) => {
  const index = localBlocks.value.findIndex((block) => block.id === id)
  if (index < 0) return
  const copyId = insertBlock({ ...localBlocks.value[index], id: createId() }, index + 1)
  selectedId.value = copyId
}

/** 把 from 处的块挪到 to 处（to 是插入目标下标，允许等于列表长度） */
const moveBlock = (from: number, to: number) => {
  const blocks = localBlocks.value
  if (from < 0 || from >= blocks.length) return
  const target = Math.max(0, Math.min(to, blocks.length))
  if (target === from || target === from + 1) return
  const [moved] = blocks.splice(from, 1)
  blocks.splice(target > from ? target - 1 : target, 0, moved)
  commit()
}

const clear = () => {
  localBlocks.value = []
  selectedId.value = ''
  playingId.value = ''
  closeEditor()
  commit()
}

/* -------------------- 拖动排序 -------------------- */

/** 正在被拖动的块下标，-1 表示没在拖 */
const dragIndex = ref(-1)
/** 松手后会插入到的位置（0..块数），与 dragIndex 同时用于画指示线 */
const dropIndex = ref(-1)

/** 按下把手时量到的每块位置：拖动过程中只做数值比较，不再反复查询 DOM */
let dragRects: { top: number; height: number }[] = []

/** 量一次所有块的位置；量不到就保持空数组（此时拖动不生效，上移 / 下移仍可用） */
const measureItems = () =>
  new Promise<void>((resolve) => {
    if (!instance?.proxy) {
      resolve()
      return
    }
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .selectAll('.je-block-editor__item')
      .boundingClientRect((result) => {
        const list = (Array.isArray(result) ? result : [result]) as unknown as {
          top?: number
          height?: number
        }[]
        dragRects = list
          .filter((item) => typeof item?.top === 'number' && typeof item?.height === 'number')
          .map((item) => ({ top: item.top as number, height: item.height as number }))
        resolve()
      })
      .exec()
  })

const startDrag = async (index: number) => {
  if (props.disabled) return
  dragIndex.value = index
  dropIndex.value = index
  dragRects = []
  await measureItems()
}

const onDragMove = (event: TouchEvent) => {
  if (dragIndex.value < 0 || !dragRects.length) return
  const touch = event.touches?.[0]
  if (!touch) return
  // 指针越过某块的中线，就认为要插到它前面；都没越过则插到末尾
  let target = dragRects.length
  for (let index = 0; index < dragRects.length; index += 1) {
    const rect = dragRects[index]
    if (touch.clientY < rect.top + rect.height / 2) {
      target = index
      break
    }
  }
  dropIndex.value = target
}

const stopDrag = () => {
  const from = dragIndex.value
  const to = dropIndex.value
  if (from >= 0 && to >= 0) moveBlock(from, to)
  dragIndex.value = -1
  dropIndex.value = -1
  dragRects = []
}

/* -------------------- 编辑窗口 -------------------- */

/** 编辑窗口里改的是这份草稿，点确定才写回列表 */
interface DraftState {
  id: string
  type: JeBlockType
  text: string
  url: string
  alt: string
  poster: string
  title: string
  /** CSS 宽度值，空串表示占满 */
  width: string
  /** CSS 高度值，空串表示自适应 */
  height: string
  fit: JeBlockFit
}

const dialogVisible = ref(false)
const draft = ref<DraftState | null>(null)
/** 正在编辑哪个块，关闭弹窗后清空 */
const editingId = ref('')

/** 模板里统一读这份（草稿为空时给个空壳），省掉一层层可能为空的判断 */
const EMPTY_DRAFT: DraftState = {
  id: '',
  type: 'text',
  text: '',
  url: '',
  alt: '',
  poster: '',
  title: '',
  width: '',
  height: '',
  fit: 'contain',
}
const form = computed<DraftState>(() => draft.value ?? EMPTY_DRAFT)

/** 宽高输入框的数值与单位：与 draft.width / draft.height 双向同步 */
const widthNumber = ref('')
const widthUnit = ref<JeBlockLengthUnit>('%')
const heightNumber = ref('')
const heightUnit = ref<JeBlockLengthUnit>('px')

/** 把 '360px' / '50%' 拆成数值与单位；不是长度值时返回空数值 + 兜底单位 */
const parseLength = (value: string | undefined, fallback: JeBlockLengthUnit) => {
  const matched = /^(\d+(?:\.\d+)?)(px|%)$/.exec(value ?? '')
  if (!matched) return { number: '', unit: fallback }
  return { number: matched[1], unit: matched[2] as JeBlockLengthUnit }
}

const syncSizeInputs = (width?: string, height?: string) => {
  const parsedWidth = parseLength(width, '%')
  widthNumber.value = parsedWidth.number
  widthUnit.value = parsedWidth.unit
  const parsedHeight = parseLength(height, 'px')
  heightNumber.value = parsedHeight.number
  heightUnit.value = parsedHeight.unit
}

const toDraft = (block: JeBlock): DraftState => ({
  id: block.id,
  type: block.type,
  text: block.type === 'text' ? block.text : '',
  url: block.type === 'text' ? '' : block.url,
  alt: block.type === 'image' ? block.alt ?? '' : '',
  poster: block.type === 'video' ? block.poster ?? '' : '',
  title: block.type === 'link' ? block.title ?? '' : '',
  width: block.type === 'image' || block.type === 'video' ? block.width ?? '' : '',
  height: block.type === 'image' || block.type === 'video' ? block.height ?? '' : '',
  fit: (block.type === 'image' || block.type === 'video' ? block.fit : undefined) ?? 'contain',
})

const openEditor = (id: string) => {
  if (props.disabled) return
  const block = localBlocks.value.find((item) => item.id === id)
  if (!block) return
  selectedId.value = id
  editingId.value = id
  draft.value = toDraft(block)
  syncSizeInputs(draft.value.width, draft.value.height)
  dialogVisible.value = true
}

const closeEditor = () => {
  dialogVisible.value = false
}

/** 关闭动画跑完再清草稿，否则收起过程中表单会突然变空 */
const onDialogClosed = () => {
  draft.value = null
  editingId.value = ''
}

const dialogTitle = computed(() => {
  const type = draft.value?.type
  if (!type) return ''
  return t('block.editTitle', { type: t(`block.${type}`) })
})

/** 草稿里的文本类字段：统一在模板里 @input 时按字段名回写 */
const onDraftInput = (field: 'text' | 'url' | 'alt' | 'poster' | 'title', event: Event) => {
  if (draft.value) draft.value[field] = readDetail(event)
}

/** 草稿里的宽高变化要同时回写「数值 + 单位」两个输入框 */
const setWidthPreset = (preset: JeBlockWidthPreset) => {
  if (!draft.value) return
  draft.value.width = preset
  widthNumber.value = preset.replace('%', '')
  widthUnit.value = '%'
}

const onWidthNumber = (event: Event) => {
  const number = readDetail(event).replace(/[^\d.]/g, '')
  widthNumber.value = number
  if (draft.value) draft.value.width = number ? `${number}${widthUnit.value}` : ''
}

const onWidthUnit = (unit: JeBlockLengthUnit) => {
  widthUnit.value = unit
  if (draft.value) draft.value.width = widthNumber.value ? `${widthNumber.value}${unit}` : ''
}

const onHeightNumber = (event: Event) => {
  const number = readDetail(event).replace(/[^\d.]/g, '')
  heightNumber.value = number
  if (draft.value) draft.value.height = number ? `${number}${heightUnit.value}` : ''
}

const onHeightUnit = (unit: JeBlockLengthUnit) => {
  heightUnit.value = unit
  if (draft.value) draft.value.height = heightNumber.value ? `${heightNumber.value}${unit}` : ''
}

/** 把草稿按类型摊成补丁；close 传 false 时保留弹窗（多图上传要接着再插几个块） */
const applyDraft = (close = true) => {
  const value = draft.value
  if (!value) return
  const patch: JeBlockPatch =
    value.type === 'text'
      ? { text: value.text }
      : value.type === 'link'
        ? { url: value.url.trim(), title: compact(value.title) }
        : {
            url: value.url.trim(),
            width: compact(value.width),
            height: compact(value.height),
            // contain 是默认值，不写进 JSON，数据里更干净
            fit: value.fit === 'contain' ? undefined : value.fit,
            ...(value.type === 'image'
              ? { alt: compact(value.alt) }
              : { poster: compact(value.poster) }),
          }
  patchBlock(value.id, patch)
  // 地址或封面可能变了，回到封面态重新渲染
  if (playingId.value === value.id) playingId.value = ''
  if (close) closeEditor()
}

/* -------------------- 上传 -------------------- */

/** 正在上传，用来禁用编辑窗口里的按钮 */
const uploading = ref(false)
/** 点上传时先记下要传什么，选完文件再用 */
let uploadTarget: JeBlockType = 'image'

/** 选中文件后的统一收口：逐个上传 → 落地址 → 多图时补齐后续的图片块 */
const handlePicked = async (files: JeBlockUploadFile[]) => {
  const upload = props.upload
  const value = draft.value
  if (!files.length || !upload || !value) return

  uploading.value = true
  const urls: string[] = []
  try {
    // 串行上传：地址顺序与选择顺序一致，多图落地时不会错位
    for (const file of files) {
      urls.push(await upload(file))
    }
  } catch (error) {
    emit('upload-error', files[urls.length] ?? files[0], error)
    uploading.value = false
    return
  }
  uploading.value = false

  value.url = urls[0]
  if (uploadTarget === 'video' || urls.length === 1) return

  // 多图：当前块留下第一张，其余各生成一个图片块插在它后面
  const index = localBlocks.value.findIndex((block) => block.id === value.id)
  applyDraft(false)
  if (index < 0) {
    closeEditor()
    return
  }
  const extras: JeBlockImage[] = urls.slice(1).map((url) => ({
    id: createId(),
    type: 'image',
    url,
    width: compact(value.width),
    height: compact(value.height),
    fit: value.fit === 'contain' ? undefined : value.fit,
  }))
  localBlocks.value.splice(index + 1, 0, ...extras)
  commit()
  closeEditor()
}

const pickFile = (type: JeBlockType) => {
  if (uploading.value || !props.upload) return
  uploadTarget = type

  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = type === 'video' ? 'video/*' : 'image/*'
  // 图片允许多选（一次选 N 张会落成 N 个图片块），视频只能单选
  input.multiple = type === 'image'
  input.onchange = () => {
    void handlePicked(Array.from(input.files ?? []))
  }
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseMedia({
    count: type === 'image' ? 9 : 1,
    // 只有图片 / 视频两种块会走到这里，chooseMedia 只认 image / video / mix
    mediaType: [type === 'video' ? 'video' : 'image'],
    sourceType: ['album', 'camera'],
    success: (result) => {
      void handlePicked(result.tempFiles.map((item) => item.tempFilePath))
    },
  })
  // #endif
}

/* -------------------- 顶部操作栏与块头部 -------------------- */

/** 模板只认这一种结构：内置按钮与自定义按钮在 resolveItems 里摊平 */
interface RenderItem {
  key: string
  /** 分组竖线，其余字段无意义 */
  divider?: boolean
  /** 内置 key（自定义按钮没有），把手靠它识别 */
  builtin?: string
  title: string
  icon?: JeIconName
  text?: string
  active: boolean
  disabled: boolean
  run: () => void
  /** 渲染成拖动把手（按下即拖动） */
  handle?: boolean
}

interface BuiltinSpec {
  /** 语言包 key（已含 `block.` 前缀） */
  label: string
  icon?: JeIconName
  run: (context: JeBlockButtonContext) => void
  active?: (context: JeBlockButtonContext) => boolean
  disabled?: (context: JeBlockButtonContext) => boolean
}

const contextOf = (block: JeBlock | undefined, index: number): JeBlockButtonContext => ({
  block,
  index,
  insert: insertBlock,
  update: patchBlock,
  remove: removeBlock,
  move: moveBlock,
  openEditor,
})

const insertTools: Record<JeBlockInsertKey, BuiltinSpec> = {
  // 添加完直接打开编辑窗口，接着就能填内容
  text: { label: 'block.text', icon: 'text', run: () => openEditor(addBlock('text')) },
  image: { label: 'block.image', icon: 'image', run: () => openEditor(addBlock('image')) },
  video: { label: 'block.video', icon: 'video', run: () => openEditor(addBlock('video')) },
  link: { label: 'block.link', icon: 'link', run: () => openEditor(addBlock('link')) },
}

const actionTools: Record<JeBlockActionKey, BuiltinSpec> = {
  // 把手由模板单独渲染（要接触摸事件而不是点击），这里只提供文案
  drag: { label: 'block.drag', icon: 'drag', run: () => {} },
  edit: {
    label: 'block.edit',
    icon: 'edit',
    run: (context) => context.block && openEditor(context.block.id),
  },
  up: {
    label: 'block.up',
    icon: 'arrow-up',
    disabled: (context) => context.index <= 0,
    run: (context) => moveBlock(context.index, context.index - 1),
  },
  down: {
    label: 'block.down',
    icon: 'arrow-down',
    disabled: (context) => context.index >= localBlocks.value.length - 1,
    run: (context) => moveBlock(context.index, context.index + 2),
  },
  copy: {
    label: 'block.copy',
    icon: 'copy',
    run: (context) => context.block && copyBlock(context.block.id),
  },
  remove: {
    label: 'block.remove',
    icon: 'trash',
    run: (context) => context.block && removeBlock(context.block.id),
  },
}

/** 内置项里不在白名单里的块类型直接跳过（只对顶部操作栏有意义） */
const allowInsert = (key: string) =>
  !props.blockTypes ||
  !ALL_TYPES.includes(key as JeBlockType) ||
  props.blockTypes.includes(key as JeBlockType)

const resolveItems = (
  list: (JeBlockToolbarItem | JeBlockActionItem)[],
  builtins: Record<string, BuiltinSpec>,
  context: JeBlockButtonContext,
  filterAllowed: boolean,
): RenderItem[] =>
  list.flatMap((item, index): RenderItem[] => {
    if (item === 'divider') {
      return [
        {
          key: `divider-${index}`,
          divider: true,
          title: '',
          active: false,
          disabled: false,
          run: () => {},
        },
      ]
    }
    if (typeof item === 'string') {
      if (filterAllowed && !allowInsert(item)) return []
      const spec = builtins[item]
      return [
        {
          key: item,
          builtin: item,
          title: t(spec.label),
          icon: spec.icon,
          active: spec.active?.(context) ?? false,
          disabled: props.disabled || (spec.disabled?.(context) ?? false),
          run: () => spec.run(context),
          handle: item === 'drag',
        },
      ]
    }
    const button = item as JeBlockButton
    const buttonDisabled =
      typeof button.disabled === 'function' ? button.disabled(context) : button.disabled === true
    return [
      {
        key: button.key,
        title: button.title,
        icon: button.icon,
        text: button.text,
        active: button.isActive?.(context) ?? false,
        disabled: props.disabled || buttonDisabled,
        run: () => button.onClick(context),
      },
    ]
  })

/** 顶部操作栏 */
const toolbarItems = computed(() =>
  resolveItems(props.toolbar ?? DEFAULT_TOOLBAR, insertTools, contextOf(undefined, -1), true),
)

/** 每块头部的按钮：拆成「把手」与「其余」，把手要单独放到左侧 */
const actionItems = computed(() =>
  localBlocks.value.map((block, index) => {
    const items = resolveItems(
      props.blockActions ?? DEFAULT_ACTIONS,
      actionTools,
      contextOf(block, index),
      false,
    )
    return {
      handle: items.find((item) => item.handle),
      items: items.filter((item) => !item.handle),
    }
  }),
)

/* -------------------- 预览相关的小工具 -------------------- */

const urlPlaceholder = (type: JeBlockType) => {
  if (type === 'image') return t('block.imageUrl')
  if (type === 'video') return t('block.videoUrl')
  if (type === 'link') return t('block.linkUrl')
  return t('block.url')
}

const textPlaceholder = computed(() => props.placeholder ?? t('block.placeholder'))

const fitLabel = (fit: JeBlockFit) => {
  if (fit === 'cover') return t('block.fitCover')
  if (fit === 'fill') return t('block.fitFill')
  return t('block.fitContain')
}

/** 图片 / 视频的宽度与高度，与只读渲染用的是同一套取值口径 */
const mediaStyle = (block: JeBlock) => {
  if (block.type !== 'image' && block.type !== 'video') return {}
  return {
    width: block.width || '100%',
    height: block.height || undefined,
  }
}

/** 图片填充模式：给了高度才谈得上缩放方式，否则用 widthFix 让高度跟着宽度走 */
const imageMode = (block: JeBlock) => {
  if (block.type !== 'image' || !block.height) return 'widthFix'
  if (block.fit === 'cover') return 'aspectFill'
  if (block.fit === 'fill') return 'scaleToFill'
  return 'aspectFit'
}

/** 视频的 object-fit：小程序 video 只认 contain / fill / cover */
const videoFit = (block: JeBlock) =>
  block.type === 'video' ? (block.fit ?? 'contain') : 'contain'

/** 块底部的尺寸摘要：改了宽高 / 缩放后不用打开弹窗也能看出效果 */
const sizeSummary = (block: JeBlock) => {
  if (block.type !== 'image' && block.type !== 'video') return ''
  return [
    `${t('block.width')} ${block.width || '100%'}`,
    `${t('block.height')} ${block.height || t('block.heightAuto')}`,
    fitLabel(block.fit ?? 'contain'),
  ].join(' · ')
}

defineExpose({
  /** 当前数据（深拷贝，可直接存库） */
  getDocument: buildDocument,
  /** 追加一个空块，返回新块的 id */
  addBlock,
  /** 打开某个块的编辑窗口 */
  openEditor,
  /** 清空所有块 */
  clear,
})
</script>

<template>
  <view class="je-block-editor" :class="{ 'is-disabled': disabled }">
    <view v-if="toolbarItems.length" class="je-block-editor__toolbar">
      <template v-for="item in toolbarItems" :key="item.key">
        <view v-if="item.divider" class="je-block-editor__divider" />
        <view
          v-else
          role="button"
          class="je-block-editor__btn"
          :class="{ 'is-active': item.active, 'je-block-editor__btn--text': item.text }"
          :aria-label="item.title"
          :aria-disabled="item.disabled || undefined"
          @click="!item.disabled && item.run()"
        >
          <text v-if="item.text">{{ item.text }}</text>
          <template v-else-if="item.icon">
            <JeIcon :name="item.icon" :size="16" />
            <text class="je-block-editor__btn-label">{{ item.title }}</text>
          </template>
        </view>
      </template>
    </view>

    <view class="je-block-editor__list" :class="{ 'is-dragging': dragIndex >= 0 }">
      <view
        v-for="(block, index) in localBlocks"
        :key="block.id"
        class="je-block-editor__item"
        :class="{
          'is-selected': selectedId === block.id,
          'is-dragging': dragIndex === index,
          'is-drop-before': dropIndex === index,
          'is-drop-after': dropIndex === localBlocks.length && index === localBlocks.length - 1,
        }"
        @click="selectBlock(block.id)"
      >
        <!-- 头部图标只在选中时才出现，未选中时整块就是一份纯预览 -->
        <view v-if="selectedId === block.id" class="je-block-editor__head">
          <slot name="block-head" :block="block" :index="index" :edit="() => openEditor(block.id)">
            <view
              v-if="actionItems[index]?.handle"
              role="button"
              class="je-block-editor__handle"
              :class="{ 'is-disabled': disabled }"
              :aria-label="actionItems[index]?.handle?.title"
              @click.stop
              @touchstart.stop="startDrag(index)"
              @touchmove.stop.prevent="onDragMove($event)"
              @touchend="stopDrag()"
              @touchcancel="stopDrag()"
            >
              <JeIcon name="drag" :size="14" />
            </view>
            <text class="je-block-editor__type">{{ t(`block.${block.type}`) }}</text>

            <view class="je-block-editor__gap" />

            <template v-for="item in actionItems[index]?.items ?? []" :key="item.key">
              <view v-if="item.divider" class="je-block-editor__divider" />
              <view
                v-else
                role="button"
                class="je-block-editor__action"
                :class="{ 'je-block-editor__action--danger': item.builtin === 'remove' }"
                :aria-label="item.title"
                :aria-disabled="item.disabled || undefined"
                @click.stop="!item.disabled && item.run()"
              >
                <text v-if="item.text">{{ item.text }}</text>
                <JeIcon v-else-if="item.icon" :name="item.icon" :size="15" />
              </view>
            </template>
          </slot>
        </view>

        <!-- 文本块：一段文本就是一个块 -->
        <text
          v-if="block.type === 'text'"
          class="je-block-editor__text"
          :class="{ 'is-empty': !block.text }"
        >
          {{ block.text || textPlaceholder }}
        </text>

        <template v-else>
          <image
            v-if="block.type === 'image' && block.url"
            class="je-block-editor__media"
            :style="mediaStyle(block)"
            :src="block.url"
            :mode="imageMode(block)"
          />
          <video
            v-else-if="block.type === 'video' && block.url && playingId === block.id"
            class="je-block-editor__media"
            :style="mediaStyle(block)"
            :src="block.url"
            :poster="block.poster || undefined"
            :object-fit="videoFit(block)"
            :autoplay="true"
            controls
            playsinline
          />
          <!-- 没点播放键之前只放封面，播放器根本不挂载，视频文件一个字节都不拉 -->
          <view
            v-else-if="block.type === 'video' && block.url"
            class="je-block-editor__poster"
            :style="mediaStyle(block)"
          >
            <image
              v-if="block.poster"
              class="je-block-editor__cover"
              :src="block.poster"
              mode="aspectFill"
            />
            <view
              class="je-block-editor__play"
              role="button"
              :aria-label="t('block.play')"
              @click.stop="playVideo(block.id)"
            >
              <JeIcon name="play" :size="18" />
            </view>
          </view>
          <text v-else-if="block.type === 'link' && block.url" class="je-block-editor__link">
            {{ block.title || block.url }}
          </text>
          <!-- 还没填地址时的占位，提示点编辑去补 -->
          <text v-else class="je-block-editor__placeholder">{{ urlPlaceholder(block.type) }}</text>

          <text
            v-if="block.type !== 'link' && block.url"
            class="je-block-editor__summary"
          >
            {{ sizeSummary(block) }}
          </text>
        </template>
      </view>

      <text v-if="!localBlocks.length" class="je-block-editor__empty">{{ t('block.empty') }}</text>
    </view>

    <slot name="footer" />

    <!-- 编辑窗口：改完点确定才写回列表 -->
    <JeDialog v-model="dialogVisible" :title="dialogTitle" :width="440" @closed="onDialogClosed">
      <view v-if="draft" class="je-block-editor__form">
        <view v-if="form.type === 'text'" class="je-block-editor__row">
          <text class="je-block-editor__label">{{ t('block.content') }}</text>
          <textarea
            class="je-block-editor__textarea"
            :value="form.text"
            :placeholder="textPlaceholder"
            @input="onDraftInput('text', $event)"
          />
        </view>

        <template v-else>
          <view class="je-block-editor__row">
            <text class="je-block-editor__label">{{ t('block.url') }}</text>
            <view class="je-block-editor__inline">
              <input
                class="je-block-editor__input"
                :value="form.url"
                :placeholder="urlPlaceholder(form.type)"
                @input="onDraftInput('url', $event)"
              />
              <JeButton
                v-if="upload && form.type !== 'link'"
                variant="ghost"
                :loading="uploading"
                @click="pickFile(form.type)"
              >
                {{ form.type === 'image' ? t('block.pickImage') : t('block.pickVideo') }}
              </JeButton>
            </view>
          </view>

          <view v-if="form.type === 'image'" class="je-block-editor__row">
            <text class="je-block-editor__label">{{ t('block.alt') }}</text>
            <input
              class="je-block-editor__input"
              :value="form.alt"
              :placeholder="t('block.altPlaceholder')"
              @input="onDraftInput('alt', $event)"
            />
          </view>

          <view v-else-if="form.type === 'video'" class="je-block-editor__row">
            <text class="je-block-editor__label">{{ t('block.poster') }}</text>
            <input
              class="je-block-editor__input"
              :value="form.poster"
              :placeholder="t('block.posterPlaceholder')"
              @input="onDraftInput('poster', $event)"
            />
          </view>

          <view v-else class="je-block-editor__row">
            <text class="je-block-editor__label">{{ t('block.linkTitle') }}</text>
            <input
              class="je-block-editor__input"
              :value="form.title"
              :placeholder="t('block.linkTitlePlaceholder')"
              @input="onDraftInput('title', $event)"
            />
          </view>

          <!-- 宽高与缩放只对图片 / 视频有意义 -->
          <template v-if="form.type !== 'link'">
            <view class="je-block-editor__row">
              <text class="je-block-editor__label">{{ t('block.width') }}</text>
              <view class="je-block-editor__chips">
                <view
                  v-for="preset in WIDTH_PRESETS"
                  :key="preset"
                  role="button"
                  class="je-block-editor__chip"
                  :class="{ 'is-active': form.width === preset }"
                  @click="setWidthPreset(preset)"
                >
                  <text>{{ preset }}</text>
                </view>
                <view class="je-block-editor__length">
                  <input
                    class="je-block-editor__input je-block-editor__input--number"
                    type="digit"
                    :value="widthNumber"
                    :placeholder="t('block.custom')"
                    @input="onWidthNumber($event)"
                  />
                  <view
                    v-for="unit in UNIT_OPTIONS"
                    :key="unit"
                    role="button"
                    class="je-block-editor__chip je-block-editor__chip--unit"
                    :class="{ 'is-active': widthUnit === unit }"
                    @click="onWidthUnit(unit)"
                  >
                    <text>{{ unit }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="je-block-editor__row">
              <text class="je-block-editor__label">{{ t('block.height') }}</text>
              <view class="je-block-editor__chips">
                <view class="je-block-editor__length">
                  <input
                    class="je-block-editor__input je-block-editor__input--number"
                    type="digit"
                    :value="heightNumber"
                    :placeholder="t('block.heightAuto')"
                    @input="onHeightNumber($event)"
                  />
                  <view
                    v-for="unit in UNIT_OPTIONS"
                    :key="unit"
                    role="button"
                    class="je-block-editor__chip je-block-editor__chip--unit"
                    :class="{ 'is-active': heightUnit === unit }"
                    @click="onHeightUnit(unit)"
                  >
                    <text>{{ unit }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="je-block-editor__row">
              <text class="je-block-editor__label">{{ t('block.fit') }}</text>
              <view class="je-block-editor__chips">
                <view
                  v-for="option in FIT_OPTIONS"
                  :key="option"
                  role="button"
                  class="je-block-editor__chip"
                  :class="{ 'is-active': form.fit === option }"
                  @click="form.fit = option"
                >
                  <text>{{ fitLabel(option) }}</text>
                </view>
              </view>
            </view>
          </template>
        </template>
      </view>

      <template #footer>
        <JeButton variant="ghost" @click="closeEditor">{{ t('cancel') }}</JeButton>
        <JeButton @click="applyDraft()">{{ t('confirm') }}</JeButton>
      </template>
    </JeDialog>
  </view>
</template>

<style scoped>
.je-block-editor {
  /*
   * 本地控件变量：uni 版只有触屏一个形态，高度一律取 --je-touch-* 档
   * （与 je-input 的 --ji-h / je-button 的 --jb-h 同一口径）。
   * 注意别写成主库的 --je-control-*：uni 的主题里没有那一组，值会整条失效。
   */
  --jbe-h: var(--je-touch-h-sm);
  --jbe-px: 12px;
  --jbe-px-sm: 10px;
  --jbe-fs: 14px;
  --jbe-fs-sm: 13px;
  display: block;
  font-size: var(--jbe-fs);
  color: var(--je-text);
}

/* ---------------- 顶部操作栏 ---------------- */

.je-block-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-bottom: 12px;
}

.je-block-editor__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  height: var(--jbe-h);
  padding: 0 var(--jbe-px);
  font-size: var(--jbe-fs);
  color: var(--je-text-muted);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-block-editor__btn:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-block-editor__btn.is-active {
  color: var(--je-primary);
  border-color: var(--je-primary);
}

.je-block-editor__btn:active {
  opacity: 0.7;
}

.je-block-editor__divider {
  width: 1px;
  height: 16px;
  background: var(--je-border-color);
}

/* ---------------- 块列表 ---------------- */

.je-block-editor__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.je-block-editor__item {
  position: relative;
  /* 每块都占满一行 */
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px 12px;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  transition: border-color var(--je-duration), opacity var(--je-duration);
}

/* 选中效果：主色边框（小程序端不支持 box-shadow 的外发光写法，靠边框 + 底色区分） */
.je-block-editor__item.is-selected {
  border-color: var(--je-primary);
  background: color-mix(in srgb, var(--je-primary) 6%, var(--je-surface));
}

.je-block-editor__item.is-dragging {
  opacity: 0.55;
}

/* 插入位置指示线：越过中线插到前一块的下面、后一块的上面 */
.je-block-editor__item.is-drop-before::before,
.je-block-editor__item.is-drop-after::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--je-primary);
  border-radius: 1px;
}

.je-block-editor__item.is-drop-before::before {
  top: -7px;
}

.je-block-editor__item.is-drop-after::after {
  bottom: -7px;
}

/* ---------------- 块头部（只在选中时渲染） ---------------- */

.je-block-editor__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--je-text-faint);
}

.je-block-editor__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 30px;
  height: 30px;
  /* 拖动把手要吃掉手势，不能让页面跟着滚 */
  touch-action: none;
}

.je-block-editor__handle.is-disabled {
  opacity: 0.4;
}

.je-block-editor__type {
  font-size: var(--jbe-fs-sm);
  color: var(--je-text-faint);
}

.je-block-editor__gap {
  flex: 1;
}

.je-block-editor__action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  font-size: var(--jbe-fs-sm);
  color: var(--je-text-faint);
  border-radius: 8px;
}

.je-block-editor__action:active {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-block-editor__action--danger:active {
  color: var(--je-danger);
}

/* ---------------- 块内容预览 ---------------- */

.je-block-editor__text {
  display: block;
  font-size: var(--jbe-fs);
  line-height: 1.7;
  color: var(--je-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.je-block-editor__text.is-empty {
  color: var(--je-text-faint);
}

.je-block-editor__media {
  display: block;
  width: 100%;
  max-height: 320px;
  background: var(--je-surface-hover);
  border-radius: var(--je-radius-sm);
}

/* 视频的封面态：没点播放之前只显示它 */
.je-block-editor__poster {
  position: relative;
  width: 100%;
  min-height: 180px;
  max-height: 320px;
  overflow: hidden;
  background: var(--je-surface-hover);
  border-radius: var(--je-radius-sm);
}

.je-block-editor__cover {
  display: block;
  width: 100%;
  height: 100%;
}

.je-block-editor__play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.je-block-editor__link {
  display: block;
  overflow: hidden;
  font-size: var(--jbe-fs);
  color: var(--je-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-block-editor__placeholder {
  display: block;
  box-sizing: border-box;
  padding: 18px 12px;
  font-size: var(--jbe-fs-sm);
  color: var(--je-text-faint);
  text-align: center;
  border: 1px dashed var(--je-border-color);
  border-radius: var(--je-radius-sm);
}

.je-block-editor__summary {
  display: block;
  margin-top: 8px;
  font-size: var(--jbe-fs-sm);
  color: var(--je-text-faint);
}

.je-block-editor__empty {
  display: block;
  box-sizing: border-box;
  padding: 20px;
  font-size: var(--jbe-fs-sm);
  color: var(--je-text-faint);
  text-align: center;
  background: var(--je-surface);
  border: 1px dashed var(--je-border-color);
  border-radius: var(--je-radius);
}

/* ---------------- 编辑窗口 ---------------- */

.je-block-editor__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.je-block-editor__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.je-block-editor__label {
  font-size: var(--jbe-fs-sm);
  color: var(--je-text-muted);
}

.je-block-editor__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.je-block-editor__input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: var(--jbe-h);
  padding: 0 var(--jbe-px-sm);
  font-size: var(--jbe-fs-sm);
  color: var(--je-text);
  /* 输入框落在同样是不透明底色的弹窗面板上，底色要跟 je-input 一样走 surface，
     否则和面板同色，看上去就像没有样式的裸框 */
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

/* 只有和按钮同排（地址那一行）时才让它吃掉剩余宽度：
   __row 是 column flex，直接放在行里的输入框会被当成主轴上的弹性项，高度被拉得莫名其妙 */
.je-block-editor__inline .je-block-editor__input {
  flex: 1;
  width: auto;
}

.je-block-editor__input--number {
  width: 72px;
}

.je-block-editor__textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px var(--jbe-px-sm);
  font-size: var(--jbe-fs);
  line-height: 1.7;
  color: var(--je-text);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-block-editor__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.je-block-editor__length {
  display: flex;
  align-items: center;
  gap: 6px;
}

.je-block-editor__chip {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--jbe-h);
  padding: 0 var(--jbe-px-sm);
  font-size: var(--jbe-fs-sm);
  color: var(--je-text-muted);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-block-editor__chip:active {
  background: var(--je-surface-hover);
}

.je-block-editor__chip.is-active {
  color: var(--je-primary);
  border-color: var(--je-primary);
}

.je-block-editor__chip--unit {
  min-width: 32px;
  padding: 0 6px;
}
</style>
