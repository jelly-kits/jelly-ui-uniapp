<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { jeMenuKey, type JeMenuContext, type JeMenuIndex } from './types'

defineOptions({ name: 'JeMenu' })

const props = withDefaults(
  defineProps<{
    modelValue?: JeMenuIndex | null
    mode?: 'vertical' | 'horizontal'
    /** 仅纵向模式有效：折叠后只显示图标，标题用 Tooltip 提示 */
    collapse?: boolean
    /** 纵向模式下同时只展开一个子菜单 */
    uniqueOpened?: boolean
    /** 初始展开的子菜单 */
    defaultOpeneds?: JeMenuIndex[]
  }>(),
  {
    modelValue: null,
    mode: 'vertical',
    collapse: false,
    uniqueOpened: true,
    defaultOpeneds: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeMenuIndex]
  select: [index: JeMenuIndex, indexPath: JeMenuIndex[]]
  open: [index: JeMenuIndex]
  close: [index: JeMenuIndex]
}>()

const rootRef = ref<HTMLElement | null>(null)
const openedMenus = ref<JeMenuIndex[]>([...props.defaultOpeneds])

const horizontal = computed(() => props.mode === 'horizontal')
const isCollapse = computed(() => !horizontal.value && props.collapse)

const isOpened = (index: JeMenuIndex) => openedMenus.value.includes(index)

const closeMenu = (index: JeMenuIndex) => {
  if (!isOpened(index)) return
  openedMenus.value = openedMenus.value.filter((item) => item !== index)
  emit('close', index)
}

const closeAll = () => {
  openedMenus.value.forEach((item) => emit('close', item))
  openedMenus.value = []
}

const openMenu = (index: JeMenuIndex) => {
  if (isOpened(index)) return
  // 横向模式同时只保留一个弹出层；纵向模式由 uniqueOpened 决定
  if (horizontal.value || props.uniqueOpened) closeAll()
  openedMenus.value = [...openedMenus.value, index]
  emit('open', index)
}

const toggleOpen = (index: JeMenuIndex) => {
  if (isOpened(index)) closeMenu(index)
  else openMenu(index)
}

const select = (index: JeMenuIndex, indexPath: JeMenuIndex[]) => {
  emit('update:modelValue', index)
  emit('select', index, indexPath)
  // 横向菜单选中后收起弹出层
  if (horizontal.value) closeAll()
}

/*
 * 方向键导航只存在于 H5：小程序端没有键盘事件，这一整块 DOM 调用也不会执行
 * （按 #ifdef 收进 H5，避免在端上被编译进小程序包）。
 */
// #ifdef H5
/** H5 下模板 ref 指向的是 uni-view 实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/** 收起的面板 visibility: hidden，不应进入方向键序列 */
const isVisible = (el: HTMLElement) => {
  const root = pick(rootRef.value)
  let node: HTMLElement | null = el
  while (node) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    if (node === root) break
    node = node.parentElement
  }
  return true
}

const getItems = (): HTMLElement[] =>
  Array.from(pick(rootRef.value)?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter(
    (el) => el.getAttribute('aria-disabled') !== 'true' && isVisible(el),
  )

const moveFocus = (step: number) => {
  const items = getItems()
  if (items.length === 0) return
  const current = items.indexOf(document.activeElement as HTMLElement)
  const next =
    current < 0
      ? step > 0
        ? 0
        : items.length - 1
      : (current + step + items.length) % items.length
  items[next]?.focus()
}
// #endif

/** 共享入口：H5 处理方向键 / Esc，小程序端是空实现（这里没有键盘事件） */
const onKeydown = (event: KeyboardEvent) => {
  // #ifdef H5
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveFocus(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveFocus(-1)
  } else if (event.key === 'Escape') {
    closeAll()
  }
  // #endif
}

const context: JeMenuContext = {
  activeIndex: computed(() => props.modelValue ?? null),
  openedMenus,
  horizontal,
  collapse: isCollapse,
  select,
  toggleOpen,
  openMenu,
  closeMenu,
  isOpened,
}

provide(jeMenuKey, context)
</script>

<template>
  <view
    ref="rootRef"
    class="je-menu"
    :class="[`je-menu--${mode}`, { 'is-collapse': isCollapse }]"
    role="menu"
    :aria-orientation="horizontal ? 'horizontal' : 'vertical'"
    @keydown="onKeydown"
  >
    <slot />
  </view>
</template>

<style scoped>
.je-menu {
  display: flex;
  box-sizing: border-box;
  padding: 6px;
  font-family: inherit;
  color: var(--je-text);
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
}

.je-menu--vertical {
  flex-direction: column;
}

.je-menu--horizontal {
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

/* 折叠后只剩图标，固定成一列窄条 */
.je-menu--vertical.is-collapse {
  width: 64px;
}

/*
 * 主库在窄屏给横向菜单加了 overflow-x: auto / overflow-y: hidden 让它横向滑动，
 * 但这里不传送浮层，子菜单弹出层就地挂在菜单里，会被这个滚动容器裁掉（小程序端恒为窄屏，
 * 等于横向子菜单永远弹不出来）。这里只保留横向排布，溢出交给页面处理。
 */
</style>
