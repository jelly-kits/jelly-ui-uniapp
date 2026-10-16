<script setup lang="ts">
/*
 * 组件详情页：语言包（pages/demo/locale）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { computed, ref } from 'vue'
import { registerJellyLocale, resolveLocale } from '../../components/je-locale'

/*
 * 演示「注册自定义语言」：registerJellyLocale(名字, 语言包)。
 * 只需写要覆盖的字段，其余字段回落简体中文；注册后就像内置语言一样按语言名下发。
 * 组件内部用的 key 是点路径，嵌套分组（signature / shareSheet …）做一层浅合并。
 */
registerJellyLocale('ja-JP', {
  confirm: '確認',
  cancel: 'キャンセル',
  loading: '読み込み中...',
  signature: { clear: 'クリア', undo: '元に戻す', tip: '上の空白部分に署名してください' },
  shareSheet: { title: '共有先', cancel: 'キャンセル' },
})

/** 当前语言：内置 zh-CN / en-US，加上上面注册的 ja-JP，切一下看文案对照 */
const locale = ref('zh-CN')

/** 挑几条有代表性的文案列出来，key 就是组件内部用的那套点路径 */
const rows = computed(() => {
  const pack = resolveLocale(locale.value)
  return [
    { label: 'name', text: pack.name },
    { label: 'confirm', text: pack.confirm },
    { label: 'cancel', text: pack.cancel },
    { label: 'loading', text: pack.loading },
    { label: 'close', text: pack.close },
    { label: 'empty', text: pack.empty },
    { label: 'signature.clear', text: pack.signature.clear },
    { label: 'signature.tip', text: pack.signature.tip },
    { label: 'shareSheet.title', text: pack.shareSheet.title },
    { label: 'imagePreview.close', text: pack.imagePreview.close },
    { label: 'orgChart.removeConfirm', text: pack.orgChart.removeConfirm },
  ]
})
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="语言包" route="locale" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group
        title="语言包"
        description="JeLocale 内置 zh-CN / en-US 两套文案，子组件用 useJeLocale().t('key') 取文案，切换语言后实时更新。"
        inset
      >
        <je-cell title="切换语言" center>
          <je-button
            size="small"
            :type="locale === 'zh-CN' ? 'primary' : 'default'"
            @click="locale = 'zh-CN'"
          >
            中文
          </je-button>
          <je-button
            size="small"
            :type="locale === 'en-US' ? 'primary' : 'default'"
            @click="locale = 'en-US'"
          >
            English
          </je-button>
          <je-button
            size="small"
            :type="locale === 'ja-JP' ? 'primary' : 'default'"
            @click="locale = 'ja-JP'"
          >
            日本語
          </je-button>
        </je-cell>

        <je-cell v-for="row in rows" :key="row.label" :title="row.label" :value="row.text" />
      </je-cell-group>

      <je-cell-group
        title="扩展可翻译字段"
        description="想给组件再加一条可翻译文案（例如某个组件的按钮文字），按下面三步补："
        inset
      >
        <view class="demo-block demo-col">
          <je-text tag="div" size="small">
            1. 在 components/je-locale/types.ts 的 JeLocaleMessages 里加一个字段，写清它用在哪里。
          </je-text>
          <je-text tag="div" size="small">
            2. 同步补齐 zh-CN、en-US 两套语言包（jeZhCN / jeEnUS），缺一套 TypeScript 会直接报错。
          </je-text>
          <je-text tag="div" size="small">
            3. 消费组件里用 t('分组.字段') 取文案；未命中会原样返回这个 key，方便排查漏配。
          </je-text>
          <je-text tag="div" size="small">
            当前已有字段：confirm、cancel、loading、close、empty、signature.clear / undo / tip、shareSheet.title / cancel、
            imagePreview.close / index、orgChart.name / title / addChild / remove / removeConfirm /
            removeConfirmLeaf / newNode。
          </je-text>
        </view>
      </je-cell-group>

      <je-cell-group
        title="注册自定义语言"
        description="新增一种语言用 registerJellyLocale(语言名, 语言包)，只需写要覆盖的字段，其余回落简体中文；注册后就能像内置语言一样直接用语言名下发。本页已注册 ja-JP，点上方的「日本語」即可看到。"
        inset
      >
        <view class="demo-block demo-col">
          <je-text tag="div" size="small">
            registerJellyLocale('ja-JP', { confirm: '確認', cancel: 'キャンセル', signature: { clear:
            'クリア', undo: '元に戻す', tip: '上の空白部分に署名してください' } })
          </je-text>
          <je-text tag="div" size="small">
            只写要覆盖的字段即可，其余回落简体中文；字段与 zh-CN 的分组结构对齐，嵌套分组（signature /
            shareSheet / imagePreview / orgChart）内部要写全。
          </je-text>
          <je-text tag="div" size="small">
            同名可覆盖，也能覆盖内置的 en-US；下发时把语言名传给 je-locale 的 locale 属性，或在应用入口用
            setStoredLang('ja-JP') 记住偏好，下次启动自动取回。
          </je-text>
          <je-text tag="div" size="small">
            已有 vue-i18n 或自研翻译函数时，不必逐条抄文案：给 je-locale 的 locale 传 { name, t, prefix }，
            库会用自己的 key 逐条去问 t()，取不到的键回落简体中文。
          </je-text>
        </view>
      </je-cell-group>
    </scroll-view>
  </view>
</template>
