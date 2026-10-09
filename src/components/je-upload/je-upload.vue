<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 照片墙形态的根节点自己是 flex 容器，也常被放进表单行 / 栅格里当 flex 子项。
   * 小程序自定义组件默认多包一层宿主节点，flex 子项会变成宿主，根节点的 flex-wrap
   * 与 gap 都落不到实处，这里用虚拟宿主把这层去掉。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import JeImagePreview from '../je-image-preview/je-image-preview.vue'
import type {
  JeUploadBeforeRemove,
  JeUploadBeforeUpload,
  JeUploadData,
  JeUploadFile,
  JeUploadFormData,
  JeUploadListType,
  JeUploadOnChange,
  JeUploadOnError,
  JeUploadOnExceed,
  JeUploadOnPreview,
  JeUploadOnProgress,
  JeUploadOnRemove,
  JeUploadOnSuccess,
  JeUploadPickedFile,
  JeUploadProgressEvent,
  JeUploadRaw,
  JeUploadRequestHandler,
  JeUploadRequestOptions,
  JeUploadStatus,
} from './types'

defineOptions({ name: 'JeUpload' })

const props = withDefaults(
  defineProps<{
    /** 文件列表，配合 v-model:file-list 使用；未绑定时组件内部自己维护 */
    fileList?: JeUploadFile[]
    /** 原生 accept，例如 image 通配或 .pdf；留空表示不限类型 */
    accept?: string
    /** 是否允许一次选择多个文件 */
    multiple?: boolean
    /** 开启拖拽上传区域（拖拽仅 H5 有语义，小程序端退化为点击选择） */
    drag?: boolean
    /** 最多允许的文件数量 */
    limit?: number
    /** 是否禁用选择与删除 */
    disabled?: boolean
    /** 列表展现形式：text 文本 / picture 图文 / picture-card 照片墙 */
    listType?: JeUploadListType
    /** 仅做前端状态模拟，不会发起真实请求 */
    autoUpload?: boolean
    /** 列表下方的提示文案，等价于 tip 插槽的默认内容 */
    tip?: string
    /** 上传地址；默认实现 H5 走 XMLHttpRequest、小程序端走 uni.uploadFile */
    action?: string
    /** 请求方法（小程序端 uni.uploadFile 恒为 POST，不透传） */
    method?: string
    /** 上传文件的字段名，对应 multipart 里的 name */
    name?: string
    /** 请求头 */
    headers?: Record<string, string>
    /** 是否携带 Cookie（仅 H5，跨域下还要服务端配合 Access-Control-Allow-Credentials） */
    withCredentials?: boolean
    /** 附加表单字段：静态对象、Promise，或按文件动态计算的函数 */
    data?: JeUploadFormData
    /** 接替默认实现；传了它 action / method 等参数只作为入参透传，不再由组件发起请求 */
    httpRequest?: JeUploadRequestHandler
    /** 选用文件前的钩子：返回 false 或 reject 会中止该文件，返回选中文件则替换原文件 */
    beforeUpload?: JeUploadBeforeUpload
    /** 移除前的钩子：返回 false 或 reject 会阻止移除 */
    beforeRemove?: JeUploadBeforeRemove
    /** 是否展示文件列表 */
    showFileList?: boolean
    /** 点击文件时内置全屏预览；关闭后仍会抛出 preview 事件，交由使用方自行处理 */
    showPreview?: boolean
    /** 追加到列表上的类名，便于外部微调样式 */
    listClass?: string
    /** 改变文件（新增 / 成功 / 失败）时调用，与 change 事件同源 */
    onChange?: JeUploadOnChange
    /** 移除文件后调用，与 remove 事件同源 */
    onRemove?: JeUploadOnRemove
    /** 点击文件时调用，与 preview 事件同源 */
    onPreview?: JeUploadOnPreview
    /** 上传进度变化时调用，与 progress 事件同源 */
    onProgress?: JeUploadOnProgress
    /** 上传成功时调用，与 success 事件同源 */
    onSuccess?: JeUploadOnSuccess
    /** 上传失败时调用，与 error 事件同源 */
    onError?: JeUploadOnError
    /** 超出 limit 时调用，与 exceed 事件同源 */
    onExceed?: JeUploadOnExceed
  }>(),
  {
    fileList: () => [],
    accept: '',
    multiple: false,
    drag: false,
    disabled: false,
    listType: 'text',
    autoUpload: false,
    tip: '',
    action: '#',
    method: 'post',
    name: 'file',
    headers: undefined,
    withCredentials: false,
    data: undefined,
    httpRequest: undefined,
    beforeUpload: undefined,
    beforeRemove: undefined,
    showFileList: true,
    showPreview: false,
    listClass: '',
  },
)

const emit = defineEmits<{
  /** v-model:file-list 的更新，列表变化时触发 */
  'update:fileList': [files: JeUploadFile[]]
  /** 选中文件、上传成功、上传失败或移除后触发 */
  change: [file: JeUploadFile, files: JeUploadFile[]]
  /** 移除文件后触发 */
  remove: [file: JeUploadFile]
  /** 选择数量超过 limit 时触发，参数是本次被忽略的原始文件 */
  exceed: [files: JeUploadPickedFile[]]
  /** 点击文件名或缩略图时触发 */
  preview: [file: JeUploadFile]
  /** 上传进度变化（真实请求与模拟上传都会触发） */
  progress: [event: JeUploadProgressEvent, file: JeUploadFile]
  /** 上传成功，第二个参数是服务端响应 */
  success: [response: unknown, file: JeUploadFile]
  /** 上传失败 */
  error: [error: Error, file: JeUploadFile]
}>()

