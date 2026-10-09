<script setup lang="ts">
/*
 * 主题设置面板的内容区（无弹层外壳）。
 *
 * 弹层外壳是 doc-theme-panel，主题页直接把这块内容放进 cell-group 里，
 * 两处共用同一份交互，避免「面板里能调、页面上调不了」的不一致。
 */
import { computed } from 'vue'
import { useDocTheme, type JeThemeMode, type JeThemePreset } from '../../theme/useTheme'

defineOptions({ name: 'DocThemeSettings' })

const { mode, primary, modeOptions, presets, setMode, setPrimary, applyPreset, reset } =
  useDocTheme()

const modeValue = computed<JeThemeMode>({
  get: () => mode.value,
  set: (value) => setMode(value),
})

/**
 * 取色器直接读写当前主色：确认取色后由 setThemePrimary 推导渐变终点。
 * 不额外存一份 draft —— 组件内部已经有未确认的临时值，外层跟着提交结果走即可。
 */
const customColor = computed({
  get: () => primary.value,
  set: (value: string) => setPrimary(value),
})

/** 当前主色是否正好等于某个预设（含终点色一致），用于给色块打勾 */
const isActive = (preset: JeThemePreset) =>
  preset.primary.toLowerCase() === primary.value.toLowerCase()
</script>

<template>
  <view class="theme-settings">
    <view class="theme-settings__section">
      <text class="theme-settings__label">外观</text>
      <je-segmented v-model="modeValue" :options="modeOptions" block />
    </view>

    <view class="theme-settings__section">
      <text class="theme-settings__label">预设主色</text>
      <view class="theme-settings__swatches">
        <view
          v-for="preset in presets"
          :key="preset.primary"
          class="theme-settings__swatch"
          :class="{ 'is-active': isActive(preset) }"
          :style="{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.end})` }"
          role="button"
          :aria-label="`主色 ${preset.name}`"
          :aria-pressed="isActive(preset)"
          @tap="applyPreset(preset)"
        >
          <je-icon v-if="isActive(preset)" name="check" :size="16" />
        </view>
      </view>
    </view>

    <view class="theme-settings__section">
      <text class="theme-settings__label">自定义主色</text>
      <view class="theme-settings__custom">
        <je-color-picker v-model="customColor" size="small" />
        <je-button size="small" variant="ghost" @click="reset">恢复默认</je-button>
      </view>
      <text class="theme-settings__hint">
        渐变终点色由主色推导（色相 +18°、亮度 -12%），所以只需要调一个颜色。
      </text>
    </view>

    <view class="theme-settings__preview">
      <view class="theme-settings__gradient" />
      <text class="theme-settings__hex">--je-primary: {{ primary }}</text>
    </view>
  </view>
</template>

<style scoped>
.theme-settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.theme-settings__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-settings__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--je-text);
}

.theme-settings__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.theme-settings__swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 38px;
  height: 38px;
  color: var(--je-text-on-color);
  border-radius: 12px;
  cursor: pointer;
  /* 选中环用 inset 阴影画，避免额外一层盒子参与布局 */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.theme-settings__swatch.is-active {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 0 2px var(--je-text-faint);
}

.theme-settings__custom {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-settings__custom :deep(.je-color-picker) {
  flex: 1 1 auto;
  min-width: 0;
}

.theme-settings__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--je-text-muted);
}

.theme-settings__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-settings__gradient {
  height: 44px;
  border-radius: var(--je-radius-sm);
  background: linear-gradient(135deg, var(--je-primary), var(--je-primary-end));
}

.theme-settings__hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--je-text-muted);
}
</style>
