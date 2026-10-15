<script setup lang="ts">
/*
 * 组件详情页：密码输入框（pages/demo/password-input）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 密码输入框：内容与满位回显 */
const passwordValue = ref('')

const passwordLog = ref('待输入')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="密码输入框" route="password-input" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="密码输入框" description="JePasswordInput（点格子唤起键盘，满位触发 complete）" inset>
            <view class="demo-block">
              <je-password-input
                v-model="passwordValue"
                :length="6"
                gutter="8"
                info="6 位数字验证码"
                clearable
                @complete="passwordLog = '已输满 6 位'"
              />
            </view>
            <je-cell title="已输入" :value="passwordValue || '—'" />
            <je-cell title="状态" :value="passwordLog" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
