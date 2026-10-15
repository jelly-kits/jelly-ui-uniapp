<script setup lang="ts">
/*
 * 组件详情页：导航菜单（pages/demo/menu）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { ref } from 'vue'

/** 导航菜单：当前选中项 */
const menuActive = ref<string | number>('home')
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="导航菜单" route="menu" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="导航菜单" description="JeMenu + JeMenuItem / JeSubMenu（纵向 + 子菜单）" inset>
            <view class="demo-block">
              <je-menu v-model="menuActive" :default-openeds="['system']">
                <je-menu-item index="home" icon="home">工作台</je-menu-item>
                <je-menu-item index="order" icon="list">订单管理</je-menu-item>
                <je-sub-menu index="system" icon="settings">
                  <template #title>系统设置</template>
                  <je-menu-item index="users" icon="user">用户管理</je-menu-item>
                  <je-menu-item index="roles" icon="shield">角色权限</je-menu-item>
                  <je-menu-item index="audit" icon="database" disabled>审计日志（禁用）</je-menu-item>
                </je-sub-menu>
              </je-menu>
            </view>
          </je-cell-group>
    </scroll-view>
  </view>
</template>
