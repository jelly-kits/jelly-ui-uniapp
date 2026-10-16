<script setup lang="ts">
/*
 * 组件详情页：块编辑器（pages/demo/block-editor）
 * 演示选中态交互、居中弹窗编辑、图片多选与宽高 / 缩放，以及只读渲染与自定义按钮。
 */
import { computed, ref } from 'vue'
import type {
  JeBlockActionItem,
  JeBlockDocument,
  JeBlockToolbarItem,
  JeBlockUpload,
} from '../../components/je-block-editor'

/**
 * 演示用的假上传：延迟一下再回地址。
 * H5 拿到的是 File，非 H5 拿到的已经是本地临时路径，直接返回即可。
 */
const mockUpload: JeBlockUpload = (file) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(typeof file === 'string' ? file : URL.createObjectURL(file)), 400)
  })

/** 四种块各来一个，顺便带上一个非默认的宽度与缩放 */
const doc = ref<JeBlockDocument>({
  version: 1,
  blocks: [
    {
      id: 'b1',
      type: 'text',
      text: '一段文本就是一个块，换行会原样保留。\n点一下块会选中它，选中后块头部才出现图标。',
    },
    {
      id: 'b2',
      type: 'image',
      url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=colorful%20jelly%20dessert%20on%20a%20white%20plate&image_size=landscape_4_3',
      alt: '果冻',
      width: '60%',
      fit: 'cover',
    },
    {
      id: 'b3',
      type: 'video',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      poster:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cartoon%20movie%20title%20card%20poster%20with%20a%20cute%20giant%20rabbit&image_size=landscape_16_9',
    },
    { id: 'b4', type: 'link', url: 'https://cn.vuejs.org', title: 'Vue 3 文档' },
  ],
})

const json = computed(() => JSON.stringify(doc.value, null, 2))

/** 多图上传演示：初始只有一个空图片块，点「编辑」再点「选择图片」可以一次选多张 */
const mediaDoc = ref<JeBlockDocument>({
  version: 1,
  blocks: [
    { id: 'm1', type: 'image', url: '', width: '50%' },
    { id: 'm2', type: 'video', url: '', height: '200px', fit: 'cover' },
  ],
})

/** 自定义顶部按钮：内置的四种块 + 一个插预设文本的按钮 */
const customToolbar: JeBlockToolbarItem[] = [
  'text',
  'image',
  'divider',
  {
    key: 'quote',
    title: '插入一段引用文本',
    icon: 'flag',
    onClick: ({ insert }) => insert({ type: 'text', text: '「自定义按钮插入的文本块」—— ' }),
  },
]

/** 自定义块头部按钮：保留编辑，去掉复制，加一个把地址转大写的按钮 */
const customActions: JeBlockActionItem[] = [
  'drag',
  'edit',
  'up',
  'down',
  {
    key: 'upper',
    title: '把地址转成大写',
    icon: 'refresh',
    onClick: ({ block, update }) => {
      if (!block || block.type === 'text') return
      update(block.id, { url: block.url.toUpperCase() })
    },
  },
  'remove',
]

const customDoc = ref<JeBlockDocument>({
  version: 1,
  blocks: [{ id: 'c1', type: 'text', text: '试试块头部的自定义按钮：它会把地址转成大写。' }],
})

/** 只放行文本与图片 */
const limitedDoc = ref<JeBlockDocument>({
  version: 1,
  blocks: [{ id: 'l1', type: 'text', text: '这个编辑器只放行文本与图片两种块。' }],
})

const readonlyDoc = ref<JeBlockDocument>({
  version: 1,
  blocks: [{ id: 'r1', type: 'text', text: 'disabled 下不能选中，也不能增删改块。' }],
})
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="块编辑器" route="block-editor" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group
        title="块编辑器"
        description="JeBlockEditor / JeBlockView（点一下块选中，选中后点「编辑」弹窗改内容）"
        inset
      >
        <view class="demo-block">
          <je-block-editor v-model="doc" :upload="mockUpload" />
        </view>
      </je-cell-group>

      <je-cell-group
        title="当前的 JSON"
        description="v-model 收发 { version, blocks }，不含 HTML，其他端按 type 分支渲染即可"
        inset
      >
        <view class="demo-block">
          <text class="demo-json">{{ json }}</text>
        </view>
      </je-cell-group>

      <je-cell-group
        title="多图上传与尺寸缩放"
        description="图片可一次选多张：第一张落在当前块，其余各生成一个图片块插在它后面"
        inset
      >
        <view class="demo-block">
          <je-block-editor v-model="mediaDoc" :upload="mockUpload" />
          <text class="demo-tip">
            宽度可以点档位（25% / 50% / 75% / 100%）或直接填数值，高度留空即按素材比例自适应，
            缩放方式对应 contain / cover / fill。本页 upload 是假上传，换成自己的接口即可。
          </text>
        </view>
      </je-cell-group>

      <je-cell-group
        title="只读渲染"
        description="JeBlockView 拿同一份 JSON 直接渲染，也是展示端的实现参照"
        inset
      >
        <view class="demo-block">
          <je-block-view :value="doc" />
        </view>
      </je-cell-group>

      <je-cell-group
        title="自定义按钮与按钮配置"
        description="toolbar 与 blockActions 都是「白名单 + 顺序 + 自定义按钮」"
        inset
      >
        <view class="demo-block">
          <je-block-editor v-model="customDoc" :toolbar="customToolbar" :block-actions="customActions" />
        </view>
      </je-cell-group>

      <je-cell-group
        title="限制块类型与禁用"
        description="blockTypes 只放行文本与图片；disabled 让整块编辑器只读"
        inset
      >
        <view class="demo-block demo-col">
          <je-block-editor v-model="limitedDoc" :block-types="['text', 'image']" />
          <je-block-editor v-model="readonlyDoc" disabled />
        </view>
      </je-cell-group>
    </scroll-view>
  </view>
</template>

<style scoped>
.demo-col {
  gap: 16px;
}

.demo-tip {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--je-text-faint);
}

.demo-json {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  color: var(--je-text-muted);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
