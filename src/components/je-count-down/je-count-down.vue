<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { JeCountDownCurrent } from './types'

defineOptions({ name: 'JeCountDown' })

const props = withDefaults(
  defineProps<{
    /** 倒计时总时长，单位毫秒 */
    time?: number
    /** 时间格式，支持 DD/HH/mm/ss/S/SS/SSS */
    format?: string
    /** 挂载后是否自动开始 */
    autoStart?: boolean
    /** 开启毫秒级渲染（会提高刷新频率，配合 S/SS/SSS 使用） */
    millisecond?: boolean
  }>(),
  {
    time: 0,
    format: 'HH:mm:ss',
    autoStart: true,
    millisecond: false,
  },
)

const emit = defineEmits<{
  /** 展示值发生变化 */
  change: [current: JeCountDownCurrent]
  /** 倒计时结束 */
  finish: []
}>()

interface CountDownPart {
  text: string
  key?: keyof JeCountDownCurrent
  pad: number
}

/** 注意不要加捕获组，否则 replace 回调的参数位会整体后移 */
const TOKEN = /D{1,2}|H{1,2}|m{1,2}|s{1,2}|S{1,3}/g

const parseFormat = (format: string): CountDownPart[] => {
  const parts: CountDownPart[] = []
  let lastIndex = 0

  const pushText = (text: string) => {
    if (text) parts.push({ text, pad: 0 })
  }

  format.replace(TOKEN, (match, offset: number) => {
    pushText(format.slice(lastIndex, offset))
    lastIndex = offset + match.length

    const head = match.charAt(0)
    if (head === 'D') parts.push({ text: match, key: 'days', pad: match.length })
    else if (head === 'H') parts.push({ text: match, key: 'hours', pad: match.length })
    else if (head === 'm') parts.push({ text: match, key: 'minutes', pad: match.length })
    else if (head === 's') parts.push({ text: match, key: 'seconds', pad: match.length })
    else parts.push({ text: match, key: 'milliseconds', pad: match.length })

    return match
  })

  pushText(format.slice(lastIndex))
  return parts
}

const parts = computed(() => parseFormat(props.format))

const remain = ref(props.time)
const running = ref(false)

const current = computed<JeCountDownCurrent>(() => {
  const total = Math.max(0, remain.value)
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor(total / 3600000) % 24,
    minutes: Math.floor(total / 60000) % 60,
    seconds: Math.floor(total / 1000) % 60,
    milliseconds: Math.floor(total % 1000),
  }
})

const renderPart = (part: CountDownPart) => {
  if (!part.key) return part.text
  const raw = String(current.value[part.key])
  if (part.key === 'milliseconds') return raw.padStart(3, '0').slice(0, part.pad)
  return raw.padStart(part.pad, '0')
}

/* 小程序端没有 window，定时器用全局 setInterval / clearInterval（两端口径一致） */
let timer: ReturnType<typeof setInterval> | null = null
let endAt = 0

const clear = () => {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

const tick = () => {
  const left = endAt - Date.now()
  remain.value = left > 0 ? left : 0
  emit('change', current.value)
  if (left <= 0) {
    clear()
    running.value = false
    emit('finish')
  }
}

const start = () => {
  if (running.value || remain.value <= 0) return
  running.value = true
  endAt = Date.now() + remain.value
  clear()
  timer = setInterval(tick, props.millisecond ? 1000 / 30 : 1000)
  tick()
}

const pause = () => {
  if (!running.value) return
  running.value = false
  clear()
}

const reset = () => {
  clear()
  running.value = false
  remain.value = props.time
  if (props.autoStart) start()
}

watch(() => props.time, reset)

onMounted(() => {
  if (props.autoStart) start()
})

onBeforeUnmount(clear)

defineExpose({ start, pause, reset, current })
</script>

<template>
  <text class="je-count-down" role="timer">
    <template v-for="(part, index) in parts" :key="index">
      <text v-if="part.key" class="je-count-down__num">{{ renderPart(part) }}</text>
      <text v-else class="je-count-down__text">{{ part.text }}</text>
    </template>
  </text>
</template>

<style scoped>
.je-count-down {
  display: inline-flex;
  align-items: center;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.je-count-down__num {
  font-variant-numeric: tabular-nums;
}
</style>
