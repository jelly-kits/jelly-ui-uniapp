<script setup lang="ts">
import { provide } from 'vue'
import { jeCollapseKey, type JeCollapseContext, type JeCollapseName } from './types'

defineOptions({ name: 'JeCollapse' })

const props = withDefaults(
  defineProps<{
    modelValue?: JeCollapseName[]
    accordion?: boolean
  }>(),
  { modelValue: () => [], accordion: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: JeCollapseName[]]
  change: [name: JeCollapseName, value: JeCollapseName[]]
}>()

const isActive = (name: JeCollapseName) => props.modelValue.includes(name)

const toggle = (name: JeCollapseName) => {
  const current = props.modelValue
  const active = current.includes(name)

  let next: JeCollapseName[]
  if (props.accordion) {
    next = active ? [] : [name]
  } else {
    next = active ? current.filter((item) => item !== name) : [...current, name]
  }

  emit('update:modelValue', next)
  emit('change', name, next)
}

const context: JeCollapseContext = { isActive, toggle }
provide(jeCollapseKey, context)
</script>

<template>
  <div class="je-collapse" :class="{ 'is-accordion': accordion }">
    <slot />
  </div>
</template>

<style scoped>
.je-collapse {
  box-sizing: border-box;
  overflow: hidden;
  font-family: inherit;
  background: var(--je-surface);
  border: var(--je-border);
  border-radius: var(--je-radius);
}
</style>
