<!-- src/features/requirement-workspace/components/Execution/TaskWorkspace.vue -->
<template>
  <div ref="workspaceContainerRef" class="task-workspace-main">
    <div class="matrix-pane-col">
      <TaskToolbar
        :filters="filters"
        :all-columns="allColumns"
        :visible-columns="visibleColumns"
        @update-filter="payload => emit('update-filter', payload)"
        @reset-filters="emit('reset-filters')"
        @create-task="createDialogVisible = true"
        @add-new-column="emit('add-new-column')"
        @toggle-expand="expand => matrixRef?.setExpandAll(expand)"
        @update:visible-columns="cols => (visibleColumns = cols)"
      />

      <TaskMatrix
        ref="matrixRef"
        :tasks="filteredTasks"
        :all-flat-tasks="allFlatTasks"
        :dependencies="dependencies"
        :visible-columns="visibleColumns"
        :selected-task-id="selectedTaskId"
        :saving-task-id="savingTaskId"
        @select-task="t => emit('select-task', t)"
        @update-task="t => emit('update-task', t)"
        @add-child="p => emit('add-child', p)"
        @delete-task="id => emit('delete-task', id)"
      />
    </div>

    <!-- 1. 宽屏模式：内联 340px 固定面板 -->
    <TaskInspector
      v-if="selectedTask && !isNarrowScreen"
      :task="selectedTask"
      :all-flat-tasks="allFlatTasks"
      :dependencies="dependencies"
      @close="emit('close-inspector')"
      @select-task="t => emit('select-task', t)"
      @update-task="t => emit('update-task', t)"
      @add-child="(p, title) => emit('add-child-with-title', p, title)"
      @add-dep="pId => emit('add-dep', pId)"
      @remove-dep="dId => emit('remove-dep', dId)"
    />

    <!-- 2. 小窗口模式：自适应变为 Drawer 抽屉 -->
    <el-drawer
      v-if="isNarrowScreen"
      :model-value="Boolean(selectedTask)"
      :title="selectedTask ? `TASK-${selectedTask.id}` : ''"
      size="380px"
      append-to-body
      destroy-on-close
      @close="emit('close-inspector')"
    >
      <TaskInspector
        v-if="selectedTask"
        class="drawer-inspector-body"
        :task="selectedTask"
        :all-flat-tasks="allFlatTasks"
        :dependencies="dependencies"
        @close="emit('close-inspector')"
        @select-task="t => emit('select-task', t)"
        @update-task="t => emit('update-task', t)"
        @add-child="(p, title) => emit('add-child-with-title', p, title)"
        @add-dep="pId => emit('add-dep', pId)"
        @remove-dep="dId => emit('remove-dep', dId)"
      />
    </el-drawer>

    <TaskCreate v-model="createDialogVisible" @submit="payload => emit('create-task', payload)" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { SubTask, TaskDependency, TaskFilters } from '@/types'
import TaskToolbar from './TaskToolbar.vue'
import TaskMatrix from './TaskMatrix.vue'
import TaskInspector from './TaskInspector.vue'
import TaskCreate from './TaskCreate.vue'

defineProps<{
  filteredTasks: SubTask[]
  allFlatTasks: SubTask[]
  dependencies: TaskDependency[]
  allColumns: string[]
  filters: TaskFilters
  selectedTaskId: number | null
  selectedTask: SubTask | null
  savingTaskId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update-filter', payload: Partial<TaskFilters>): void
  (e: 'reset-filters'): void
  (e: 'add-new-column'): void
  (e: 'select-task', task: SubTask): void
  (e: 'close-inspector'): void
  (e: 'update-task', task: SubTask): void
  (e: 'add-child', parentTask: SubTask): void
  (e: 'add-child-with-title', parentTask: SubTask, title: string): void
  (e: 'delete-task', taskId: number): void
  (e: 'create-task', payload: { title: string; assignee: string }): void
  (e: 'add-dep', predId: number): void
  (e: 'remove-dep', depId: number): void
}>()

const matrixRef = ref<InstanceType<typeof TaskMatrix> | null>(null)
const workspaceContainerRef = ref<HTMLDivElement | null>(null)
const visibleColumns = ref<string[]>([])
const createDialogVisible = ref(false)
const isNarrowScreen = ref(false)

const checkScreenResize = () => {
  isNarrowScreen.value = window.innerWidth < 1200
}

onMounted(() => {
  checkScreenResize()
  window.addEventListener('resize', checkScreenResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScreenResize)
})
</script>

<style scoped>
.task-workspace-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.matrix-pane-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.drawer-inspector-body {
  width: 100% !important;
  border-left: none !important;
}
</style>
