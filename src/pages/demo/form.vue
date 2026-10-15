<script setup lang="ts">
/*
 * 组件详情页：表单校验（pages/demo/form）
 * 由 pages/index/index.vue 拆出，只保留本页这一个演示区块用到的状态。
 * 外壳样式与演示排版在全局 src/theme/demo.css 里。
 */
import { reactive, ref } from 'vue'

/** 表单：JeForm + JeFormItem + JeInput */
const formModel = reactive({ name: '', email: '', bio: '' })

const formRules = {
  name: [
    { required: true, message: '请填写昵称' },
    { min: 2, message: '昵称至少 2 个字' },
  ],
  email: [
    { required: true, message: '请填写邮箱' },
    { pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: '邮箱格式不正确' },
  ],
}

const formRef = ref<{ validate: () => Promise<boolean>; resetFields: () => void } | null>(null)

const formValid = ref<boolean | null>(null)

const submitForm = async () => {
  formValid.value = (await formRef.value?.validate()) ?? false
}

const resetForm = () => {
  formRef.value?.resetFields()
  formValid.value = null
}
</script>

<template>
  <view class="doc" :class="jeThemeClass" :style="jeThemeVars">
    <doc-demo-bar title="表单校验" route="form" />

    <scroll-view scroll-y class="doc__body">
      <je-cell-group title="表单校验" description="JeForm + JeFormItem" inset>
            <view class="demo-block">
              <je-form ref="formRef" :model="formModel" :rules="formRules">
                <je-form-item prop="name" label="昵称">
                  <je-input v-model="formModel.name" placeholder="请输入昵称" clearable />
                </je-form-item>
                <je-form-item prop="email" label="邮箱">
                  <je-input v-model="formModel.email" placeholder="name@example.com" />
                </je-form-item>
                <je-form-item label="个人简介">
                  <je-input
                    v-model="formModel.bio"
                    type="textarea"
                    :rows="3"
                    placeholder="聊聊自己"
                    show-word-limit
                    :maxlength="50"
                  />
                </je-form-item>
                <je-space>
                  <je-button type="primary" @click="submitForm">提交</je-button>
                  <je-button type="default" @click="resetForm">重置</je-button>
                </je-space>
              </je-form>
            </view>
            <je-cell
              title="校验结果"
              :value="formValid === null ? '—' : formValid ? '通过' : '未通过'"
            />
          </je-cell-group>
    </scroll-view>
  </view>
</template>
