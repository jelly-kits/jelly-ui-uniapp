<script setup lang="ts">
/*
 * 组件详情页：全局配置（pages/demo/config-provider）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 子树尺寸演示：三档各用一个 JeConfigProvider 包裹，内部表单控件统一跟随档位渲染 */
const sizeTiers = ['small', 'default', 'large'] as const

const inputValue = ref('')
const selectValue = ref<string | number>('')
const selectOptions = [
  { label: '选项一', value: 1 },
  { label: '选项二', value: 2 },
]
const checked = ref<(string | number)[]>(['a'])
const checkboxOptions = [
  { label: '甲', value: 'a' },
  { label: '乙', value: 'b' },
]
const switched = ref(true)
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="全局配置" route="config-provider" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="全局配置" description="JeConfigProvider（子树内覆盖主题变量）" inset>
            <view class="demo-block">
              <je-config-provider :theme="{ primary: '#0EA5E9' }">
                <je-space wrap>
                  <je-button>主色被覆盖</je-button>
                  <je-tag type="primary">同在子树内</je-tag>
                </je-space>
              </je-config-provider>
            </view>
          </je-cell-group>

      <je-cell-group
        title="全局尺寸"
        description="JeConfigProvider（子树内表单控件统一按档位渲染，组件自身传了 size 则以自身为准）"
        inset
      >
        <view class="demo-block demo-col">
          <view
            v-for="tier in sizeTiers"
            :key="tier"
            class="demo-col"
            :data-size-tier="tier"
          >
            <text style="font-size: 12px; color: var(--je-text-faint)">{{ tier }}</text>
            <je-config-provider :size="tier">
              <view class="demo-col">
                <je-input v-model="inputValue" placeholder="输入框" clearable />
                <je-select v-model="selectValue" :options="selectOptions" />
                <je-checkbox-group v-model="checked" :options="checkboxOptions" />
                <je-switch v-model="switched" active-text="开" inactive-text="关" />
              </view>
            </je-config-provider>
          </view>
        </view>
      </je-cell-group>
    </scroll-view>
  </view>
</template>