const files = ref<JeUploadFile[]>([])
const dragging = ref(false)

/** 本组件用 createObjectURL 生成的 blob 地址（仅 H5），移除 / 卸载时要逐个回收 */
const objectUrls = new Set<string>()
/** 模拟上传的定时器，卸载时统一清掉 */
const timers = new Set<ReturnType<typeof setTimeout>>()
/** 进行中的假进度动画；真请求只用原生 / UploadTask 的进度事件 */
const progressTimers = new Map<string, ReturnType<typeof setInterval>>()
/**
 * 每个「还没结束」的上传对应一个取消函数。
 * key 用 `文件对象 -> 一次性 id` 的 WeakMap：fileList 可能是外部传入的新对象数组，
 * 用引用本身当 key 比用下标更稳（列表重排、外部替换都不会串号）。
 */
const uploadIds = new WeakMap<object, string>()
const aborters = new Map<string, () => void>()
let uploadSeed = 0

/** 转成响应式代理，item 内部字段（status / percentage）变化才能驱动视图 */
const makeFile = (input: Partial<JeUploadFile> & { name: string }): JeUploadFile =>
  reactive({
    status: 'ready',
    ...input,
  }) as JeUploadFile

/** 外部 v-model 进来的初始值要过一遍 makeFile，否则外部对象的字段改动不是响应式的 */
files.value = props.fileList.map((file) => makeFile(file))

