<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
} from 'vue'
import JeIcon from '../je-icon/je-icon.vue'
import {
  jeTabsKey,
  type JeTabName,
  type JeTabPaneState,
  type JeTabsContext,
  type JeTabsPosition,
  type JeTabsType,
} from './types'

defineOptions({ name: 'JeTabs' })

const props = withDefaults(
  defineProps<{
    modelValue?: JeTabName
    type?: JeTabsType
    tabPosition?: JeTabsPosition
    /** tab 等分撑满 */
    stretch?: boolean
    /** 所有 tab 均可关闭 */
    closable?: boolean
  }>(),
  { type: 'line', tabPosition: 'top', stretch: false, closable: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeTabName]
  'tab-click': [name: JeTabName]
  'tab-change': [name: JeTabName]
  'tab-remove': [name: JeTabName]
}>()

/** 未受控时的内部激活项 */
const innerValue = ref<JeTabName | undefined>(undefined)

/** 子项注册表：保持模板顺序，getState 每次读取都会跟踪子项 props */
const registry = ref<{ uid: string; getState: () => JeTabPaneState }[]>([])
const panes = computed(() => registry.value.map((entry) => entry.getState()))

const activeName = computed<JeTabName | undefined>(() => props.modelValue ?? innerValue.value)
const isVertical = computed(() => props.tabPosition === 'left' || props.tabPosition === 'right')

const registerPane: JeTabsContext['registerPane'] = (uid, getState) => {
  if (registry.value.some((entry) => entry.uid === uid)) return
  registry.value = [...registry.value, { uid, getState }]
}

const unregisterPane: JeTabsContext['unregisterPane'] = (uid) => {
  registry.value = registry.value.filter((entry) => entry.uid !== uid)
}

const isActive = (name: JeTabName) => activeName.value !== undefined && name === activeName.value
const isClosable = (pane: JeTabPaneState) => props.closable || pane.closable

const activate = (name: JeTabName) => {
  const pane = panes.value.find((item) => item.name === name)
  if (!pane || pane.disabled) return
  emit('tab-click', name)
  if (name === activeName.value) return
  if (props.modelValue === undefined) innerValue.value = name
  emit('update:modelValue', name)
  emit('tab-change', name)
}

const remove = (name: JeTabName) => {
  emit('tab-remove', name)
}

/** 未受控时，自动落到第一个可用面板 */
watch(
  panes,
  (list) => {
    if (props.modelValue !== undefined) return
    if (list.some((pane) => pane.name === innerValue.value)) return
    innerValue.value = list.find((pane) => !pane.disabled)?.name
  },
  { immediate: true },
)

const instance = getCurrentInstance()
/** tab 条内容层：指示条以它为定位父级 */
const navRef = ref<HTMLElement | null>(null)
/** line 指示条几何信息 */
const ink = ref({ left: 0, top: 0, width: 0, height: 0 })
const inkVisible = ref(false)

/** scroll-view 的布尔属性走 ref 下发（mp 端静态字面量 false 有丢失历史） */
const showScrollbar = ref(false)

/** H5 下模板 ref 指向的是 uni-view 组件实例，真实 DOM 节点挂在 $el 上 */
const pick = (value: unknown): HTMLElement | null =>
  ((value as { $el?: HTMLElement } | null)?.$el ?? value ?? null) as HTMLElement | null

/** 两端量到的矩形都只需要这四个字段 */
interface JeRect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * 由 tab 条内容层与激活 tab 两块矩形算出指示条的位置，两端共用同一套几何。
 * 内容层随滚动一起位移，两者相减得到的就是内容坐标，不必再补 scrollLeft / scrollTop；
 * tab 条本身只负责滚动，尺寸判定仍以内容层（navRect）为准。
 */
