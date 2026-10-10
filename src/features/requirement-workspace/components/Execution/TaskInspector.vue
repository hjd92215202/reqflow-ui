<!-- src/features/requirement-workspace/components/Execution/TaskInspector.vue -->
<template>
  <aside class="task-inspector-panel">
    <div class="inspector-header">
      <div class="inspector-header-content">
        <span class="inspector-badge">TASK-{{ task.id }}</span>
        <span class="inspector-save-hint">离开字段后自动保存</span>
        <h2 class="inspector-task-title" :title="task.title">{{ task.title }}</h2>
      </div>
      <el-button link class="close-inspector-btn" @click="emit('close')"> ✕ </el-button>
    </div>

    <!-- Inspector 内部二级导航 -->
    <div class="inspector-tabs-nav">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'detail'"
        :class="['insp-tab', { active: activeTab === 'detail' }]"
        @click="activeTab = 'detail'"
      >
        详情
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'subtasks'"
        :class="['insp-tab', { active: activeTab === 'subtasks' }]"
        @click="activeTab = 'subtasks'"
      >
        子任务
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'dependencies'"
        :class="['insp-tab', { active: activeTab === 'dependencies' }]"
        @click="activeTab = 'dependencies'"
      >
        依赖
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'activity'"
        :class="['insp-tab', { active: activeTab === 'activity' }]"
        @click="activeTab = 'activity'"
      >
        活动
      </button>
    </div>

    <div class="inspector-body">
      <TaskDetail
        v-show="activeTab === 'detail'"
        :task="task"
        @update-task="t => emit('update-task', t)"
      />
      <TaskSubtasks
        v-if="activeTab === 'subtasks'"
        :task="task"
        @add-child="(p, title) => emit('add-child', p, title)"
        @select-task="t => emit('select-task', t)"
        @update-child-status="t => emit('update-task', t)"
      />
      <TaskDependencies
        v-else-if="activeTab === 'dependencies'"
        :task="task"
        :all-flat-tasks="allFlatTasks"
        :dependencies="dependencies"
        @add-dep="pId => emit('add-dep', pId)"
        @remove-dep="dId => emit('remove-dep', dId)"
      />
      <TaskActivity v-else-if="activeTab === 'activity'" :task="task" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SubTask, TaskDependency } from '@/types'
import TaskDetail from './TaskDetail.vue'
import TaskSubtasks from './TaskSubtasks.vue'
import TaskDependencies from './TaskDependencies.vue'
import TaskActivity from './TaskActivity.vue'

defineProps<{
  task: SubTask
  allFlatTasks: SubTask[]
  dependencies: TaskDependency[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-task', task: SubTask): void
  (e: 'update-task', task: SubTask): void
  (e: 'add-child', parentTask: SubTask, title: string): void
  (e: 'add-dep', predId: number): void
  (e: 'remove-dep', depId: number): void
}>()

const activeTab = ref<'detail' | 'subtasks' | 'dependencies' | 'activity'>('detail')
</script>

<style scoped>
.task-inspector-panel {
  width: 340px;
  min-width: 320px;
  background-color: #ffffff;
  border-left: 1px solid rgba(55, 53, 47, 0.08);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.inspector-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(55, 53, 47, 0.06);
}

.inspector-header-content {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 3px 10px;
  min-width: 0;
}

.inspector-badge {
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: #8c8c8c;
}

.inspector-save-hint {
  justify-self: end;
  color: #98a2b3;
  font-size: 10px;
  white-space: nowrap;
}

.inspector-task-title {
  grid-column: 1 / -1;
  display: -webkit-box;
  margin: 3px 0 0;
  overflow: hidden;
  color: #344054;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.close-inspector-btn {
  font-size: 13px;
  color: #8c8c8c;
  padding: 0;
}

.inspector-tabs-nav {
  display: flex;
  border-bottom: 1px solid rgba(55, 53, 47, 0.06);
  padding: 0 16px;
  gap: 16px;
}

.insp-tab {
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  padding: 8px 0;
  color: #8c8c8c;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-weight: 500;
}

.insp-tab:focus-visible {
  outline: 2px solid rgba(35, 131, 226, 0.55);
  outline-offset: 2px;
}

.insp-tab.active {
  color: #2383e2;
  border-bottom-color: #2383e2;
  font-weight: 600;
}

.inspector-body {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
}
</style>
