<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 面板是 .je-splitter 的 flex 子项，靠自身的 flex 占比占位。小程序自定义组件默认多包一层
   * 宿主节点，flex 子项会变成宿主而不是根节点，面板的占比与分割条位置都会错位。声明
   * virtualHost 后宿主不再生成盒子，与 H5 的 DOM 结构保持一致。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import JeScrollbar from '../je-scrollbar/je-scrollbar.vue'
import { jeSplitterKey } from '../je-splitter/types'

defineOptions({ name: 'JeSplitterPanel' })

const props = withDefaults(
  defineProps<{
    /** 初始尺寸，按百分比处理（30 表示 30%） */
    size?: number | string
    /** 最小尺寸（百分比） */
    min?: number
    /** 最大尺寸（百分比） */
    max?: number
    /** 允许被拖到 0，从而折叠 */
    collapsible?: boolean
    /** 是否允许拖动它右侧 / 下方的分割条 */
    resizable?: boolean
  }>(),
  { min: 0, max: 100, collapsible: false, resizable: true },
)

const context = inject(jeSplitterKey, null)
const index = ref(-1)

onMounted(() => {
  if (!context) return
  index.value = context.registerPanel(() => ({
    size: props.size,
    min: props.min,
    max: props.max,
    collapsible: props.collapsible,
    resizable: props.resizable,
  }))
})

onBeforeUnmount(() => {
  if (context && index.value >= 0) context.unregisterPanel(index.value)
})

const isHorizontal = computed(() => !!context && context.layout.value === 'horizontal')
const isActive = computed(() => !!context && context.activeIndex.value === index.value)
const showBar = computed(
  () => !!context && index.value >= 0 && index.value < context.count.value - 1,
)

const sizePercent = computed(() => (context ? (context.sizes.value[index.value] ?? 0) : 100))

const panelStyle = computed(() => ({ flex: `1 1 ${sizePercent.value}%` }))

const onBarDown = (event: unknown) => {
  if (!context || !props.resizable) return
  context.onBarPointerDown(index.value, event)
}

const onBarMove = (event: unknown) => context?.onBarPointerMove(event)
const onBarUp = (event: unknown) => context?.onBarPointerUp(event)
</script>

<template>
  <!--
    主库的面板与分割条是两个并列的 flex 子项；小程序的模板要求单根节点，所以这里把
    两者收进同一个根：根节点承载 flex 占比，内容层占满剩余空间，分割条贴在末尾。
  -->
  <view
    class="je-splitter__panel"
    :class="isHorizontal ? 'is-horizontal' : 'is-vertical'"
    :style="panelStyle"
  >
    <view class="je-splitter__panel-inner">
      <JeScrollbar>
        <slot />
      </JeScrollbar>
    </view>

    <!-- #ifdef H5 -->
    <!--
      分割条的交互全部由 JeSplitter 在根节点上挂原生监听完成：uni-app H5 会把内置组件上的
      DOM 事件归一化成跨端事件对象（丢掉 clientX / clientY），模板绑定在这里拿不到坐标。
      这里只负责渲染与无障碍语义。
    -->
    <view
      v-if="showBar"
      class="je-splitter__bar"
      :class="[
        isHorizontal ? 'je-splitter__bar--horizontal' : 'je-splitter__bar--vertical',
        { 'is-active': isActive, 'is-disabled': !resizable },
      ]"
      role="separator"
      :aria-orientation="isHorizontal ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(sizePercent)"
      aria-valuemin="0"
      aria-valuemax="100"
      :tabindex="resizable ? 0 : -1"
    />
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <view
      v-if="showBar"
      class="je-splitter__bar"
      :class="[
        isHorizontal ? 'je-splitter__bar--horizontal' : 'je-splitter__bar--vertical',
        { 'is-active': isActive, 'is-disabled': !resizable },
      ]"
      @touchstart="onBarDown"
      @touchmove.stop.prevent="onBarMove"
      @touchend="onBarUp"
      @touchcancel="onBarUp"
    />
    <!-- #endif -->
  </view>
</template>

<style scoped>
/*
 * 根节点是 .je-splitter 的 flex 子项：占比由内联 flex-basis 下发，
 * 内部再排「内容层 + 分割条」，方向跟随分栏方向。
 */
.je-splitter__panel {
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  font-family: inherit;
}

.je-splitter__panel.is-horizontal {
  flex-direction: row;
}

.je-splitter__panel.is-vertical {
  flex-direction: column;
}

.je-splitter__panel-inner {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.je-splitter__bar {
  position: relative;
  flex: 0 0 auto;
  background: transparent;
  outline: none;
  /* 只有分割条本身禁用触屏手势，面板内容照常滚动 */
  touch-action: none;
}

.je-splitter__bar--horizontal {
  width: 4px;
  cursor: col-resize;
}

.je-splitter__bar--vertical {
  height: 4px;
  cursor: row-resize;
}

/* 视觉细线由伪元素绘制，元素本身只负责命中区 */
.je-splitter__bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 4px;
  height: 100%;
  background: var(--je-border-color);
  border-radius: 999px;
  transform: translateX(-50%);
  transition: background var(--je-duration) ease;
}

.je-splitter__bar--vertical::after {
  top: 50%;
  left: 0;
  width: 100%;
  height: 4px;
  transform: translateY(-50%);
}

.je-splitter__bar:hover::after,
.je-splitter__bar.is-active::after {
  background: var(--je-primary);
}

.je-splitter__bar:focus-visible::after {
  background: var(--je-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-primary) 35%, transparent);
}

.je-splitter__bar.is-disabled {
  cursor: default;
}

/* 窄屏：命中区加宽到 16px，视觉线仍是 4px */
@media (max-width: 768px) {
  .je-splitter__bar--horizontal {
    width: 16px;
  }

  .je-splitter__bar--vertical {
    height: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .je-splitter__bar::after {
    transition: none;
  }
}
</style>
