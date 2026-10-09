<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 子菜单是 .je-menu 的 flex 子项，且弹出层要挂在自身（position: relative）上做绝对定位。
   * 小程序自定义组件默认多包一层宿主节点，宿主会顶替它成为 flex 子项、也不再是弹出层的
   * 定位参照物，标题高度与浮层偏移都落不到点上。声明 virtualHost 后宿主不再生成盒子。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { useUid } from '../../core/useUid'
import { nextZIndex } from '../../core/useZIndex'
import JeIcon from '../je-icon/je-icon.vue'
import type { JeIconName } from '../je-icon/icons'
import JeTooltip from '../je-tooltip/je-tooltip.vue'
import {
  jeMenuKey,
  jeMenuParentKey,
  type JeMenuIndex,
  type JeMenuParentContext,
} from '../je-menu/types'

defineOptions({ name: 'JeSubMenu' })

const props = withDefaults(
  defineProps<{
    index: JeMenuIndex
    disabled?: boolean
    icon?: JeIconName
  }>(),
  { disabled: false, icon: undefined },
)

const menu = inject(jeMenuKey)
const parent = inject(jeMenuParentKey, undefined)

const uid = useUid('je-sub-menu')
const titleRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const zIndex = ref(nextZIndex())

const horizontal = computed(() => menu?.horizontal.value ?? false)
const opened = computed(() => menu?.isOpened(props.index) ?? false)
/** 浮层模式：横向菜单，或折叠后的纵向菜单 */
const popup = computed(() => horizontal.value || !!menu?.collapse.value)
/** 处于浮层内时不再隐藏文字 */
const collapsed = computed(
  () => !!menu && !horizontal.value && menu.collapse.value && !(parent?.popup.value ?? false),
)

const arrowIcon = computed<JeIconName>(() => (horizontal.value ? 'chevron-down' : 'chevron-right'))

/** 浮层落位交给 CSS：横向贴标题正下方，折叠态纵向贴标题右侧，都按起始边对齐 */
const side = computed(() => (horizontal.value ? 'bottom' : 'right'))
const align = computed(() => 'start')

const path = computed<JeMenuIndex[]>(() => [...(parent?.path.value ?? []), props.index])

/** 让浮层内的项也带上路径前缀与浮层标记 */
const childContext: JeMenuParentContext = {
  path,
  popup,
  closePopup: () => menu?.closeMenu(props.index),
}
provide(jeMenuParentKey, childContext)

/**
 * 窄屏没有 hover。小程序端没有 window，恒按窄屏处理；H5 在挂载时按视口宽判一次
 * （口径与 CSS 的 `@media (max-width: 768px)` 保持一致）。
 */
const isMobile = ref(true)
// #ifdef H5
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
// #endif

const panelStyle = computed(() =>
  popup.value && opened.value ? { zIndex: zIndex.value } : undefined,
)

const open = () => {
  if (opened.value) return
  zIndex.value = nextZIndex()
  menu?.openMenu(props.index)
}

const close = () => menu?.closeMenu(props.index)

const toggle = () => {
  if (props.disabled) return
  if (opened.value) close()
  else open()
}

/* 点外部关闭只存在于 H5（桌面浮层形态）；小程序端没有 document，靠透明遮罩 */
// #ifdef H5
/** H5 下模板 ref 指向的是 uni-view 实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!popup.value || !opened.value) return
  const target = event.target as Node | null
  if (pick(titleRef.value)?.contains(target) || pick(panelRef.value)?.contains(target)) return
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

/** 键盘只存在于 H5：浮层展开后把焦点送进第一项 */
const focusFirstItem = () => {
  // #ifdef H5
  pick(panelRef.value)?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  // #endif
}

const onTitleKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggle()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    open()
    if (popup.value) nextTick(focusFirstItem)
    return
  }

  if (event.key === 'ArrowLeft' || event.key === 'Escape') {
    if (!opened.value) return
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}
</script>

<template>
  <view
    class="je-submenu"
    :class="{
      'is-opened': opened,
      'is-popup': popup,
      'is-horizontal': horizontal,
      'is-disabled': disabled,
    }"
  >
    <view
      :id="`${uid}-title`"
      ref="titleRef"
      class="je-submenu__title"
      :class="{ 'is-active': opened, 'is-collapse': collapsed }"
      role="menuitem"
      aria-haspopup="true"
      :aria-expanded="opened"
      :aria-controls="`${uid}-panel`"
      :tabindex="disabled ? -1 : 0"
      :aria-disabled="disabled || undefined"
      @tap="toggle"
      @keydown="onTitleKeydown"
    >
      <!-- 尺寸类只能落在宿主自己的这层包装上，不依赖 JeTooltip 的属性透传 -->
      <view class="je-submenu__tip">
        <JeTooltip placement="right" :disabled="!collapsed">
          <view class="je-submenu__body" :class="{ 'is-collapse': collapsed }">
            <view v-if="icon" class="je-submenu__icon" :class="{ 'is-active': opened }">
              <JeIcon :name="icon" :size="18" />
            </view>
            <text class="je-submenu__label" :class="{ 'is-collapse': collapsed }">
              <slot name="title" />
            </text>
            <JeIcon
              class="je-submenu__arrow"
              :class="{
                'is-open': opened,
                'is-popup': popup,
                'is-horizontal': horizontal,
                'is-collapse': collapsed,
              }"
              :name="arrowIcon"
              :size="16"
            />
          </view>
          <template #content><slot name="title" /></template>
        </JeTooltip>
      </view>
    </view>

    <view
      :id="`${uid}-panel`"
      ref="panelRef"
      class="je-submenu__list"
      :class="[`is-${side}`, `is-align-${align}`, { 'is-open': opened }]"
      :style="panelStyle"
      role="menu"
      :aria-labelledby="`${uid}-title`"
    >
      <view class="je-submenu__inner">
        <slot />
      </view>
    </view>

    <!-- 窄屏 / 小程序端没有 document，浮层展开时靠这层透明遮罩接「点外部」 -->
    <view
      v-if="isMobile"
      class="je-submenu__scrim"
      :class="{ 'is-open': popup && opened }"
      aria-hidden="true"
      @tap="close"
    />
  </view>