const applyInk = (navRect: JeRect, tabRect: JeRect) => {
  if (isVertical.value) {
    const width = 2
    ink.value = {
      // 指示条贴向内容区一侧
      left: props.tabPosition === 'right' ? 0 : navRect.width - width,
      top: tabRect.top - navRect.top,
      width,
      height: tabRect.height,
    }
  } else {
    const height = 2
    ink.value = {
      left: tabRect.left - navRect.left,
      // 指示条贴向内容区一侧
      top: props.tabPosition === 'bottom' ? 0 : navRect.height - height,
      width: tabRect.width,
      height,
    }
  }
  inkVisible.value = true
}

/**
 * 量出激活 tab 相对 tab 条的几何位置，指示条才能滑过去。
 * H5 直接读 DOM；小程序端没有 document，改用自己的组件树里的 SelectorQuery，
 * 两块矩形一次 exec 拿回，避免两次异步测量之间的布局漂移。
 */
const updateInk = () => {
  const name = activeName.value
  const pane = name === undefined ? undefined : panes.value.find((item) => item.name === name)
  if (props.type !== 'line' || !pane) {
    inkVisible.value = false
    return
  }

  // #ifdef H5
  const nav = pick(navRef.value)
  const tab = document.getElementById(`${pane.uid}-tab`)
  if (!nav || !tab) {
    inkVisible.value = false
    return
  }
  applyInk(nav.getBoundingClientRect(), tab.getBoundingClientRect())
  // #endif

  // #ifndef H5
  if (!instance?.proxy) return
  const query = uni.createSelectorQuery().in(instance.proxy)
  query.select('.je-tabs__nav-inner').boundingClientRect()
  query.select(`#${pane.uid}-tab`).boundingClientRect()
  query.exec((result) => {
    const list = Array.isArray(result) ? result : []
    const navRect = list[0] as unknown as JeRect | null
    const tabRect = list[1] as unknown as JeRect | null
    if (!navRect || !tabRect) {
      inkVisible.value = false
      return
    }
    applyInk(navRect, tabRect)
  })
  // #endif
}

watch([activeName, panes, () => props.type, () => props.tabPosition], () => {
  void nextTick(updateInk)
})

onMounted(() => {
  void nextTick(updateInk)
  // #ifdef H5
  window.addEventListener('resize', updateInk)
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
  window.removeEventListener('resize', updateInk)
  // #endif
})

/** 键盘导航：小程序端没有 keydown 事件，整段逻辑只对 H5 有意义 */
const onKeydown = (event: KeyboardEvent) => {
  // #ifdef H5
  const list = panes.value.filter((pane) => !pane.disabled)
  if (list.length === 0) return

  const currentIndex = list.findIndex((pane) => isActive(pane.name))
  const prevKey = isVertical.value ? 'ArrowUp' : 'ArrowLeft'
  const nextKey = isVertical.value ? 'ArrowDown' : 'ArrowRight'

  let nextIndex: number
  if (event.key === prevKey) {
    nextIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1
  } else if (event.key === nextKey) {
    nextIndex = currentIndex === -1 || currentIndex === list.length - 1 ? 0 : currentIndex + 1
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = list.length - 1
  } else {
    return
  }

  event.preventDefault()
  const target = list[nextIndex]
  if (!target) return
  activate(target.name)
  document.getElementById(`${target.uid}-tab`)?.focus()
  // #endif
}

/** 可关闭时，聚焦在 tab 上按 Delete 即可关闭 */
const onTabDelete = (pane: JeTabPaneState) => {
  if (!isClosable(pane)) return
  remove(pane.name)
}

const context: JeTabsContext = { registerPane, unregisterPane, isActive }
provide(jeTabsKey, context)
</script>

