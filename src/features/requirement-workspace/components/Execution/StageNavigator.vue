<!-- src/features/requirement-workspace/components/Execution/StageNavigator.vue -->
<template>
  <aside class="stage-nav-sidebar">
    <div class="nav-title-row">
      <span class="nav-head-text">执行阶段 ({{ stages.length }})</span>
      <el-button link class="add-stage-btn" @click="emit('create-stage')"> ➕ </el-button>
    </div>

    <div v-if="stages.length > 0" class="stage-nav-items">
      <div
        v-for="(st, idx) in stages"
        :key="st.id"
        :class="['stage-nav-card', { active: currentStageId === st.id }]"
        @click="emit('select-stage', st.id)"
      >
        <div class="card-status-indicator">
          <span :class="['dot-indicator', st.status]"></span>
          <span class="stage-nav-title">{{ st.title }}</span>
        </div>

        <div class="card-meta-line">
          <span class="task-count-hint">0{{ idx + 1 }} · {{ formatStatus(st.status) }}</span>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无阶段" :image-size="40" />
  </aside>
</template>

<script setup lang="ts">
import type { Stage, TaskStatus } from '@/types'

defineProps<{
  stages: Stage[]
  currentStageId: number | null
}>()

const emit = defineEmits<{
  (e: 'select-stage', stageId: number): void
  (e: 'create-stage'): void
}>()

const formatStatus = (s: TaskStatus) => {
  if (s === 'DONE') return '已完成'
  if (s === 'IN_PROGRESS') return '进行中'
  return '待处理'
}
</script>

<style scoped>
.stage-nav-sidebar {
  width: 216px;
  background-color: #fbfbfa;
  border-right: 1px solid rgba(55, 53, 47, 0.08);
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.nav-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 10px 4px;
}

.nav-head-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #8c8c8c;
  text-transform: uppercase;
}

.add-stage-btn {
  padding: 0;
  font-size: 12px;
  color: #2383e2;
}

.stage-nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.stage-nav-card {
  padding: 8px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.12s ease;
  border: 1px solid transparent;
}

.stage-nav-card:hover {
  background-color: rgba(55, 53, 47, 0.04);
}

.stage-nav-card.active {
  background-color: #ffffff;
  border-color: rgba(55, 53, 47, 0.12);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.card-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-indicator.TODO {
  background-color: #909399;
}
.dot-indicator.IN_PROGRESS {
  background-color: #e6a23c;
}
.dot-indicator.DONE {
  background-color: #67c23a;
}

.stage-nav-title {
  font-size: 13px;
  font-weight: 500;
  color: #37352f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta-line {
  margin-top: 3px;
  padding-left: 15px;
}

.task-count-hint {
  font-size: 11px;
  color: #8c8c8c;
}
</style>
