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

      <div class="stage-task-summary">
        <div class="summary-copy">
          <template v-if="allFlatTasks.length">
            <strong>{{ allFlatTasks.length }}</strong>
            <span>项工作项</span>
            <span v-if="visibleTaskCount !== allFlatTasks.length" class="visible-count">
              当前显示 {{ visibleTaskCount }} 项
            </span>
          </template>
          <span v-else class="empty-summary">本阶段还没有工作项</span>
        </div>
        <div v-if="allFlatTasks.length" class="summary-statuses">
          <span><i class="status-dot todo-dot"></i>{{ taskStatusCounts.todo }} 待处理</span>
          <span
            ><i class="status-dot progress-dot"></i>{{ taskStatusCounts.inProgress }} 进行中</span
          >
          <span><i class="status-dot done-dot"></i>{{ taskStatusCounts.done }} 已完成</span>
        </div>
        <el-button type="primary" plain size="small" @click="createDialogVisible = true">
          {{ allFlatTasks.length ? '+ 新建工作项' : '创建第一个工作项' }}
        </el-button>
      </div>
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

    <TaskCreate
      v-model="createDialogVisible"
      @submit="(payload, complete) => emit('create-task', payload, complete)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { SubTask, TaskDependency, TaskFilters, TaskCreatePayload } from '@/types'
import TaskToolbar from './TaskToolbar.vue'
import TaskMatrix from './TaskMatrix.vue'
import TaskInspector from './TaskInspector.vue'
import TaskCreate from './TaskCreate.vue'

const props = defineProps<{
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
  (e: 'update-filter', payload: Partial<TaskFilters>): void
  (e: 'reset-filters'): void
  (e: 'add-new-column'): void
  (e: 'select-task', task: SubTask): void
  (e: 'close-inspector'): void
  (e: 'update-task', task: SubTask): void
  (e: 'add-child', parentTask: SubTask): void
  (e: 'add-child-with-title', parentTask: SubTask, title: string): void
  (e: 'delete-task', taskId: number): void
  (e: 'create-task', payload: TaskCreatePayload, complete: (saved: boolean) => void): void
  (e: 'add-dep', predId: number): void
  (e: 'remove-dep', depId: number): void
}>()

const matrixRef = ref<InstanceType<typeof TaskMatrix> | null>(null)
const workspaceContainerRef = ref<HTMLDivElement | null>(null)
const visibleColumns = ref<string[]>([])
const createDialogVisible = ref(false)
const isNarrowScreen = ref(false)
let restoringColumns = false

const visibleTaskCount = computed(() => {
  const count = (tasks: SubTask[]): number =>
    tasks.reduce((total, task) => total + 1 + count(task.children || []), 0)
  return count(props.filteredTasks)
})

const taskStatusCounts = computed(() => ({
  todo: props.allFlatTasks.filter(task => task.status === 'TODO').length,
  inProgress: props.allFlatTasks.filter(task => task.status === 'IN_PROGRESS').length,
  done: props.allFlatTasks.filter(task => task.status === 'DONE').length
}))

watch(
  () => props.columnPreferenceKey,
  key => {
    restoringColumns = true
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]')
      visibleColumns.value = Array.isArray(saved)
        ? saved.filter((item: unknown) => typeof item === 'string')
        : []
    } catch {
      visibleColumns.value = []
    }
    nextTick(() => {
      restoringColumns = false
    })
  },
  { immediate: true }
)

watch(visibleColumns, columns => {
  if (!restoringColumns && props.columnPreferenceKey) {
    localStorage.setItem(props.columnPreferenceKey, JSON.stringify(columns))
  }
})

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
  background: #f6f8fb;
}

.stage-task-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin: 0 12px 12px;
  padding: 10px 14px;
  color: #667085;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 8px;
  font-size: 12px;
}

.summary-copy,
.summary-statuses,
.summary-statuses span {
  display: flex;
  align-items: center;
}

.summary-copy {
  gap: 5px;
}

.summary-copy strong {
  color: #344054;
  font-size: 14px;
}

.visible-count {
  margin-left: 8px;
  color: #98a2b3;
}

.empty-summary {
  color: #8a94a3;
}

.summary-statuses {
  flex-wrap: wrap;
  gap: 14px;
}

.summary-statuses span {
  gap: 5px;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.todo-dot {
  background: #a8abb2;
}

.progress-dot {
  background: #e6a23c;
}

.done-dot {
  background: #67c23a;
}

.drawer-inspector-body {
  width: 100% !important;
  border-left: none !important;
}

@media (max-width: 760px) {
  .stage-task-summary {
    align-items: flex-start;
  }

  .summary-statuses {
    order: 3;
    width: 100%;
  }
}
</style>