<template>
  <view
    class="je-tabs"
    :class="[
      `je-tabs--${type}`,
      `je-tabs--${tabPosition}`,
      { 'is-stretch': stretch, 'is-closable': closable },
    ]"
  >
    <!-- 窄屏放不下时整条横向滑动；小程序端 view 不滚动，滚动交给 scroll-view -->
    <scroll-view
      class="je-tabs__nav"
      :scroll-x="!isVertical"
      :show-scrollbar="showScrollbar"
      role="tablist"
      :aria-orientation="isVertical ? 'vertical' : 'horizontal'"
      @keydown="onKeydown"
    >
      <view ref="navRef" class="je-tabs__nav-inner">
        <button
          v-for="pane in panes"
          :id="`${pane.uid}-tab`"
          :key="pane.uid"
          type="button"
          class="je-tabs__tab"
          :class="{ 'is-active': isActive(pane.name) }"
          role="tab"
          :aria-selected="isActive(pane.name)"
          :aria-controls="`${pane.uid}-panel`"
          :tabindex="isActive(pane.name) ? 0 : -1"
          :disabled="pane.disabled"
          @tap="activate(pane.name)"
          @keydown.delete="onTabDelete(pane)"
        >
          <text class="je-tabs__label">
            <!-- label 插槽只在 H5 渲染得出来：小程序端子组件的插槽进不了父级模板，标题退回 label 文案 -->
            <!-- #ifdef H5 -->
            <component :is="pane.labelRender" v-if="pane.labelRender" />
            <template v-else>{{ pane.label }}</template>
            <!-- #endif -->
            <!-- #ifndef H5 -->
            {{ pane.label }}
            <!-- #endif -->
          </text>
          <view
            v-if="isClosable(pane)"
            class="je-tabs__close"
            aria-hidden="true"
            @tap.stop="remove(pane.name)"
          >
            <JeIcon name="close" :size="12" />
          </view>
        </button>

        <view
          v-if="type === 'line'"
          class="je-tabs__ink"
          :class="{ 'is-visible': inkVisible }"
          :style="{
            left: `${ink.left}px`,
            top: `${ink.top}px`,
            width: `${ink.width}px`,
            height: `${ink.height}px`,
          }"
          aria-hidden="true"
        />
      </view>
    </scroll-view>

    <view class="je-tabs__content">
      <slot />
    </view>
  </view>
</template>

<style scoped>
.je-tabs {
  display: flex;
  box-sizing: border-box;
  font-family: inherit;
  color: var(--je-text);
}

.je-tabs--top {
  flex-direction: column;
}

.je-tabs--bottom {
  flex-direction: column-reverse;
}

.je-tabs--left {
  flex-direction: row;
}

.je-tabs--right {
  flex-direction: row-reverse;
}

/*
 * tab 条。主库窄屏下临时把 .je-tabs__nav 变成横向滚动容器；这里恒为 scroll-view
 * （小程序端 view 不能滚动），所以 width / height 要显式改回内容尺寸：uni 的
 * scroll-view 宿主默认 width、height 都是 100%，横向布局里会把内容区挤没。
 */
.je-tabs__nav {
  flex-shrink: 0;
  width: auto;
  height: auto;
  max-width: 100%;
  scrollbar-width: none;
}

.je-tabs__nav::-webkit-scrollbar {
  display: none;
}

/* 主库 .je-tabs__nav 的布局落在这层：它同时是指示条的定位父级 */
.je-tabs__nav-inner {
  position: relative;
  display: inline-flex;
  gap: 4px;
}

.je-tabs--left .je-tabs__nav-inner,
.je-tabs--right .je-tabs__nav-inner {
  flex-direction: column;
}

.je-tabs__tab {
  position: relative;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 36px;
  /* 两端原生 button 都自带 margin-left/right: auto，显式清零避免被自动外边距顶偏 */
  margin: 0;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--je-text-faint);
  white-space: nowrap;
  background: none;
  border: none;
  border-radius: var(--je-radius-sm) var(--je-radius-sm) 0 0;
  cursor: pointer;
  outline: none;
  transition: color var(--je-duration) ease, background var(--je-duration) ease;
}

/*
 * 小程序原生 button 自带 ::after 描边，这里压掉，避免多出一圈细边。
 * pointer-events: none 不能省：这层是绝对定位的整块覆盖层，会盖在静态定位的
 * .je-tabs__close 之上，把关闭按钮的真实点击全部吃掉（只剩下程序触发的 click 能生效）。
 */
