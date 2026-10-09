<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { nextZIndex } from '../../core/useZIndex'
import { useUid } from '../../core/useUid'
import { jeDropdownMenuKey, type JeDropdownMenuContext } from './types'

defineOptions({ name: 'JeDropdownMenu' })

const props = withDefaults(
  defineProps<{
    /** 展开时是否显示遮罩 */
    overlay?: boolean
    /** 点击遮罩是否收起 */
    closeOnClickOverlay?: boolean
    /** 点击菜单之外是否收起 */
    closeOnClickOutside?: boolean
    /** 点击选项后是否自动收起 */
    closeOnClickOption?: boolean
    /** 面板展开方向，up 时在条目栏上方弹出 */
    direction?: 'down' | 'up'
    /** 展开 / 收起过渡时长（毫秒） */
    duration?: number
    /** 选中 / 展开态文字颜色，缺省用主题色 */
    activeColor?: string
    /** 未选中态文字颜色，缺省用次级文字色 */
    inactiveColor?: string
  }>(),
  {
    overlay: true,
    closeOnClickOverlay: true,
    closeOnClickOutside: true,
    closeOnClickOption: true,
    direction: 'down',
    duration: 200,
    activeColor: '',
    inactiveColor: '',
  },
)

const emit = defineEmits<{
  /** 第 index 项展开 */
  open: [index: number]
  /** 收起，回传收起前展开的那一项下标 */
  close: [index: number]
}>()

const uid = useUid('je-dropdown-menu')
const rootRef = ref<HTMLElement | null>(null)
/** 根元素层级：每次展开重新取一次，保证后开的浮层压住先开的 */
const zIndex = ref(nextZIndex())
const activeIndex = ref(-1)

/*
 * 窄屏没有 hover，点菜单之外改由一层透明遮罩接管。
 * 小程序端没有 window，恒按窄屏处理；H5 在挂载时按视口宽判一次
 * （口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

/* 子项按挂载顺序注册，据此把下标与展开项对齐 */
const items = ref<symbol[]>([])
const register = (key: symbol) => {
  if (!items.value.includes(key)) items.value = [...items.value, key]
  return items.value.indexOf(key)
}
const unregister = (key: symbol) => {
  items.value = items.value.filter((item) => item !== key)
}
const indexOf = (key: symbol) => items.value.indexOf(key)

const direction = computed(() => props.direction)
const activeColor = computed(() => props.activeColor || 'var(--je-primary)')
const inactiveColor = computed(() => props.inactiveColor || 'var(--je-text-muted)')
const duration = computed(() => props.duration)
const closeOnClickOption = computed(() => props.closeOnClickOption)

const refreshZIndex = () => {
  zIndex.value = nextZIndex()
  return zIndex.value
}

const close = () => {
  activeIndex.value = -1
}

const toggle = (index: number) => {
  if (activeIndex.value === index) {
    close()
    return
  }
  refreshZIndex()
  activeIndex.value = index
}

watch(activeIndex, (value, previous) => {
  if (value === -1) emit('close', previous === -1 ? -1 : previous)
  else emit('open', value)
})

const onOverlayClick = () => {
  if (!props.closeOnClickOverlay) return
  close()
}

/*
 * 窄屏 / 小程序端的「点菜单之外收起」。
 * 透明遮罩层级低于深色遮罩，遮罩开着时由那一层先接管，这里只兜住没开遮罩的情况。
 */
const onScrimTap = () => {
  if (activeIndex.value === -1) return
  if (!props.closeOnClickOutside) return
  close()
}

/* 点外部关闭只在 H5（有 document）成立；小程序端没有 document，靠上面的透明遮罩 */
// #ifdef H5
/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const onDocumentPointerDown = (event: PointerEvent) => {
  if (activeIndex.value === -1) return
  if (!props.closeOnClickOutside) return
  const root = pick(rootRef.value)
  const target = event.target as Node | null
  // 落在菜单自身（含深色遮罩）里的点击交给各自的处理器，这里只处理真正的外点
  if (root && target && root.contains(target)) return
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
// #endif

onBeforeUnmount(() => {
  // #ifdef H5
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  // #endif
})

const context: JeDropdownMenuContext = {
  activeIndex,
  toggle,
  close,
  direction,
  activeColor,
  inactiveColor,
  duration,
  closeOnClickOption,
  refreshZIndex,
  register,
  unregister,
  indexOf,
}
provide(jeDropdownMenuKey, context)
</script>

<template>
  <view
    :id="uid"
    ref="rootRef"
    class="je-dropdown-menu"
    :class="{ 'is-open': activeIndex !== -1 }"
    :style="{ zIndex, '--je-dropdown-duration': `${duration}ms` }"
  >
    <view class="je-dropdown-menu__bar">
      <slot />
    </view>

    <!-- 窄屏 / 小程序没有 document，用这层透明遮罩接管「点菜单之外收起」，不改变视觉 -->
    <view
      v-if="isMobile"
      class="je-dropdown-menu__scrim"
      :class="{ 'is-open': activeIndex !== -1 }"
      aria-hidden="true"
      @tap="onScrimTap"
    />

    <!-- 遮罩放在根 stacking context 里：z-index 为负，永远在条目栏与面板之下、页面内容之上 -->
    <view
      class="je-dropdown-menu__overlay"
      :class="{ 'is-open': overlay && activeIndex !== -1 }"
      aria-hidden="true"
      @tap="onOverlayClick"
    />
  </view>
</template>

<style scoped>
.je-dropdown-menu {
  position: relative;
  display: flex;
  align-items: stretch;
  font-family: inherit;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
}

.je-dropdown-menu__bar {
  display: flex;
  flex: 1 1 auto;
  align-items: stretch;
  min-width: 0;
}

.je-dropdown-menu__overlay {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 负层级把它压在条目栏与面板之下，但仍高于页面内容 */
  z-index: -1;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--je-dropdown-duration, 200ms) ease,
    visibility 0s linear var(--je-dropdown-duration, 200ms);
}

.je-dropdown-menu__overlay.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity var(--je-dropdown-duration, 200ms) ease;
}

/*
 * 透明遮罩只负责接「点菜单之外」这一下，不改视觉。
 * 层级比深色遮罩更低：深色遮罩开着时由它接管点击，这里只在没有遮罩时生效。
 */
.je-dropdown-menu__scrim {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -2;
  background: transparent;
  visibility: hidden;
  pointer-events: none;
}

.je-dropdown-menu__scrim.is-open {
  visibility: visible;
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .je-dropdown-menu__overlay,
  .je-dropdown-menu__overlay.is-open {
    transition: none;
  }
}
</style>
