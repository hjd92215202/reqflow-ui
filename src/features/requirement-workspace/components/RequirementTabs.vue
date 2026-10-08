<!-- src/features/requirement-workspace/components/RequirementTabs.vue -->
<template>
  <nav class="req-tabs-bar">
    <button
      v-for="item in tabs"
      :key="item.key"
      type="button"
      :class="['tab-item', { active: modelValue === item.key }]"
      :aria-current="modelValue === item.key ? 'page' : undefined"
      @click="emit('update:modelValue', item.key)"
    >
      <span class="tab-label">{{ item.label }}</span>
      <span v-if="item.badge !== undefined" class="tab-badge">{{ item.badge }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { RequirementWorkspaceTab } from '@/types'

defineProps<{
  modelValue: RequirementWorkspaceTab
  stagesCount?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', tab: RequirementWorkspaceTab): void
}>()

const tabs: { key: RequirementWorkspaceTab; label: string; badge?: number }[] = [
  { key: 'overview', label: '概览' },
  { key: 'plan', label: '计划' },
  { key: 'execution', label: '执行' },
  { key: 'activity', label: '活动' },
  { key: 'knowledge', label: '知识' }
]
</script>

<style scoped>
.req-tabs-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 24px;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  user-select: none;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  margin: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  color: #5f5e5b;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.tab-item:focus-visible {
  outline: 2px solid rgba(35, 131, 226, 0.55);
  outline-offset: -2px;
  border-radius: 4px;
}

.tab-item:hover {
  color: #37352f;
  background-color: rgba(55, 53, 47, 0.03);
}

.tab-item.active {
  color: #2383e2;
  border-bottom-color: #2383e2;
  font-weight: 600;
}

.tab-icon {
  font-size: 13px;
}

.tab-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  background-color: rgba(55, 53, 47, 0.06);
  color: #8c8c8c;
}
</style>
