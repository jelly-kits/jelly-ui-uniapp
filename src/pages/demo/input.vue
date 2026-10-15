<script setup lang="ts">
/*
 * 组件详情页：输入框（pages/demo/input）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 输入框 */
const inputText = ref('')

const inputPassword = ref('jelly-2026')

const inputTextarea = ref('')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="输入框" route="input" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="输入框" description="JeInput + JeField" inset>
            <view class="demo-block">
              <je-field label="基础输入（可清空 + 字数）">
                <je-input
                  v-model="inputText"
                  placeholder="随便输点什么"
                  clearable
                  show-word-limit
                  :maxlength="20"
                />
              </je-field>
              <je-field label="密码（可切换可见）">
                <je-input v-model="inputPassword" type="password" show-password />
              </je-field>
              <je-field label="前置 / 后置插槽">
                <je-input v-model="inputText" placeholder="金额">
                  <template #prepend>￥</template>
                  <template #append>元</template>
                </je-input>
              </je-field>
              <je-field label="文本域（自适应高度）">
                <je-input v-model="inputTextarea" type="textarea" autosize placeholder="自动增高" />
              </je-field>
              <je-field label="只读">
                <je-input :model-value="inputText" readonly placeholder="只读" />
              </je-field>
              <je-field label="禁用">
                <je-input model-value="禁用状态" disabled />
              </je-field>
            </view>
            <je-cell title="实时输入" :value="inputText || '—'" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
