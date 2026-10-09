<script lang="ts">
export default {
  // #ifdef MP-WEIXIN
  /*
   * 组织架构图是「卡片 + 子节点行」自上而下拼出来的，节点自身要作为父级（`.je-org-chart-node__children`
   * 的 flex 行 / 根节点行）的块级子项参与布局；它的宽度还必须由内容（子树宽）撑开，父级才能正确居中。
   * 小程序自定义组件默认额外包一层宿主节点，宿主会把这层结构多套一级，flex 子项的定宽 / 居中全部落不到
   * 真正的内容上，整个树会散架。声明 virtualHost 后宿主不再生成盒子，根节点直接作为父级子项，与 H5 一致。
   */
  options: {
    virtualHost: true,
  },
  // #endif
}
</script>

<script setup lang="ts">
import { computed, inject, type CSSProperties } from 'vue'
import { jeOrgChartKey } from '../je-org-chart/types'

defineOptions({ name: 'JeOrgChartNode' })

const props = defineProps<{ nodeId: string }>()

const ctx = inject(jeOrgChartKey)!

const node = computed(() => ctx.nodeOf(props.nodeId))
const childIds = computed(() => ctx.childIdsOf(props.nodeId))
const spouses = computed(() => ctx.spousesOf(props.nodeId))
const childCount = computed(() => childIds.value.length)
/** 折叠 / 无子节点时不渲染下一层，递归到此为止 */
const showChildren = computed(() => childCount.value > 0 && !ctx.isCollapsed(props.nodeId))
const isCollapsed = computed(() => ctx.isCollapsed(props.nodeId))
const isActive = computed(() => ctx.isActiveNode(props.nodeId))
const isDragSource = computed(() => ctx.dragId.value === props.nodeId)
const isDragTarget = computed(() => ctx.dragTargetId.value === props.nodeId)

/** 计数徽标：>99 收敛为 99+ */
const badgeText = computed(() => (childCount.value > 99 ? '99+' : String(childCount.value)))

/** 中文取姓氏一个字，西文取首字母 */
const initialOf = (name: string): string => {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '?'
  return /[\u4e00-\u9fff]/.test(trimmed[0]) ? trimmed[0] : trimmed[0].toUpperCase()
}

/**
 * 尺寸 / 间距统一用 CSS 变量下发到子树：卡片定宽、兄弟间距（gapX）、层级间距（gapY）都从
 * 根组件的 props 现算，递归任何一层拿到的都是同一套值（与布局内核 layoutTree 的口径一致）。
 */
const rootStyle = computed<CSSProperties>(() => ({
  '--je-org-node-w': `${ctx.nodeWidth.value}px`,
  '--je-org-node-h': `${ctx.nodeHeight.value}px`,
  '--je-org-spouse-w': `${ctx.spouseWidth.value}px`,
  '--je-org-spouse-gap': `${ctx.spouseGap.value}px`,
  '--je-org-gap-x': `${ctx.gapX.value}px`,
  '--je-org-gap-y': `${ctx.gapY.value}px`,
}))

const spouseActive = (index: number) => ctx.isActiveSpouse(props.nodeId, index)
</script>

