<!-- src/features/requirement-workspace/components/RequirementTabs.vue -->
<template>
  <nav class="req-tabs-bar">
    <div
      v-for="item in tabs"
      :key="item.key"
      :class="['tab-item', { active: modelValue === item.key }]"
      @click="emit('update:modelValue', item.key)"
    >
      <span class="tab-icon">{{ item.icon }}</span>
      <span class="tab-label">{{ item.label }}</span>
      <span v-if="item.badge !== undefined" class="tab-badge">{{ item.badge }}</span>
    </div>
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

const tabs: { key: RequirementWorkspaceTab; label: string; icon: string; badge?: number }[] = [
  { key: 'overview', label: '概览', icon: '📌' },
  { key: 'plan', label: '计划', icon: '🗺️' },
  { key: 'execution', label: '执行', icon: '⚡' },
  { key: 'activity', label: '活动', icon: '🕒' },
  { key: 'knowledge', label: '知识', icon: '📖' }
]
</script>

<style scoped>
.req-tabs-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 24px;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  user-select: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #5f5e5b;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
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
