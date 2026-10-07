<!-- src/features/requirement-workspace/components/Execution/TaskMatrix.vue -->
<template>
  <div class="task-matrix-wrapper">
    <el-table
      ref="matrixTableRef"
      :data="tasks"
      row-key="id"
      default-expand-all
      :tree-props="{ children: 'children' }"
      :indent="24"
      class="matrix-tree-table"
      :highlight-current-row="true"
      @row-click="handleRowClick"
    >
      <!-- 1. 任务标题列 -->
      <el-table-column label="工作项" min-width="260">
        <template #default="scope">
          <div
            class="cell-title-box"
            :class="{ 'is-selected': selectedTaskId === scope.row.id }"
            @dblclick.stop="startInlineTitle(scope.row)"
          >
            <el-input
              v-if="editingTaskId === scope.row.id"
              v-model="scope.row.title"
              size="small"
              autofocus
              @blur="finishInlineTitle(scope.row)"
              @keyup.enter="finishInlineTitle(scope.row)"
              @click.stop
            />
            <span v-else :class="['task-title-text', { 'is-done': scope.row.status === 'DONE' }]">
              {{ scope.row.title }}
            </span>

            <span
              v-if="savingTaskId === scope.row.id"
              class="saving-spinner"
              title="正在保存变更..."
              >⟳</span
            >

            <el-tooltip
              v-if="getBlockedInfo(scope.row).isBlocked"
              :content="`🔒 被阻塞: 等待 [${getBlockedInfo(scope.row).blockingNames}]`"
              placement="top"
            >
              <span class="lock-icon">🔒</span>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>

      <!-- 2. 状态列 -->
      <el-table-column label="状态" width="120" align="center">
        <template #default="scope">
          <el-select
            v-model="scope.row.status"
            size="small"
            style="width: 100%"
            @change="emit('update-task', scope.row)"
            @click.stop
          >
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="已完成" value="DONE" />
          </el-select>
        </template>
      </el-table-column>

      <!-- 3. 负责人列 -->
      <el-table-column label="负责人" width="120" align="center">
        <template #default="scope">
          <span class="assignee-label">👤 {{ scope.row.assignee || '未分配' }}</span>
        </template>
      </el-table-column>

      <!-- 4. 排期 -->
      <el-table-column label="排期" width="160" align="center">
        <template #default="scope">
          <span class="date-label">
            {{
              scope.row.startDate
                ? `${scope.row.startDate.substring(5)} 至 ${scope.row.endDate ? scope.row.endDate.substring(5) : ''}`
                : '未定'
            }}
          </span>
        </template>
      </el-table-column>

      <!-- 5. 动态扩展列 -->
      <el-table-column
        v-for="colKey in visibleColumns"
        :key="colKey"
        :label="colKey"
        min-width="130"
      >
        <template #default="scope">
          <span class="custom-field-val">
            {{ scope.row.customFields?.[colKey] || '-' }}
          </span>
        </template>
      </el-table-column>

      <!-- 6. 行级操作 (规范第 30 条: More Menu) -->
      <el-table-column label="操作" width="110" align="center">
        <template #default="scope">
          <el-dropdown trigger="click" @click.stop>
            <el-button link size="small" class="more-action-btn"> ⋯ </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="emit('add-child', scope.row)">
                  ➕ 添加子任务
                </el-dropdown-item>
                <el-dropdown-item @click="emit('select-task', scope.row)">
                  🔍 检查器详情
                </el-dropdown-item>
                <el-dropdown-item
                  divided
                  style="color: #f56c6c"
                  @click="emit('delete-task', scope.row.id)"
                >
                  🗑️ 移除任务
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TableInstance } from 'element-plus'
import type { SubTask, TaskDependency } from '@/types'
import { checkTaskBlocked } from '../../composables/useTaskTree'

const props = defineProps<{
  tasks: SubTask[]
  allFlatTasks: SubTask[]
  dependencies: TaskDependency[]
  visibleColumns: string[]
  selectedTaskId: number | null
  savingTaskId?: number | null
}>()

const emit = defineEmits<{
  (e: 'select-task', task: SubTask): void
  (e: 'update-task', task: SubTask): void
  (e: 'add-child', parentTask: SubTask): void
  (e: 'delete-task', taskId: number): void
}>()

const matrixTableRef = ref<TableInstance | null>(null)
const editingTaskId = ref<number | null>(null)
const cachedTitle = ref('')

const handleRowClick = (row: SubTask) => {
  emit('select-task', row)
}

const startInlineTitle = (row: SubTask) => {
  editingTaskId.value = row.id
  cachedTitle.value = row.title
}

const finishInlineTitle = (row: SubTask) => {
  editingTaskId.value = null
  const newT = row.title.trim()
  if (!newT) {
    row.title = cachedTitle.value
    return
  }
  if (newT !== cachedTitle.value) {
    emit('update-task', row)
  }
}

const getBlockedInfo = (task: SubTask) => {
  return checkTaskBlocked(task, props.allFlatTasks, props.dependencies)
}

// 展开/收起全部行
const setExpandAll = (expand: boolean) => {
  if (!matrixTableRef.value) return
  const toggleRows = (rows: SubTask[]) => {
    for (const r of rows) {
      matrixTableRef.value?.toggleRowExpansion(r, expand)
      if (r.children && r.children.length > 0) {
        toggleRows(r.children)
      }
    }
  }
  toggleRows(props.tasks)
}

defineExpose({
  setExpandAll
})
</script>

<style scoped>
.task-matrix-wrapper {
  flex: 1;
  overflow: auto;
}

.matrix-tree-table {
  width: 100%;
}

.cell-title-box {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
}

.cell-title-box.is-selected {
  background-color: rgba(35, 131, 226, 0.08);
}

.task-title-text {
  font-size: 13px;
  color: #37352f;
}

.task-title-text.is-done {
  text-decoration: line-through;
  color: #8c8c8c;
}

.saving-spinner {
  display: inline-block;
  font-size: 13px;
  color: #2383e2;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.lock-icon {
  font-size: 12px;
}

.assignee-label,
.date-label,
.custom-field-val {
  font-size: 12px;
  color: #5f5e5b;
}

.more-action-btn {
  font-size: 16px;
  font-weight: 700;
  color: #8c8c8c;
  padding: 2px 6px;
}

.more-action-btn:hover {
  color: #2383e2;
}
</style>
