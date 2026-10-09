<script setup lang="ts">
import { computed } from 'vue'
import JeIcon from '../je-icon/je-icon.vue'

defineOptions({ name: 'JeNavBar' })

const props = withDefaults(
  defineProps<{
    /** 中间标题 */
    title?: string
    /** 标题下方的说明文字 */
    description?: string
    /** 左侧文字；不传时只显示返回箭头 */
    leftText?: string
    /** 是否显示左侧返回箭头 */
    leftArrow?: boolean
    /** 右侧文字 */
    rightText?: string
    /** 固定到视口顶部，长列表里保持可见 */
    fixed?: boolean
    /** fixed 时是否用占位元素把导航栏原来的高度补回来 */
    placeholder?: boolean
    /** 顶部安全区留白（刘海屏），fixed 时尤其需要 */
    safeArea?: boolean
    /** 底部分隔线 */
    border?: boolean
    /** fixed 时的层级，与项目其它固定头栏（文档站顶栏 200）保持同一量级 */
    zIndex?: number
  }>(),
  {
    title: undefined,
    description: undefined,
    leftText: undefined,
    leftArrow: true,
    rightText: undefined,
    fixed: false,
    placeholder: false,
    safeArea: true,
    border: true,
    zIndex: 100,
  },
)

const emit = defineEmits<{
  /** 点击左侧区域 */
  'click-left': [event: MouseEvent]
  /** 点击右侧区域 */
  'click-right': [event: MouseEvent]
}>()

const rootStyle = computed(() => ({
  '--je-nav-bar-z': String(props.zIndex),
  '--je-nav-bar-safe-top': props.safeArea ? 'env(safe-area-inset-top, 0px)' : '0px',
}))

/** 固定时才需要占位，否则导航栏脱离文档流会把内容顶上来 */
const withPlaceholder = computed(() => props.fixed && props.placeholder)
</script>

<template>
  <div class="je-nav-bar-root">
    <header
      class="je-nav-bar"
      :class="{ 'is-fixed': fixed, 'has-border': border }"
      :style="rootStyle"
    >
      <div class="je-nav-bar__side je-nav-bar__side--left">
        <slot name="left">
          <button
            v-if="leftArrow || leftText"
            type="button"
            class="je-nav-bar__action"
            @click="emit('click-left', $event)"
          >
            <JeIcon v-if="leftArrow" name="chevron-left" :size="20" />
            <span v-if="leftText" class="je-nav-bar__action-text">{{ leftText }}</span>
          </button>
        </slot>
      </div>

      <div class="je-nav-bar__center">
        <slot name="title">
          <h1 v-if="title" class="je-nav-bar__title">{{ title }}</h1>
          <p v-if="description" class="je-nav-bar__description">{{ description }}</p>
          <slot />
        </slot>
      </div>

      <div class="je-nav-bar__side je-nav-bar__side--right">
        <slot name="right">
          <button
            v-if="rightText"
            type="button"
            class="je-nav-bar__action"
            @click="emit('click-right', $event)"
          >
            <span class="je-nav-bar__action-text">{{ rightText }}</span>
          </button>
        </slot>
      </div>
    </header>

    <div v-if="withPlaceholder" class="je-nav-bar__placeholder" aria-hidden="true" />
  </div>
</template>

<style scoped>
.je-nav-bar-root {
  font-family: inherit;
}

.je-nav-bar {
  position: relative;
  z-index: var(--je-nav-bar-z, 100);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  /* 刘海屏在顶部留白；不启用时这个变量解析成 0 */
  padding: var(--je-nav-bar-safe-top, 0px) 8px 0;
  color: var(--je-text);
  background: var(--je-popup);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.je-nav-bar.has-border::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: var(--je-border-color);
}

.je-nav-bar.is-fixed {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
}

/* 占位高度必须与导航栏一致（含安全区），否则固定后会有一段内容被盖住 */
.je-nav-bar-root .je-nav-bar__placeholder {
  height: calc(52px + var(--je-nav-bar-safe-top, 0px));
}

.je-nav-bar__side {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  min-width: 0;
}

.je-nav-bar__side--right {
  justify-content: flex-end;
}

.je-nav-bar__center {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  text-align: center;
}

.je-nav-bar__title {
  margin: 0;
  overflow: hidden;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-nav-bar__description {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.3;
  color: var(--je-text-faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-nav-bar__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  font-family: inherit;
  font-size: 15px;
  color: var(--je-text);
  background: transparent;
  border: none;
  border-radius: var(--je-radius-sm);
  cursor: pointer;
  outline: none;
  transition: background var(--je-duration) ease;
}

.je-nav-bar__action:hover {
  background: var(--je-surface-hover);
}

.je-nav-bar__action:focus-visible {
  outline: 2px solid var(--je-primary);
  outline-offset: 2px;
}

.je-nav-bar__action-text {
  white-space: nowrap;
}

@media (max-width: 768px) {
  /* 移动端标准高度收到 44px，热区保持不小于 44px */
  .je-nav-bar {
    height: 44px;
  }

  .je-nav-bar__action {
    min-width: 44px;
    min-height: 44px;
  }

  .je-nav-bar-root .je-nav-bar__placeholder {
    height: calc(44px + var(--je-nav-bar-safe-top, 0px));
  }
}
</style>
