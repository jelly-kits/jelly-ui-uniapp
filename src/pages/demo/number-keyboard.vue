<script setup lang="ts">
/*
 * 组件详情页：数字键盘（pages/demo/number-keyboard）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 数字键盘：显隐与已输入金额 */
const keyboardVisible = ref(false)

const keyboardValue = ref('')

const onKeyboardInput = (key: string) => {
  keyboardValue.value += key
}

const onKeyboardDelete = () => {
  keyboardValue.value = keyboardValue.value.slice(0, -1)
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="数字键盘" route="number-keyboard" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="数字键盘" description="JeNumberKeyboard（点金额唤起，点键盘外收起）" inset>
            <je-cell
              title="金额"
              is-link
              :value="keyboardValue || '请输入'"
              @click="keyboardVisible = true"
            />
          </je-cell-group>
    </scroll-view>

    <!-- 全局浮层 / 宿主：常驻在内容区之外，由本页按钮唤起 -->
    <je-number-keyboard
      v-model="keyboardVisible"
      title="输入金额"
      extra-key="."
      :value="keyboardValue"
      :maxlength="8"
      @input="onKeyboardInput"
      @delete="onKeyboardDelete"
    />
  </view>
</template>
