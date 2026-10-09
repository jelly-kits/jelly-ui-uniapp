<script setup lang="ts">
/*
 * 组件详情页：输入框（pages/demo/input）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 返回目录页；直接从链接打开详情页时没有返回栈，退化成重启到首页 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

/** 输入框 */
const inputText = ref('')

const inputPassword = ref('jelly-2026')

const inputTextarea = ref('')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">输入框</text>
      </view>
    </view>

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