</template>

<style scoped>
.je-submenu {
  position: relative;
}

.je-submenu__title {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--je-text-muted);
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease, color var(--je-duration) ease;
}

.je-submenu__title:hover,
.je-submenu__title.is-active {
  color: var(--je-text);
  background: var(--je-surface-hover);
}

.je-submenu__title:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-submenu.is-disabled .je-submenu__title {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-submenu.is-disabled .je-submenu__title:hover {
  background: none;
}

.je-submenu__tip {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
}

.je-submenu__body {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.je-submenu__icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--je-text-faint);
}

/* 状态类挂在图标自身：图标在小程序端位于 JeTooltip 内部，后代选择器跨不过组件边界 */
.je-submenu__icon.is-active {
  color: var(--je-text);
}

.je-submenu__title:hover .je-submenu__icon {
  color: var(--je-text);
}

.je-submenu__label {
  flex: 1 1 auto;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-submenu__arrow {
  flex-shrink: 0;
  color: var(--je-text-faint);
  transition: transform 0.3s var(--je-ease-overshoot);
}

/* 纵向内联展开时箭头由「右」转向「下」 */
.je-submenu__arrow.is-open:not(.is-popup) {
  transform: rotate(90deg);
}

/* 横向菜单展开弹层时箭头翻向上方 */
.je-submenu__arrow.is-open.is-horizontal {
  transform: rotate(180deg);
}

/* 折叠态：只剩图标居中，标题文字隐藏（Tooltip 内容不受影响） */
.je-submenu__title.is-collapse {
  justify-content: center;
  padding: 10px 0;
}

.je-submenu__title.is-collapse .je-submenu__tip {
  flex: 0 0 auto;
}

.je-submenu__body.is-collapse {
  justify-content: center;
}

.je-submenu__label.is-collapse,
.je-submenu__arrow.is-collapse {
  display: none;
}

/* 纵向内联展开：用 grid-template-rows 0fr → 1fr 做高度过渡，无需测量高度 */
.je-submenu__list {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition: grid-template-rows 0.3s ease, opacity 0.25s ease, visibility 0s linear 0.3s;
}

.je-submenu__list.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
  visibility: visible;
  transition: grid-template-rows 0.32s var(--je-ease-out-back), opacity 0.28s ease;
}

.je-submenu__inner {
  min-height: 0;
  overflow: hidden;
}

/* 纵向内联展开时子项缩进，形成层级感 */
.je-submenu:not(.is-popup) .je-submenu__inner {
  padding-left: 14px;
}

/*
 * 浮层模式：横向菜单 / 折叠后的纵向菜单。
 * 主库把浮层传送出去用 useFloating 算 left/top；这里不能传送，改为就地挂在
 * position: relative 的 .je-submenu 上做绝对定位，方位由下面的 is-<side> 类给出。
 */
.je-submenu.is-popup .je-submenu__list {
  position: absolute;
  display: block;
  z-index: 2000;
  min-width: 180px;
  padding: 6px;
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: var(--je-border);
  border-radius: var(--je-radius);
  box-shadow: var(--je-shadow-popup);
  transform-origin: top left;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.94);
  transition: transform 0.24s ease-in, opacity 0.2s ease-in, visibility 0s linear 0.24s;
}

.je-submenu.is-popup .je-submenu__list.is-open {
  pointer-events: auto;
  opacity: 1;
  visibility: visible;
  transform: scale(1);
  transition: transform 0.28s var(--je-ease-out-back), opacity 0.22s ease-out;
}

.je-submenu.is-popup .je-submenu__inner {
  overflow: visible;
  padding-left: 0;
}

/* 方位（间距对应主库 useFloating 的 offset: 4）；不做碰撞检测与自动翻转 */
.je-submenu__list.is-bottom.is-align-start {
  top: calc(100% + 4px);
  left: 0;
}

.je-submenu__list.is-right.is-align-start {
  top: 0;
  left: calc(100% + 4px);
}

/* 透明遮罩只负责接「点外部」这一下，不改变视觉 */
.je-submenu__scrim {
  position: fixed;
  /* 小程序端不认 inset，拆成四边 */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  background: transparent;
  opacity: 0;
  visibility: hidden;
}

.je-submenu__scrim.is-open {
  opacity: 1;
  visibility: visible;
}

@media (max-width: 768px) {
  .je-submenu__title {
    min-height: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-submenu__title,
  .je-submenu__arrow,
  .je-submenu__list,
  .je-submenu__list.is-open,
  .je-submenu.is-popup .je-submenu__list,
  .je-submenu.is-popup .je-submenu__list.is-open {
    transition: none;
  }
}
</style>
