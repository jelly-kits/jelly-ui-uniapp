<script setup lang="ts">
/*
 * 组件详情页：倒计时（pages/demo/count-down）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'
import type { JeCountDownCurrent } from '../../components/je-count-down'

/** 倒计时：默认 3 分钟，可暂停 / 重置 */
const countdownTime = ref(3 * 60 * 1000)

const countdownText = ref('03:00')

const countdownRef = ref<{ start: () => void; pause: () => void; reset: () => void } | null>(null)

const onCountdownChange = (current: JeCountDownCurrent) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  countdownText.value = `${pad(current.hours * 60 + current.minutes)}:${pad(current.seconds)}`
}

const controlCountdown = (action: 'start' | 'pause' | 'reset') => {
  countdownRef.value?.[action]()
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="倒计时" route="count-down" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="倒计时" description="JeCountDown" inset>
            <view class="demo-block">
              <je-count-down
                ref="countdownRef"
                :time="countdownTime"
                format="HH:mm:ss"
                @change="onCountdownChange"
              />
            </view>
            <je-cell title="当前剩余" :value="countdownText" />
            <je-space>
              <je-button size="small" type="success" @click="controlCountdown('start')">开始</je-button>
              <je-button size="small" type="warning" @click="controlCountdown('pause')">暂停</je-button>
              <je-button size="small" type="default" @click="controlCountdown('reset')">重置</je-button>
            </je-space>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
