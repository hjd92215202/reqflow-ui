<!-- src/features/requirement-workspace/components/Execution/RequirementExecution.vue -->
<template>
  <div class="req-execution-layout">
    <StageNavigator
      :stages="stages"
      :current-stage-id="currentStageId"
      @select-stage="id => emit('select-stage', id)"
      @create-stage="emit('create-stage')"
    />

    <div v-if="currentStageId" class="execution-content-area">
      <TaskWorkspace
        :filtered-tasks="filteredTasks"
        :all-flat-tasks="allFlatTasks"
        :dependencies="dependencies"
        :all-columns="allColumns"
        :column-preference-key="columnPreferenceKey"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        :selected-task="selectedTask"
        :saving-task-id="savingTaskId"
        @update-filter="p => emit('update-filter', p)"
        @reset-filters="emit('reset-filters')"
        @add-new-column="emit('add-new-column')"
        @select-task="t => emit('select-task', t)"
        @close-inspector="emit('close-inspector')"
        @update-task="t => emit('update-task', t)"
        @add-child="p => emit('add-child', p)"
        @add-child-with-title="(p, title) => emit('add-child-with-title', p, title)"
        @delete-task="id => emit('delete-task', id)"
        @create-task="(payload, complete) => emit('create-task', payload, complete)"
        @add-dep="pId => emit('add-dep', pId)"
        @remove-dep="dId => emit('remove-dep', dId)"
      />
    </div>

    <el-empty
      v-else
      class="empty-execution-state"
      description="请在左侧选择一个执行阶段，或点击【➕】新增阶段"
      :image-size="80"
    />
  </div>
</template>

<script setup lang="ts">
import type { Stage, SubTask, TaskDependency, TaskFilters } from '@/types'
import StageNavigator from './StageNavigator.vue'
import TaskWorkspace from './TaskWorkspace.vue'

defineProps<{
  stages: Stage[]
  currentStageId: number | null
  filteredTasks: SubTask[]
  allFlatTasks: SubTask[]
  dependencies: TaskDependency[]
  allColumns: string[]
  columnPreferenceKey: string
  filters: TaskFilters
  selectedTaskId: number | null
  selectedTask: SubTask | null
  savingTaskId?: number | null
}>()

const emit = defineEmits<{
  (e: 'select-stage', stageId: number): void
  (e: 'create-stage'): void
  (e: 'update-filter', payload: Partial<TaskFilters>): void
  (e: 'reset-filters'): void
  (e: 'add-new-column'): void
  (e: 'select-task', task: SubTask): void
  (e: 'close-inspector'): void
  (e: 'update-task', task: SubTask): void
  (e: 'add-child', parentTask: SubTask): void
  (e: 'add-child-with-title', parentTask: SubTask, title: string): void
  (e: 'delete-task', taskId: number): void
  (
    e: 'create-task',
    payload: { title: string; assignee: string },
    complete: (saved: boolean) => void
  ): void
  (e: 'add-dep', predId: number): void
  (e: 'remove-dep', depId: number): void
}>()
</script>

<style scoped>
.req-execution-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: 100%;
}

.execution-content-area {
  flex: 1;
  display: flex;
  min-width: 0;
  overflow: hidden;
}

.empty-execution-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
