<!-- src/features/todo/components/TodoItemRow.vue -->
<template>
  <div
    :class="[
      'todo-item-row',
      {
        'is-done': item.status === 'DONE',
        'is-progress': item.status === 'IN_PROGRESS',
        'is-project': item.isProjectTask
      }
    ]"
  >
    <!-- 1. 自定义打勾圆圈 -->
    <div class="check-box-wrapper" @click="emit('toggle', item)">
      <span :class="['custom-check', { checked: item.status === 'DONE' }]">
        <span v-if="item.status === 'DONE'" class="check-mark">✓</span>
      </span>
    </div>

    <!-- 2. 标题与属性标签 -->
    <div class="todo-content-block" @click="emit('edit', item)">
      <span class="todo-title-text">{{ item.title }}</span>
      <p v-if="item.description" class="todo-desc-text">{{ item.description }}</p>

      <div class="todo-meta-tags">
        <!-- 需求待办的项目关联徽章 (支持一键跳转) -->
        <el-tag
          v-if="item.isProjectTask"
          type="primary"
          size="small"
          class="project-badge"
          @click.stop="goToMatrix"
        >
          📌 关联需求：[{{ item.requirementTitle || '未命名需求' }}] ➔
          {{ item.stageTitle || '未命名阶段' }}
        </el-tag>

        <!-- 状态 Tag -->
        <el-tag :type="getStatusTagType(item.status)" size="small">
          {{ formatStatus(item.status) }}
        </el-tag>

        <!-- 优先级 Tag -->
        <el-tag :type="getPriorityTagType(item.priority)" size="small">
          {{ formatPriority(item.priority) }}
        </el-tag>

        <!-- 截止日期 Tag -->
        <span v-if="item.dueDate" :class="['date-tag', { 'is-overdue': isOverdue(item) }]">
          📅 {{ item.dueDate }} {{ isOverdue(item) ? '(已逾期)' : '' }}
        </span>
      </div>
    </div>

    <!-- 3. 右侧操作面板 -->
    <div class="todo-actions-block">
      <el-button type="primary" link size="small" @click="emit('edit', item)">编辑</el-button>
      <el-button type="danger" link size="small" @click="emit('delete', item)">删除</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { TodoItem, PriorityLevel, TaskStatus } from '@/types'

const props = defineProps<{
  item: TodoItem
}>()

const emit = defineEmits<{
  (e: 'toggle', item: TodoItem): void
  (e: 'edit', item: TodoItem): void
  (e: 'delete', item: TodoItem): void
}>()

const router = useRouter()

const goToMatrix = () => {
  if (props.item.requirementId) {
    router.push({
      path: '/matrix',
      query: { reqId: props.item.requirementId }
    })
  }
}

const isOverdue = (todo: TodoItem): boolean => {
  if (!todo.dueDate || todo.status === 'DONE') return false
  const today = new Date().toISOString().split('T')[0]
  return todo.dueDate < today
}

const getPriorityTagType = (p: PriorityLevel): 'danger' | 'warning' | 'info' => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const formatPriority = (p: PriorityLevel): string => {
  if (p === 'HIGH') return '高优'
  if (p === 'MEDIUM') return '中优'
  return '低优'
}

const getStatusTagType = (s: TaskStatus): 'success' | 'warning' | 'info' => {
  if (s === 'DONE') return 'success'
  if (s === 'IN_PROGRESS') return 'warning'
  return 'info'
}

const formatStatus = (s: TaskStatus): string => {
  if (s === 'DONE') return '已完成'
  if (s === 'IN_PROGRESS') return '进行中'
  return '待处理'
}
</script>

<style scoped>
.todo-item-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid rgba(55, 53, 47, 0.08);
  background-color: #ffffff;
  transition: all 0.15s ease-in-out;
}

.todo-item-row.is-project {
  border-left: 3px solid #2383e2;
}

.todo-item-row:hover {
  background-color: #fcfcfb;
  border-color: #2383e2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.todo-item-row.is-done {
  opacity: 0.6;
  background-color: #fafafa;
}

.todo-item-row.is-done .todo-title-text {
  text-decoration: line-through;
  color: #8c8c8c;
}

.check-box-wrapper {
  cursor: pointer;
  padding: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.custom-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.custom-check:hover {
  border-color: #2383e2;
}

.custom-check.checked {
  background-color: #0d7c50;
  border-color: #0d7c50;
}

.check-mark {
  color: #ffffff;
  font-size: 11px;
  font-weight: bold;
}

.todo-content-block {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-title-text {
  font-size: 14px;
  color: #37352f;
  font-weight: 500;
}

.todo-desc-text {
  margin: 2px 0;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.todo-meta-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.project-badge {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.project-badge:hover {
  opacity: 0.85;
}

.date-tag {
  font-size: 11px;
  color: #8c8c8c;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}

.date-tag.is-overdue {
  color: #df4331;
  background-color: #ffe2dd;
  font-weight: 600;
}

.todo-actions-block {
  display: flex;
  gap: 8px;
}
</style>
