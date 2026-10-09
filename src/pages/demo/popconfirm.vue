<script setup lang="ts">
/*
 * 组件详情页：气泡确认（pages/demo/popconfirm）
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

/** 气泡确认：受控开合 + 结果回显 */
const popconfirmVisible = ref(false)

const popconfirmLog = ref('—')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <view class="doc__bar">
      <view class="doc__bar-inner">
        <view class="doc__back" aria-label="返回组件列表" @tap="goBack">
          <je-icon name="chevron-left" :size="22" />
        </view>
        <text class="doc__title">气泡确认</text>
      </view>
    </view>

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="气泡确认" description="JePopconfirm（气泡贴着触发按钮弹出，带箭头）" inset>
            <je-cell title="用法" value="点右侧按钮，气泡在按钮下方展开" />
            <view class="demo-block demo-row">
              <je-popconfirm
                v-model="popconfirmVisible"
                title="确认删除？"
                content="删除后不可恢复"
                type="danger"
                placement="bottom-start"
                :width="240"
                @confirm="popconfirmLog = '已确认'"
                @cancel="popconfirmLog = '已取消'"
              >
                <je-button size="small" type="danger">删除</je-button>
              </je-popconfirm>
              <je-text size="small">结果：{{ popconfirmLog }}</je-text>
            </view>
            <je-cell title="当前结果" :value="popconfirmLog" />
            <je-cell title="说明" value="气泡不做碰撞检测" />
            <je-cell title="说明" value="点击外部或按 Esc 取消" />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