<template>
  <view class="je-org-chart-node" :style="rootStyle">
    <view class="je-org-chart-node__head">
      <view
        class="je-org-chart-node__card"
        :class="{ 'is-active': isActive, 'is-drag-source': isDragSource, 'is-drag-target': isDragTarget }"
      >
        <view v-if="childCount > 0" class="je-org-chart-node__badge">
          <text class="je-org-chart-node__badge-text">{{ badgeText }}</text>
        </view>
        <view class="je-org-chart-node__avatar">
          <image
            v-if="node?.avatar"
            class="je-org-chart-node__avatar-img"
            :src="node.avatar"
            mode="aspectFill"
          />
          <text v-else class="je-org-chart-node__avatar-text">{{ initialOf(node?.name ?? '') }}</text>
        </view>
        <view class="je-org-chart-node__info">
          <text class="je-org-chart-node__name">{{ node?.name }}</text>
          <text v-if="node?.title" class="je-org-chart-node__title">{{ node.title }}</text>
        </view>
      </view>

      <view
        v-for="(spouse, index) in spouses"
        :key="`spouse-${index}`"
        class="je-org-chart-node__spouse"
        :class="{ 'is-active': spouseActive(index) }"
      >
        <view class="je-org-chart-node__avatar is-small">
          <image
            v-if="spouse.avatar"
            class="je-org-chart-node__avatar-img"
            :src="spouse.avatar"
            mode="aspectFill"
          />
          <text v-else class="je-org-chart-node__avatar-text">{{ initialOf(spouse.name) }}</text>
        </view>
        <view class="je-org-chart-node__info">
          <text class="je-org-chart-node__name">{{ spouse.name }}</text>
          <text v-if="spouse.title" class="je-org-chart-node__title">{{ spouse.title }}</text>
        </view>
      </view>

      <view
        v-if="childCount > 0"
        class="je-org-chart-node__toggle"
        :class="{ 'is-collapsed': isCollapsed }"
        aria-hidden="true"
      >
        <text class="je-org-chart-node__toggle-sign">{{ isCollapsed ? '+' : '−' }}</text>
      </view>
    </view>

    <view v-if="showChildren" class="je-org-chart-node__children">
      <!--
        递归渲染自身：标签必须写成 kebab 形式。小程序端编译器把 selfName 置空（不按文件名生成递归），
        PascalCase 自引用不会被识别成组件、也就不会写进 usingComponents（递归从第三层起直接断掉）；
        写成 kebab 后走 easycom 兜底解析，编译产物里会生成指向自身的 usingComponents 条目。
      -->
      <je-org-chart-node v-for="childId in childIds" :key="childId" :node-id="childId" />
    </view>
  </view>
</template>

<style scoped>
/* 节点自身是「卡片行 + 子节点行」的纵向容器，宽度由内容撑开（即子树宽度），供父级居中 */
.je-org-chart-node {
  display: inline-flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  font-family: inherit;
}

/* 卡片行：主卡 + 并排的配偶卡；折叠按钮相对它定位（圆心落在整块下沿中点） */
.je-org-chart-node__head {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--je-org-spouse-gap);
}

.je-org-chart-node__card,
.je-org-chart-node__spouse {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: var(--je-org-node-h);
  border-radius: 14px;
}

.je-org-chart-node__card {
  position: relative;
  gap: 12px;
  width: var(--je-org-node-w);
  padding: 0 14px;
  /* 纵向渐变底色：明暗主题跟随，颜色可用 --je-org-node-fill* 覆盖 */
  background: linear-gradient(
    180deg,
    var(--je-org-node-fill, var(--je-surface)),
    var(--je-org-node-fill-end, color-mix(in srgb, var(--je-surface) 78%, var(--je-bg-page-from)))
  );
  border: 1px solid var(--je-org-node-border, var(--je-border-color));
}

/* 选中：强调色描边 + 一圈柔光，与主库 canvas 里的高亮口径一致 */
.je-org-chart-node__card.is-active {
  background: var(--je-org-node-fill-hover, color-mix(in srgb, var(--je-bg-page-from) 88%, var(--je-primary)));
  border-color: var(--je-org-node-accent, var(--je-primary));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--je-org-node-accent, var(--je-primary)) 32%, transparent);
}

/* 拖拽：被拖的卡片虚线框，落点目标强调色柔光 */
.je-org-chart-node__card.is-drag-source {
  border-style: dashed;
  border-color: var(--je-org-node-accent, var(--je-primary));
}

.je-org-chart-node__card.is-drag-target {
  border-color: var(--je-org-node-accent, var(--je-primary));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--je-org-node-accent, var(--je-primary)) 38%, transparent);
}