/** 自写体积格式化：1024 进制，最多保留一位小数 */
const formatSize = (size?: number) => {
  if (size === undefined || size <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unit]}`
}

const releaseUrl = (file: JeUploadFile) => {
  // #ifdef H5
  if (file.url && objectUrls.has(file.url)) {
    URL.revokeObjectURL(file.url)
    objectUrls.delete(file.url)
  }
  // #endif
}

/**
 * 同步给 v-model。只有调用方真的绑了 file-list 才 emit：
 * 否则回写一个未声明的 prop 既无意义，又会让「受控 / 非受控」两种用法互相打架。
 */
const sync = () => {
  if (props.fileList !== undefined) emit('update:fileList', [...files.value])
}

/** 事件里的文件数组统一给一份浅拷贝，避免使用方直接 push 进来绕过组件逻辑 */
const snapshot = () => [...files.value]

/** 每个文件一个一次性 id，用来定位它的取消函数 */
const idOf = (file: JeUploadFile) => {
  let id = uploadIds.get(file)
  if (!id) {
    uploadSeed += 1
    id = `je-upload-${uploadSeed}`
    uploadIds.set(file, id)
  }
  return id
}

/** 两端通用的进度事件构造：小程序端没有 ProgressEvent，所以不走构造函数 */
const makeProgressEvent = (percent: number, loaded = 0, total = 0): JeUploadProgressEvent => ({
  percent,
  loaded,
  total,
  lengthComputable: total > 0,
})

const reportProgress = (file: JeUploadFile, percent: number, loaded = 0, total = 0) => {
  // 文件可能在上传途中被移除，或者外部把 status 改成了别的值
  if (file.status !== 'uploading' || !files.value.includes(file)) return
  const clamped = Math.round(Math.max(0, Math.min(100, percent)) * 10) / 10
  file.percentage = clamped
  const event = makeProgressEvent(clamped, loaded, total)
  emit('progress', event, file)
  props.onProgress?.(event, file, snapshot())
}

/**
 * 假进度：本地 blob: / data: 这类地址不会触发原生 progress，
 * 而演示和 mock 上传又恰恰走这条路径，所以补一条缓出曲线让进度条动起来。
 * 小程序端没有 requestAnimationFrame，统一改用定时器驱动。
 */
const startFakeProgress = (file: JeUploadFile) => {
  const id = idOf(file)
  const duration = 1200
  const start = Date.now()
  const timer = setInterval(() => {
    if (file.status !== 'uploading' || !files.value.includes(file)) {
      stopFakeProgress(file)
      return
    }
    const ratio = Math.min(1, (Date.now() - start) / duration)
    // 平方缓出：起步快、收尾慢，视觉上更像真实上传
    reportProgress(file, (1 - (1 - ratio) ** 2) * 100)
    if (ratio >= 1) stopFakeProgress(file)
  }, 80)
  progressTimers.set(id, timer)
}

const stopFakeProgress = (file: JeUploadFile) => {
  const id = uploadIds.get(file)
  if (!id) return
  const timer = progressTimers.get(id)
  if (timer !== undefined) {
    clearInterval(timer)
    progressTimers.delete(id)
  }
}

/** data 支持三种写法：对象 / Promise / 按文件计算的函数，这里统一取一次 */
const resolveData = async (file: JeUploadFile): Promise<JeUploadData> => {
  const source = props.data
  if (source === undefined) return {}
  if (typeof source === 'function') return (await source(file)) ?? {}
  return (await source) ?? {}
}

const resolveHeaders = async (): Promise<Record<string, string>> => props.headers ?? {}

// #ifdef H5
/** Blob 需要带文件名才不丢后缀，元组写法在这里展开 */
const toFormValue = (value: string | Blob | [string | Blob, string] | string[]) => {
  if (Array.isArray(value)) {
    const [raw, filename] = value
    if (raw instanceof Blob) return new File([raw], filename ?? 'blob')
    return String(raw)
  }
  return value
}

/** H5 默认上传实现：直接发 XMLHttpRequest，同步返回 xhr 本身，组件据此支持 abort */
const xhrUpload = (options: JeUploadRequestOptions) => {
  const { action, method, name, file, filename, headers, withCredentials, data } = options

  const xhr = new XMLHttpRequest()
  xhr.open(method, action, true)
  xhr.withCredentials = withCredentials
  Object.entries(headers).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value)
  })

  xhr.onload = () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      options.onError(new Error(`上传失败，HTTP ${xhr.status}`))
      return
    }
    // 先按 JSON 解析，失败就原样给出文本，避免服务端返回纯文本时使用方拿不到东西
    let payload: unknown = xhr.responseText
    try {
      payload = JSON.parse(xhr.responseText)
    } catch {
      /* 不是 JSON，保持文本 */
    }
    options.onSuccess(payload)
  }
  xhr.onerror = () => options.onError(new Error('上传失败，网络异常'))
  xhr.ontimeout = () => options.onError(new Error('上传失败，请求超时'))

  xhr.upload.onprogress = (event) => {
    // 原生 progress 在 lengthComputable 为 false 时算不出百分比，交给假进度兜底
    if (!event.lengthComputable || event.total <= 0) return
    options.onProgress(makeProgressEvent((event.loaded / event.total) * 100, event.loaded, event.total))
  }

  const body = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    body.append(key, toFormValue(value))
  })
  if (file) body.append(name, file, filename)
  xhr.send(body)

  return xhr
}
// #endif

// #ifndef H5
/** 小程序端 formData 只吃普通键值，Blob / 元组统一拍平成字符串 */
const toPlainData = (data: JeUploadData): Record<string, string> => {
  const plain: Record<string, string> = {}
  Object.entries(data).forEach(([key, value]) => {
    plain[key] = Array.isArray(value) ? String(value[0]) : String(value)
  })
  return plain
}

/** 小程序端默认上传实现：走 uni.uploadFile，返回 UploadTask 供 abort */
const uniUpload = (options: JeUploadRequestOptions) => {
  const { action, name, filePath, headers, data } = options
  const task = uni.uploadFile({
    url: action,
    filePath,
    name,
    header: headers,
    formData: toPlainData(data),
    success: (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        options.onError(new Error(`上传失败，HTTP ${res.statusCode}`))
        return
      }
      let payload: unknown = res.data
      try {
        payload = JSON.parse(res.data)
      } catch {
        /* 不是 JSON，保持文本 */
      }
      options.onSuccess(payload)
    },
    fail: (error) => {
      options.onError(new Error(error.errMsg ? `上传失败，${error.errMsg}` : '上传失败，网络异常'))
    },
  })
  task.onProgressUpdate((res) => {
    options.onProgress(
      makeProgressEvent(res.progress, res.totalBytesSent, res.totalBytesExpectedToSend),
    )
  })
  return task
}
// #endif

/**
 * 默认上传实现：两端收口到同一个入口，体内按平台分派。
 * 主库只有 XHR 一条线；小程序端没有 XHR，改走 uni.uploadFile（返回 UploadTask）。
 */
const uploadRequest: JeUploadRequestHandler = (options) => {
  // #ifdef H5
  return xhrUpload(options)
  // #endif
  // #ifndef H5
  return uniUpload(options)
  // #endif
}

/** 原始句柄里挑出「浏览器 File」这一档给 httpRequest；小程序端的路径恒为 string，这里给 null */
const toRequestFile = (raw: JeUploadRaw): File | null => (typeof raw === 'string' ? null : raw)

/** 真正开始一次上传：装配参数 → 交给 httpRequest → 按结果推进状态 */
const startUpload = async (file: JeUploadFile) => {
  const raw = file.raw
  if (!raw) {
    // 演示 / 回显用的条目没有原始文件，没法发请求，退化成状态模拟，行为与旧版一致
    simulateUpload(file)
    return
  }

  const id = idOf(file)
  file.status = 'uploading'
  file.percentage = 0
  startFakeProgress(file)

  let finished = false

  const finish = () => {
    finished = true
    stopFakeProgress(file)
    aborters.delete(id)
  }

  /** abort 是使用方主动取消，不算上传失败，所以状态退回 ready 而不是 fail */
  const resetToReady = () => {
    file.status = 'ready'
    file.percentage = 0
    sync()
  }

  // 请求真正发出去之前（等 headers / data 的那一小段时间）还没有句柄可 abort，
  // 但取消必须立刻生效，所以先占位，拿到句柄之后再换成真正的取消函数
  aborters.set(id, () => {
    finish()
    resetToReady()
  })

  const onProgress = (event: JeUploadProgressEvent) => {
    // 真实进度比假进度准，收到就停掉动画，避免两条线打架
    stopFakeProgress(file)
    reportProgress(file, event.percent, event.loaded, event.total)
  }

  const onSuccess = (response: unknown) => {
    if (finished) return
    finish()
    file.status = 'success'
    file.percentage = 100
    file.response = response
    sync()
    emit('success', response, file)
    props.onSuccess?.(response, file, snapshot())
    emit('change', file, snapshot())
    props.onChange?.(file, snapshot())
  }

  const onError = (error: Error) => {
    if (finished) return
    finish()
    file.status = 'fail'
    sync()
    emit('error', error, file)
    props.onError?.(error, file, snapshot())
    emit('change', file, snapshot())
    props.onChange?.(file, snapshot())
  }

  const options: JeUploadRequestOptions = {
    action: props.action,
    method: props.method,
    name: props.name,
    file: toRequestFile(raw),
    filePath: typeof raw === 'string' ? raw : '',
    filename: file.name,
    headers: await resolveHeaders(),
    data: await resolveData(file),
    withCredentials: props.withCredentials,
    onProgress,
    onSuccess,
    onError,
  }

  const handler = props.httpRequest ?? uploadRequest
  try {
    const result = await handler(options)
    // 等待期间可能已经被 abort / 移除，这时不该再挂取消函数
    if (finished) return

    const cancelable = result as { abort?: () => void } | null
    const cancel = () => {
      cancelable?.abort?.()
      finish()
      resetToReady()
    }

    // 只有能取消的请求才登记；纯 Promise 就让请求自然跑完
    if (typeof cancelable?.abort === 'function') {
      aborters.set(id, cancel)
    }
  } catch (error) {
    // onSuccess / onError 已经结束过的会被 finished 标记，这里只处理「根本没发出去」的情况
    if (!finished) onError(error instanceof Error ? error : new Error(String(error)))
  }
}

/** 纯前端模拟上传：用定时器把状态从 ready 推到 success，不发起任何网络请求 */
const simulateUpload = (file: JeUploadFile) => {
  file.status = 'uploading'
  file.percentage = 0
  startFakeProgress(file)
  const timer = setTimeout(() => {
    timers.delete(timer)
    stopFakeProgress(file)
    if (!files.value.includes(file)) return
    file.status = 'success'
    file.percentage = 100
    sync()
    emit('change', file, snapshot())
    props.onChange?.(file, snapshot())
  }, 900)
  timers.add(timer)
}

/** beforeUpload 的返回值语义：false / reject 中止，返回选中文件则替换原文件 */
const applyBeforeUpload = async (picked: JeUploadPickedFile): Promise<JeUploadPickedFile | null> => {
  const hook = props.beforeUpload
  if (!hook) return picked
  try {
    const result = await hook(picked)
    if (result === false) return null
    if (result && typeof result === 'object') return result
    return picked
  } catch {
    return null
  }
}

const handleFiles = (incoming: JeUploadPickedFile[]) => {
  if (incoming.length === 0 || props.disabled) return

  let selected = incoming
  if (props.limit !== undefined) {
    const rest = props.limit - files.value.length
    if (rest <= 0) {
      emit('exceed', incoming)
      props.onExceed?.(incoming, snapshot())
      return
    }
    if (incoming.length > rest) {
      emit('exceed', incoming)
      props.onExceed?.(incoming, snapshot())
      selected = incoming.slice(0, rest)
    }
  }

  void (async () => {
    for (const picked of selected) {
      const accepted = await applyBeforeUpload(picked)
      if (!accepted) continue
      if (props.limit !== undefined && files.value.length >= props.limit) {
        emit('exceed', [accepted])
        props.onExceed?.([accepted], snapshot())
        continue
      }

      const file = makeFile({ name: accepted.name, size: accepted.size, raw: accepted.raw })
      // #ifdef H5
      const raw = accepted.raw
      if (raw instanceof File && raw.type.startsWith('image/')) {
        const url = URL.createObjectURL(raw)
        objectUrls.add(url)
        file.url = url
      }
      // #endif
      // #ifndef H5
      // 小程序端没有 objectURL，选择时拿到的本地临时路径直接当预览地址
      if (accepted.url) file.url = accepted.url
      // #endif

      files.value = [...files.value, file]
      sync()
      emit('change', file, snapshot())
      props.onChange?.(file, snapshot())
      if (props.autoUpload) void startUpload(file)
    }
  })()
}

// #ifdef H5
/** H5 把浏览器 File 归一成统一结构；预览地址留到创建列表项时再生成 */
const toPickedFromFile = (file: File): JeUploadPickedFile => ({
  name: file.name,
  size: file.size,
  raw: file,
})
// #endif

// #ifndef H5
/** 从路径里抠出文件名，小程序端的选择 API 不一定给名字 */
const baseName = (path: string, fallback: string) => {
  const clean = path.split('?')[0] ?? path
  const segment = clean.substring(clean.lastIndexOf('/') + 1)
  return segment || fallback
}

/** 从 accept 里抠扩展名，供 chooseMessageFile 过滤（'.pdf,.docx' -> ['pdf', 'docx']） */
const acceptExtensions = () =>
  props.accept
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.startsWith('.'))
    .map((item) => item.slice(1))
    .filter(Boolean)

/** 一次可选数量：受 multiple 与 limit 约束，上限按选择 API 的常规口径收在 9 */
const pickCount = () => {
  if (!props.multiple) return 1
  const rest = props.limit === undefined ? 9 : Math.max(1, props.limit - files.value.length)
  return Math.min(rest, 9)
}

/**
 * accept 是否只收图片：小程序端据此在「图片选择」与「会话文件选择」之间分派。
 * 照片墙形态默认按图片处理；accept 为空时按不限类型处理。
 */
const imageOnly = computed(() => {
  if (props.listType === 'picture-card') return true
  const accept = props.accept.trim().toLowerCase()
  if (!accept) return false
  const tokens = accept.split(',').map((item) => item.trim()).filter(Boolean)
  return tokens.length > 0 && tokens.every((token) => token.startsWith('image/'))
})
// #endif

/**
 * 选文件统一入口：H5 动态挂一个 <input type="file">，小程序端按 accept 分派 uni 选择 API。
 * 两条分支的产物都归一成同一份 JeUploadPickedFile[]。
 */
const pickFiles = () => {
  if (props.disabled) return

  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  if (props.accept) input.accept = props.accept
  input.multiple = props.multiple
  input.onchange = () => {
    const list = Array.from(input.files ?? [])
    // 清空 value，否则连续选择同一个文件不会再触发 change
    input.value = ''
    handleFiles(list.map(toPickedFromFile))
  }
  input.click()
  // #endif

  // #ifndef H5
  if (imageOnly.value) {
    uni.chooseMedia({
      count: pickCount(),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        handleFiles(
          res.tempFiles.map((item, index) => ({
            name: baseName(item.tempFilePath, `image-${index + 1}`),
            url: item.tempFilePath,
            size: item.size,
            raw: item.tempFilePath,
          })),
        )
      },
    })
    return
  }

  const extensions = acceptExtensions()
  uni.chooseMessageFile({
    count: pickCount(),
    type: 'all',
    ...(extensions.length > 0 ? { extension: extensions } : {}),
    success: (res) => {
      handleFiles(
        res.tempFiles.map((item, index) => ({
          name: item.name || baseName(item.path, `file-${index + 1}`),
          url: item.type === 'image' ? item.path : undefined,
          size: item.size,
          raw: item.path,
        })),
      )
    },
  })
  // #endif
}

// #ifdef H5
const onDragEnter = (event: DragEvent) => {
  if (!props.drag || props.disabled) return
  event.preventDefault()
  dragging.value = true
}

const onDragOver = (event: DragEvent) => {
  if (!props.drag || props.disabled) return
  event.preventDefault()
}

const onDragLeave = (event: DragEvent) => {
  if (!props.drag || props.disabled) return
  const related = event.relatedTarget as Node | null
  if (related && (event.currentTarget as HTMLElement).contains(related)) return
  dragging.value = false
}

const onDrop = (event: DragEvent) => {
  if (!props.drag || props.disabled) return
  event.preventDefault()
  dragging.value = false
  const dropped = Array.from(event.dataTransfer?.files ?? [])
  handleFiles(dropped.map(toPickedFromFile))
}
// #endif

/** beforeRemove 允许异步，所以移除链路整体是异步的 */
const remove = async (file: JeUploadFile) => {
  if (props.disabled) return
  if (!files.value.includes(file)) return

  const hook = props.beforeRemove
  if (hook) {
    try {
      if ((await hook(file, snapshot())) === false) return
    } catch {
      return
    }
  }

  // 钩子可能是异步的，等回来时文件也许已经被移除了
  if (!files.value.includes(file)) return
  abortById(file)
  files.value = files.value.filter((item) => item !== file)
  releaseUrl(file)
  sync()
  emit('remove', file)
  props.onRemove?.(file, snapshot())
}

/** 取消指定文件进行中的上传；abort 回调里已经处理了状态与收尾 */
const abortById = (file: JeUploadFile) => {
  const id = uploadIds.get(file)
  if (!id) return
  aborters.get(id)?.()
}

/** 取消上传：不传文件则取消全部 */
const abort = (file?: JeUploadFile) => {
  if (file) {
    abortById(file)
    return
  }
  // 拷贝一份再遍历，取消过程中会改到 aborters
  for (const cancel of [...aborters.values()]) cancel()
}

/** 手动把 ready 的文件推上去；autoUpload 为 false 时配合它使用 */
const submit = () => {
  files.value.filter((file) => file.status === 'ready').forEach((file) => void startUpload(file))
}

/** 清空列表；传 status 数组时只清掉对应状态的条目 */
const clearFiles = (status?: JeUploadStatus[]) => {
  const kept: JeUploadFile[] = []
  files.value.forEach((file) => {
    if (status && !status.includes(file.status ?? 'ready')) {
      kept.push(file)
      return
    }
    abortById(file)
    releaseUrl(file)
  })
  files.value = kept
  sync()
}

/* -------------------------------- 内置图片预览 -------------------------------- */

const viewerOpen = ref(false)
const previewIndex = ref(0)

/** 只有能拿到图片地址的条目才进预览序列，避免点开一个空白面板 */
const previewable = computed(() => files.value.filter((file) => Boolean(file.url)))
const previewUrls = computed(() => previewable.value.map((file) => file.url as string))

/**
 * 预览序列可能因为「上传途中移除文件」「外部替换 fileList」而变短，
 * 这时下标会越界。缩到最后一个（空了就直接关掉）。
 */
watch(
  () => previewable.value.length,
  (total) => {
    if (total === 0) {
      closePreview()
      return
    }
    if (previewIndex.value > total - 1) previewIndex.value = total - 1
  },
)

const preview = (file: JeUploadFile) => {
  // 无论是否内置预览都抛出事件，使用方可以完全接管
  emit('preview', file)
  props.onPreview?.(file)
  if (!props.showPreview) return
  const index = previewable.value.findIndex((item) => item === file)
  if (index < 0) return
  previewIndex.value = index
  viewerOpen.value = true
}

const closePreview = () => {
  if (!viewerOpen.value) return
  viewerOpen.value = false
}

/* ---------------------------------- 生命周期 ---------------------------------- */

watch(
  () => props.fileList,
  (value) => {
    if (!value) return
    // 外部直接改列表时，回收已消失条目的对象地址，避免内存泄漏
    files.value.forEach((file) => {
      if (!value.includes(file)) releaseUrl(file)
    })
    /*
     * 已经是内部代理的条目必须原样保留：sync() 把数组 emit 出去后 v-model 会原样回传，
     * 若这里对每个条目都重新 makeFile，就会造出一批「孤儿代理」——startUpload 的闭包里
     * 持有的还是旧代理，之后写 status / percentage / response 全部落在孤儿上，
     * 视图里永远停在 uploading。只有外部塞进来的新条目才需要包一层响应式。
     */
    const known = new Set(files.value)
    files.value = value.map((file) => {
      if (known.has(file)) return file
      if (file.url) objectUrls.add(file.url)
      return makeFile(file)
    })
  },
)

onBeforeUnmount(() => {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  progressTimers.forEach((timer) => clearInterval(timer))
  progressTimers.clear()
  // 卸载时先把在途请求收掉，否则回调会打在已经销毁的组件上
  abort()
  // #ifdef H5
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
  objectUrls.clear()
  // #endif
})

defineExpose({
  /** 取消上传：不传文件则取消全部在途请求 */
  abort,
  /** 手动上传列表中待上传（ready）的文件 */
  submit,
  /** 清空文件列表：传状态数组时只清掉对应状态 */
  clearFiles,
  /** 移除单个文件，会走一遍 beforeRemove */
  handleRemove: remove,
  /** 以编程方式选中文件，等价于用户点选（入参是统一后的选中文件） */
  handleStart: handleFiles,
  /** 内部文件列表（只读快照） */
  files,
})
</script>

<template>
  <view
    class="je-upload"
    :class="[
      `je-upload--${listType}`,
      listClass,
      { 'is-disabled': disabled, 'is-dragging': dragging, 'has-drag': drag },
    ]"
  >
    <!-- 触发区域：拖拽语义只在 H5 成立，小程序端退化为点击选择 -->
    <!-- #ifdef H5 -->
    <view
      v-if="drag"
      class="je-upload__dropzone"
      role="button"
      aria-label="点击或拖拽文件到此处上传"
      @tap="pickFiles"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <JeIcon :name="listType === 'picture-card' ? 'plus' : 'upload'" :size="26" />
      <template v-if="listType !== 'picture-card'">
        <text class="je-upload__drop-text">
          将文件拖到此处，或<text class="je-upload__drop-em">点击上传</text>
        </text>
        <text class="je-upload__drop-hint">窄屏请点击选择</text>
      </template>
    </view>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <view
      v-if="drag"
      class="je-upload__dropzone"
      role="button"
      aria-label="点击选择文件上传"
      @tap="pickFiles"
    >
      <JeIcon :name="listType === 'picture-card' ? 'plus' : 'upload'" :size="26" />
      <template v-if="listType !== 'picture-card'">
        <text class="je-upload__drop-text">点击<text class="je-upload__drop-em">选择文件</text></text>
      </template>
    </view>
    <!-- #endif -->

    <button
      v-else
      type="button"
      class="je-upload__trigger"
      :disabled="disabled"
      @tap="pickFiles"
    >
      <!-- 触发按钮内容，替换默认的图标 + 文案 -->
      <slot name="trigger">
        <JeIcon
          :name="listType === 'picture-card' ? 'plus' : 'upload'"
          :size="listType === 'picture-card' ? 24 : 16"
        />
        <text v-if="listType !== 'picture-card'">点击上传</text>
      </slot>
    </button>

    <view v-if="listType !== 'picture-card'" class="je-upload__tip-holder">
      <!-- 提示区域，替换默认的 tip 文案 -->
      <slot name="tip">
        <text v-if="tip" class="je-upload__tip">{{ tip }}</text>
      </slot>
    </view>

    <view
      v-if="showFileList && files.length > 0"
      class="je-upload__list"
      :class="`je-upload__list--${listType}`"
    >
      <view
        v-for="(file, index) in files"
        :key="`${index}-${file.name}-${file.size ?? 0}`"
        class="je-upload__item"
        :class="{ 'is-uploading': file.status === 'uploading', 'is-fail': file.status === 'fail' }"
      >
        <!-- 自定义列表项内容，file 为当前文件、index 为序号 -->
        <slot name="file" :file="file" :index="index">
          <view
            class="je-upload__thumb-wrap"
            :class="{ 'is-clickable': file.url }"
            @tap.stop="file.url && preview(file)"
          >
            <image
              v-if="file.url"
              class="je-upload__thumb"
              :src="file.url"
              :alt="file.name"
              mode="aspectFill"
            />
            <JeIcon v-else name="file" :size="listType === 'picture-card' ? 28 : 18" />

            <!-- 照片墙：悬停 / 聚焦时浮现的操作遮罩（触屏常显），预览与删除都收在这里 -->
            <view v-if="listType === 'picture-card'" class="je-upload__card-actions">
              <button
                type="button"
                class="je-upload__card-action"
                :disabled="!file.url"
                aria-label="预览"
                @tap.stop="file.url && preview(file)"
              >
                <JeIcon name="zoom-in" :size="18" />
              </button>
              <button
                type="button"
                class="je-upload__card-action"
                :disabled="disabled"
                aria-label="删除"
                @tap.stop="remove(file)"
              >
                <JeIcon name="trash" :size="18" />
              </button>
            </view>
          </view>

          <view class="je-upload__info">
            <button type="button" class="je-upload__name" @tap="preview(file)">
              {{ file.name }}
            </button>
            <text v-if="formatSize(file.size)" class="je-upload__size">
              {{ formatSize(file.size) }}
            </text>
          </view>
        </slot>

        <JeIcon
          v-if="file.status === 'uploading'"
          name="loading"
          :size="16"
          spin
          class="je-upload__status is-uploading"
        />
        <JeIcon
          v-else-if="file.status === 'success'"
          name="success"
          :size="16"
          class="je-upload__status is-success"
        />
        <JeIcon
          v-else-if="file.status === 'fail'"
          name="error"
          :size="16"
          class="je-upload__status is-fail"
        />

        <button
          type="button"
          class="je-upload__remove"
          :disabled="disabled"
          :aria-label="`删除 ${file.name}`"
          @tap="remove(file)"
        >
          <JeIcon name="close" :size="14" />
        </button>

        <view
          v-if="file.status === 'uploading' || file.status === 'success'"
          class="je-upload__progress"
          role="progressbar"
          :aria-valuenow="Math.round(file.percentage ?? 0)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <view
            class="je-upload__progress-bar"
            :class="{ 'is-done': file.status === 'success' }"
            :style="{ width: `${file.percentage ?? 0}%` }"
          />
        </view>
      </view>
    </view>

    <view v-if="listType === 'picture-card' && (tip || $slots.tip)" class="je-upload__tip-holder">
      <!-- 提示区域，替换默认的 tip 文案 -->
      <slot name="tip">
        <text class="je-upload__tip">{{ tip }}</text>
      </slot>
    </view>

    <view v-if="$slots.default" class="je-upload__extra">
      <!-- 默认插槽（与触发按钮互斥）：需要完全自定义上传入口时整个交出去 -->
      <slot />
    </view>

    <!-- 内置图片预览：复用 JeImagePreview（就地铺满视口，小程序端没有 Teleport） -->
    <JeImagePreview
      v-if="showPreview"
      v-model="viewerOpen"
      :images="previewUrls"
      :start-position="previewIndex"
      @change="previewIndex = $event"
    />
  </view>
</template>

<style scoped>
.je-upload {
  font-family: inherit;
  font-size: 14px;
}

.je-upload__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 26px 16px;
  color: var(--je-text-muted);
  background: var(--je-surface);
  border: 2px dashed var(--je-border-color);
  border-radius: var(--je-radius);
  cursor: pointer;
  outline: none;
  transition: border-color var(--je-duration) ease, background var(--je-duration) ease,
    box-shadow var(--je-duration) ease;
}

.je-upload__dropzone:hover {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-upload__dropzone:focus-visible {
  border-color: var(--je-primary);
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 拖拽进入时高亮整个区域 */
.je-upload.is-dragging .je-upload__dropzone {
  color: var(--je-text);
  background: color-mix(in srgb, var(--je-primary) 20%, transparent);
  border-color: var(--je-primary);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--je-primary) 32%, transparent);
}

.je-upload__drop-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.je-upload__drop-em {
  color: color-mix(in srgb, var(--je-primary) 65%, white);
  font-style: normal;
  font-weight: 600;
}

.je-upload__drop-hint {
  margin: 0;
  font-size: 12px;
  color: var(--je-text-faint);
}

.je-upload__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  /* 两端原生 button 都自带左右 auto 外边距，会顶掉父级的对齐，显式清零 */
  margin: 0;
  padding: 12px 18px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--je-text);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease, box-shadow var(--je-duration) ease;
}

/* 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边 */
.je-upload__trigger::after,
.je-upload__remove::after,
.je-upload__name::after,
.je-upload__card-action::after {
  border: none;
}

.je-upload__trigger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--je-primary) 24%, transparent);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--je-primary) 26%, transparent);
}

.je-upload__trigger:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* tip 容器常驻，保证插槽位次稳定；没有内容时不占高度 */
.je-upload__tip-holder {
  margin: 0;
}

.je-upload__tip-holder:not(:empty) {
  margin-top: 10px;
}

.je-upload__tip {
  font-size: 12px;
  color: var(--je-text-faint);
}

/* 默认插槽的内容块：与触发区 / 列表之间留出统一的间距 */
.je-upload__extra {
  margin-top: 14px;
}

.je-upload__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
}

.je-upload__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-upload__thumb-wrap {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  overflow: hidden;
  color: var(--je-text-muted);
  background: var(--je-surface-hover);
  border: var(--je-border);
  border-radius: var(--je-radius-sm);
}

.je-upload__thumb-wrap.is-clickable {
  cursor: zoom-in;
}

.je-upload__thumb {
  display: block;
  width: 100%;
  height: 100%;
}

.je-upload__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.je-upload__name {
  overflow: hidden;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: 14px;
  color: var(--je-text);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: none;
  border: none;
  cursor: pointer;
}

.je-upload__name:hover {
  color: color-mix(in srgb, var(--je-primary) 65%, white);
}

.je-upload__size {
  font-size: 12px;
  color: var(--je-text-faint);
}

.je-upload__status {
  flex-shrink: 0;
}

.je-upload__status.is-success {
  color: var(--je-success);
}

.je-upload__status.is-fail {
  color: var(--je-danger);
}

.je-upload__status.is-uploading {
  color: color-mix(in srgb, var(--je-primary) 70%, white);
}

.je-upload__remove {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0;
  color: var(--je-text-muted);
  background: none;
  border: none;
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

.je-upload__remove:hover:not(:disabled) {
  color: var(--je-danger);
  background: var(--je-surface-hover);
}

.je-upload__remove:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

/* 进度条贴在条目底边，绝对定位所以不参与 flex 排版 */
.je-upload__progress {
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 2px;
  overflow: hidden;
  background: color-mix(in srgb, var(--je-primary) 18%, transparent);
  border-radius: 999px;
}

.je-upload__progress-bar {
  display: block;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--je-primary),
    color-mix(in srgb, var(--je-primary-end) 85%, white)
  );
  border-radius: inherit;
  transition: width 0.2s linear;
}

.je-upload__progress-bar.is-done {
  background: var(--je-success);
}

.je-upload.is-disabled .je-upload__dropzone,
.je-upload.is-disabled .je-upload__trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

/* ---------------- picture：图文列表 ---------------- */

.je-upload__list--picture .je-upload__item {
  padding: 6px 10px;
}

/* ---------------- picture-card：照片墙 ---------------- */

/* 照片墙整体是一个 wrap 容器：触发入口与图片队列在同一行内流动 */
.je-upload--picture-card {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
}

/* 列表不生成盒子，卡片直接参与根容器的 wrap —— 触发入口才能排在图片队列之后 */
.je-upload__list--picture-card {
  display: contents;
}

/* 方形卡片：图片铺满整格，文件名 / 体积不再占卡片下方的高度（对齐 element-plus） */
.je-upload__list--picture-card .je-upload__item {
  box-sizing: border-box;
  width: 148px;
  height: 148px;
  padding: 0;
  overflow: hidden;
}

.je-upload__list--picture-card .je-upload__thumb-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
}

.je-upload__list--picture-card .je-upload__info {
  display: none;
}

/* 操作遮罩：默认透明且不拦截点击，悬停 / 聚焦（触屏）时才浮现 */
.je-upload__card-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.je-upload__list--picture-card .je-upload__item:hover .je-upload__card-actions,
.je-upload__list--picture-card .je-upload__item:focus-within .je-upload__card-actions {
  pointer-events: auto;
  opacity: 1;
}

.je-upload__card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  /* 压在缩略图上的半透明黑底，图标固定浅色 */
  color: var(--je-text-on-color);
  background: rgba(0, 0, 0, 0.55);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  outline: none;
  transition: background 0.2s ease;
}

.je-upload__card-action:hover:not(:disabled) {
  background: color-mix(in srgb, var(--je-primary) 75%, transparent);
}

.je-upload__card-action:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-upload__card-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 状态角标压在右上角常显（删除已收进遮罩，不再和它抢位置）；底色用面板色垫一下保证可见 */
.je-upload__list--picture-card .je-upload__status {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: color-mix(in srgb, var(--je-popup) 92%, transparent);
  border-radius: 50%;
}

/* 条目上的常驻删除按钮在照片墙里不再渲染，删除走遮罩里的操作按钮 */
.je-upload__list--picture-card .je-upload__remove {
  display: none;
}

/* 进度条贴卡片底边铺满 */
.je-upload__list--picture-card .je-upload__progress {
  right: 0;
  left: 0;
}

/* 方形触发热区，和照片墙卡片同尺寸；内部只放一个加号图标、横竖居中，并排在图片队列之后 */
.je-upload--picture-card .je-upload__dropzone,
.je-upload--picture-card .je-upload__trigger {
  order: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 148px;
  height: 148px;
  padding: 0;
  border: 1px dashed var(--je-border-color);
  border-radius: var(--je-radius);
}

/* 触发热区 hover 只强调描边，不带实体按钮那套底色与光晕 */
.je-upload--picture-card .je-upload__trigger:hover:not(:disabled),
.je-upload--picture-card .je-upload__dropzone:hover {
  background: var(--je-surface);
  border-color: var(--je-primary);
  box-shadow: none;
}

/* 提示整行铺满，不与卡片 / 入口挤在同一行 */
.je-upload--picture-card .je-upload__tip-holder {
  order: 2;
  flex: 0 0 100%;
  margin-top: 0;
}

/* 触屏设备（含平板）没有 hover，操作按钮常显，否则没法预览 / 删除 */
@media (hover: none) {
  .je-upload__list--picture-card .je-upload__card-actions {
    pointer-events: auto;
    opacity: 1;
  }
}

/* 窄屏：热区不小于 44px */
@media (max-width: 768px) {
  .je-upload__dropzone {
    min-height: 44px;
    padding: 24px 16px;
  }

  .je-upload__trigger,
  .je-upload__name,
  .je-upload__remove {
    min-height: 44px;
  }

  .je-upload__remove {
    width: 44px;
  }

  .je-upload__thumb-wrap {
    width: 52px;
    height: 52px;
  }

  /* 照片墙卡片窄屏下放大，触控更好点；仍然是方形 */
  .je-upload__list--picture-card .je-upload__item,
  .je-upload--picture-card .je-upload__dropzone,
  .je-upload--picture-card .je-upload__trigger {
    width: 132px;
    height: 132px;
    min-height: 132px;
  }

  .je-upload__list--picture-card .je-upload__thumb-wrap {
    width: 100%;
    height: 100%;
  }

  /* 触屏没有 hover，遮罩里的操作按钮必须常显，否则没法预览 / 删除；44px 保证热区 */
  .je-upload__list--picture-card .je-upload__card-actions {
    pointer-events: auto;
    opacity: 1;
  }

  .je-upload__card-action {
    width: 44px;
    height: 44px;
  }
}

/*
 * 减弱动效时全部瞬切。
 * 状态类 / 修饰符类的特异性比单个基础类高，只写基础类会被反压回来，
 * 所以要把它们一并列进来。
 */
@media (prefers-reduced-motion: reduce) {
  .je-upload__dropzone,
  .je-upload__trigger,
  .je-upload__remove,
  .je-upload.is-dragging .je-upload__dropzone,
  .je-upload__progress-bar,
  .je-upload__card-actions,
  .je-upload__card-action {
    transition: none;
  }
}
</style>
