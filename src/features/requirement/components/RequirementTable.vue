<!-- src/features/requirement/components/RequirementTable.vue -->
<template>
  <div ref="tableWrapperRef" class="requirement-table-container">
    <el-table
      v-loading="loading"
      :data="data"
      style="width: 100%; margin-top: 15px"
      border
      stripe
      :row-class-name="tableRowClassName"
    >
      <!-- 1. 鼠标按住手柄实时拖动排序 -->
      <el-table-column width="60" align="center" label="排序">
        <template #default="scope">
          <div class="drag-handle-wrapper">
            <span
              class="drag-handle"
              title="按住此手柄上下滑动调整顺序"
              @mousedown="startRowDrag(scope.$index, $event)"
            >
              ⋮⋮
            </span>
          </div>
        </template>
      </el-table-column>

      <!-- 2. 基础属性列 -->
      <el-table-column prop="title" label="需求标题" min-width="150" show-overflow-tooltip />
      <el-table-column prop="description" label="核心描述" min-width="180" show-overflow-tooltip />

      <el-table-column label="排期起止" width="220">
        <template #default="scope">
          <span v-if="scope.row.startDate || scope.row.endDate" class="date-text">
            {{ scope.row.startDate || '未定' }} 至 {{ scope.row.endDate || '未定' }}
          </span>
          <span v-else class="date-text-none">暂无排期</span>
        </template>
      </el-table-column>

      <el-table-column prop="priority" label="优先级" width="90" align="center">
        <template #default="scope">
          <el-tag :type="getPriorityTag(scope.row.priority)" size="small">
            {{ scope.row.priority }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="status" label="进展状态" width="100" align="center">
        <template #default="scope">
          <el-tag :type="getStatusTag(scope.row.status)" size="small">
            {{ formatStatus(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 3. 阶段完成度 (迷你进度条与徽章) -->
      <el-table-column label="阶段完成度" min-width="170" align="center">
        <template #default="scope">
          <div
            v-if="stageStats[scope.row.id] && stageStats[scope.row.id].total > 0"
            class="progress-cell"
          >
            <span class="progress-badge-text">
              📍 {{ stageStats[scope.row.id].done }} /
              {{ stageStats[scope.row.id].total }} 阶段已完成
            </span>
            <el-progress
              :percentage="stageStats[scope.row.id].percent"
              :status="stageStats[scope.row.id].percent === 100 ? 'success' : ''"
              :stroke-width="6"
              :show-text="false"
            />
          </div>
          <span v-else class="date-text-none">暂无阶段</span>
        </template>
      </el-table-column>

      <!-- 4. 操作面板 -->
      <el-table-column label="操作" width="176" align="center" fixed="right">
        <template #default="scope">
          <el-button size="small" type="primary" @click="goToWorkspace(scope.row.id, 'overview')">
            打开工作区
          </el-button>
          <el-dropdown
            trigger="click"
            @command="(command: string | number | object) => handleRowAction(command, scope.row)"
          >
            <el-button link class="more-actions" aria-label="更多需求操作" title="更多操作">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="execution">直接进入执行</el-dropdown-item>
                <el-dropdown-item command="wiki">打开关联 Wiki</el-dropdown-item>
                <el-dropdown-item command="edit">编辑需求</el-dropdown-item>
                <el-dropdown-item command="delete" divided class="danger-action">
                  删除需求
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
import type { Requirement, PriorityLevel, RequirementStatus } from '@/types'
import { useRouter } from 'vue-router'
import { MoreFilled } from '@element-plus/icons-vue'

const router = useRouter()

const goToWorkspace = (reqId: number, tab: 'overview' | 'execution') => {
  router.push({
    path: `/requirements/${reqId}`,
    query: { tab }
  })
}

const handleRowAction = (command: string | number | object, row: Requirement) => {
  switch (command) {
    case 'execution':
      goToWorkspace(row.id, 'execution')
      break
    case 'wiki':
      emit('go-wiki', row.id)
      break
    case 'edit':
      emit('edit', row)
      break
    case 'delete':
      emit('delete', row.id)
      break
  }
}
export interface StageStat {
  total: number
  done: number
  percent: number
}

const props = defineProps<{
  data: Requirement[]
  loading: boolean
  stageStats: Record<number, StageStat>
}>()

const emit = defineEmits<{
  (e: 'drag-end', list: Requirement[]): void
  (e: 'go-matrix', reqId: number): void
  (e: 'go-wiki', reqId: number): void
  (e: 'edit', row: Requirement): void
  (e: 'delete', id: number): void
}>()

const tableWrapperRef = ref<HTMLDivElement | null>(null)
const activeDragIndex = ref<number | null>(null)

const tableRowClassName = ({ rowIndex }: { rowIndex: number }) => {
  return activeDragIndex.value === rowIndex ? 'dragging-row' : ''
}

// 核心解耦：基于组件私有根节点进行高精度计算
const startRowDrag = (startIndex: number, event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()

  activeDragIndex.value = startIndex
  document.body.style.cursor = 'grabbing'
  document.body.style.userSelect = 'none'

  const currentList = [...props.data]

  const handleMouseMove = (e: MouseEvent) => {
    if (activeDragIndex.value === null || !tableWrapperRef.value) return
    const rows = tableWrapperRef.value.querySelectorAll('.el-table__body-wrapper tbody tr')
    rows.forEach((rowEl, targetIndex) => {
      const rect = rowEl.getBoundingClientRect()
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const fromIndex = activeDragIndex.value
        if (fromIndex !== null && fromIndex !== targetIndex) {
          const movedItem = currentList.splice(fromIndex, 1)[0]
          currentList.splice(targetIndex, 0, movedItem)
          activeDragIndex.value = targetIndex
        }
      }
    })
  }

  const handleMouseUp = () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)

    if (activeDragIndex.value !== null) {
      emit('drag-end', currentList)
      activeDragIndex.value = null
    }
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

const getPriorityTag = (p: PriorityLevel): 'danger' | 'warning' | 'info' => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const getStatusTag = (
  s: RequirementStatus
): 'success' | 'warning' | 'primary' | 'danger' | 'info' => {
  switch (s) {
    case 'TODO':
      return 'info'
    case 'IN_PROGRESS':
      return 'warning'
    case 'TESTING':
      return 'primary'
    case 'DONE':
      return 'success'
    case 'SUSPENDED':
      return 'danger'
    default:
      return 'info'
  }
}

const formatStatus = (status: RequirementStatus): string => {
  const statusMap: Record<RequirementStatus, string> = {
    TODO: '待处理',
    IN_PROGRESS: '进行中',
    TESTING: '测试中',
    DONE: '已完成',
    SUSPENDED: '已挂起'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.requirement-table-container {
  width: 100%;
}

.drag-handle-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.drag-handle {
  font-size: 16px;
  color: #909399;
  cursor: grab;
  user-select: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.drag-handle:hover {
  background-color: rgba(35, 131, 226, 0.12);
  color: #2383e2;
}

.drag-handle:active {
  cursor: grabbing;
}

:deep(.dragging-row) {
  background-color: #e6f7ff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.date-text {
  font-size: 13px;
  color: #606266;
}

.date-text-none {
  font-size: 13px;
  color: #c0c4cc;
  font-style: italic;
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 4px;
}

.progress-badge-text {
  font-size: 11px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.more-actions {
  width: 30px;
  height: 30px;
  margin-left: 4px;
  color: #73726e;
}

.more-actions:hover {
  color: #2383e2;
  background: rgba(35, 131, 226, 0.08);
}

:deep(.danger-action) {
  color: #df4331;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 0 !important;
}
</style>