.je-tabs__tab::after {
  border: none;
  pointer-events: none;
}

.je-tabs__tab:hover:not(:disabled) {
  color: var(--je-text-muted);
}

/*
 * 激活态同时挂 aria-selected 与 .is-active：H5 认前者，小程序端 aria 属性
 * 不落到节点上，靠类名兜住同一套样式。
 */
.je-tabs__tab[aria-selected='true'],
.je-tabs__tab.is-active {
  color: var(--je-text);
}

.je-tabs__tab:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: -2px;
}

.je-tabs__tab:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.je-tabs__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.je-tabs__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: currentColor;
  border-radius: 50%;
  transition: background var(--je-duration) ease;
}

.je-tabs__close:hover {
  background: color-mix(in srgb, var(--je-primary) 40%, transparent);
}

/* line 类型的滑动指示条 */
.je-tabs__ink {
  position: absolute;
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
  border-radius: 999px;
  opacity: 0;
  pointer-events: none;
  transition: left 0.36s var(--je-ease-out-back), top 0.36s var(--je-ease-out-back),
    width 0.36s var(--je-ease-out-back), height 0.36s var(--je-ease-out-back),
    opacity 0.2s ease;
}

.je-tabs__ink.is-visible {
  opacity: 1;
}

/*
 * 横向等分。内容层要退回 flex 并撑满宽度：inline-flex 是按内容宽度收缩的，
 * flex: 1 在里面分不到剩余空间。
 */
.je-tabs--top.is-stretch .je-tabs__nav-inner,
.je-tabs--bottom.is-stretch .je-tabs__nav-inner {
  display: flex;
  width: 100%;
}

.je-tabs--top.is-stretch .je-tabs__tab,
.je-tabs--bottom.is-stretch .je-tabs__tab {
  flex: 1 1 0;
}

.je-tabs__content {
  flex: 1 1 auto;
  min-width: 0;
}

/* card：tab 本身是卡片，内容区带边框 */
.je-tabs--card .je-tabs__tab {
  border: var(--je-border);
  border-bottom-color: transparent;
  background: var(--je-surface);
}

.je-tabs--card .je-tabs__tab[aria-selected='true'],
.je-tabs--card .je-tabs__tab.is-active {
  background: var(--je-surface-hover);
}

.je-tabs--card .je-tabs__content {
  padding: 16px;
  border: var(--je-border);
  border-radius: 0 var(--je-radius) var(--je-radius) var(--je-radius);
}

/* border-card：整块带边框，tab 之间用竖线分隔 */
.je-tabs--border-card {
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
}

.je-tabs--border-card .je-tabs__nav-inner {
  gap: 0;
}

.je-tabs--border-card .je-tabs__tab {
  border-radius: 0;
}

.je-tabs--border-card .je-tabs__tab[aria-selected='true'],
.je-tabs--border-card .je-tabs__tab.is-active {
  background: color-mix(in srgb, var(--je-primary) 22%, transparent);
}

/* 窄屏：热区拉到 44px */
@media (max-width: 768px) {
  .je-tabs__tab {
    min-height: 44px;
  }

  /* 触屏没有 hover，关闭按钮给一个更明确的常驻底色 */
  .je-tabs__close {
    background: color-mix(in srgb, var(--je-primary) 28%, transparent);
  }
}

/*
 * 减弱动效时全部瞬切。
 * 必须把 .is-visible 状态类也列进来：它的选择器特异性比基础类高，
 * 只写基础类的话状态规则里的 transition 会反压回来，减弱动效实际不生效。
 */
@media (prefers-reduced-motion: reduce) {
  .je-tabs__tab,
  .je-tabs__close,
  .je-tabs__ink,
  .je-tabs__ink.is-visible {
    transition: none;
  }
}
</style>
