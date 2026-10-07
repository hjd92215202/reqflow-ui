<!-- src/features/requirement-workspace/components/Execution/TaskSubtasks.vue -->
<template>
  <div class="task-subtasks-pane">
    <div class="add-subtask-box">
      <el-input
        v-model="newChildTitle"
        placeholder="添加子任务项，按 Enter 确定..."
        size="small"
        @keyup.enter="handleAdd"
      >
        <template #append>
          <el-button @click="handleAdd">添加</el-button>
        </template>
      </el-input>
    </div>

    <div v-if="task.children && task.children.length > 0" class="subtask-list">
      <div
        v-for="child in task.children"
        :key="child.id"
        class="subtask-row"
        @click="emit('select-task', child)"
      >
        <div class="subtask-left">
          <span class="subtask-icon">↳</span>
          <span :class="['subtask-name', { 'is-done': child.status === 'DONE' }]">
            {{ child.title }}
          </span>
        </div>

        <div class="subtask-right" @click.stop>
          <el-tag
            size="small"
            class="clickable-status-tag"
            :type="child.status === 'DONE' ? 'success' : 'info'"
            @click="toggleChildStatus(child)"
          >
            {{ child.status === 'DONE' ? '✓ 完成' : '○ 待办' }}
          </el-tag>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无下级子任务" :image-size="50" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SubTask } from '@/types'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  task: SubTask
}>()

const emit = defineEmits<{
  (e: 'add-child', parentTask: SubTask, title: string): void
  (e: 'select-task', childTask: SubTask): void
  (e: 'update-child-status', childTask: SubTask): void
}>()

const newChildTitle = ref('')

const handleAdd = () => {
  if (!newChildTitle.value.trim()) {
    ElMessage.warning('子任务标题不能为空')
    return
  }
  emit('add-child', props.task, newChildTitle.value.trim())
  newChildTitle.value = ''
}

const toggleChildStatus = (child: SubTask) => {
  child.status = child.status === 'DONE' ? 'TODO' : 'DONE'
  emit('update-child-status', child)
}
</script>

<style scoped>
.task-subtasks-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background-color: #fbfbfa;
  border-radius: 4px;
  border: 1px solid rgba(55, 53, 47, 0.06);
  cursor: pointer;
  transition: all 0.12s ease;
}

.subtask-row:hover {
  background-color: #f0f7ff;
  border-color: #2383e2;
}

.subtask-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.subtask-icon {
  font-size: 12px;
  color: #8c8c8c;
}

.subtask-name {
  font-size: 12.5px;
  color: #37352f;
}

.subtask-name.is-done {
  text-decoration: line-through;
  color: #8c8c8c;
}

.clickable-status-tag {
  cursor: pointer;
  user-select: none;
}
</style>