.je-org-chart-node__spouse {
  gap: 10px;
  width: var(--je-org-spouse-w);
  padding: 0 14px;
  background: var(--je-org-spouse-fill, color-mix(in srgb, var(--je-bg-page-from) 92%, var(--je-surface)));
  border: 1px solid var(--je-org-node-border, var(--je-border-color));
}

.je-org-chart-node__spouse.is-active {
  background: var(--je-org-node-fill-hover, color-mix(in srgb, var(--je-bg-page-from) 88%, var(--je-primary)));
  border-color: var(--je-org-node-accent, var(--je-primary));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--je-org-node-accent, var(--je-primary)) 32%, transparent);
}

/* 头像：有图走 image，缺省退化为姓名首字的圆形色块（主卡主色渐变、配偶卡中性底） */
.je-org-chart-node__avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  overflow: hidden;
  color: var(--je-org-node-on-color, var(--je-text-on-color));
  background: linear-gradient(
    135deg,
    var(--je-org-node-accent, var(--je-primary)),
    var(--je-org-node-accent-end, var(--je-primary-end))
  );
  border-radius: 50%;
}

.je-org-chart-node__avatar.is-small {
  width: 36px;
  height: 36px;
  color: var(--je-text-muted);
  background: var(--je-org-spouse-avatar-fill, var(--je-border-color));
}

.je-org-chart-node__avatar-img {
  width: 100%;
  height: 100%;
}

.je-org-chart-node__avatar-text {
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

.je-org-chart-node__avatar.is-small .je-org-chart-node__avatar-text {
  font-size: 15px;
}

.je-org-chart-node__info {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.je-org-chart-node__name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: var(--je-org-node-text, var(--je-text));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.je-org-chart-node__title {
  overflow: hidden;
  font-size: 12px;
  color: var(--je-org-node-text-muted, var(--je-text-muted));
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 下级计数徽标：压在主卡右上角 */
.je-org-chart-node__badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 18px;
  height: 18px;
  padding: 0 7px;
  background: linear-gradient(
    135deg,
    var(--je-org-node-accent, var(--je-primary)),
    var(--je-org-node-accent-end, var(--je-primary-end))
  );
  border-radius: 999px;
}

.je-org-chart-node__badge-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: var(--je-org-node-on-color, var(--je-text-on-color));
}

/* 折叠按钮：圆心落在卡片行下沿中点，收起态渐变实心「+」、展开态描边「−」 */
.je-org-chart-node__toggle {
  position: absolute;
  bottom: -10px;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  color: var(--je-org-node-accent, var(--je-primary));
  background: var(--je-org-node-fill, var(--je-surface));
  border: 1px solid var(--je-org-node-accent, var(--je-primary));
  border-radius: 50%;
  transform: translateX(-50%);
}

.je-org-chart-node__toggle.is-collapsed {
  color: var(--je-org-node-on-color, var(--je-text-on-color));
  background: linear-gradient(
    135deg,
    var(--je-org-node-accent, var(--je-primary)),
    var(--je-org-node-accent-end, var(--je-primary-end))
  );
  border-color: transparent;
}

.je-org-chart-node__toggle-sign {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

/* 子节点行：兄弟间距 gapX、与父级卡片的垂直间距 gapY，与布局内核口径一致 */
.je-org-chart-node__children {
  display: flex;
  justify-content: center;
  gap: var(--je-org-gap-x);
  padding-top: var(--je-org-gap-y);
}

/* #ifdef H5 */
/* 桌面端补一个悬停反馈；小程序端没有 hover 概念，整块按平台剥离 */
.je-org-chart-node__card:hover {
  border-color: var(--je-org-node-accent, var(--je-primary));
}
/* #endif */

@media (prefers-reduced-motion: reduce) {
  .je-org-chart-node__card,
  .je-org-chart-node__card.is-active,
  .je-org-chart-node__card.is-drag-target,
  .je-org-chart-node__spouse,
  .je-org-chart-node__spouse.is-active,
  .je-org-chart-node__toggle,
  .je-org-chart-node__toggle.is-collapsed {
    transition: none;
  }
}
</style>
