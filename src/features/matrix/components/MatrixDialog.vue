<!-- src/features/matrix/components/MatrixDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    :title="stage ? `📍 协同矩阵 · ${stage.title}` : '阶段协同矩阵'"
    width="94%"
    top="3vh"
    destroy-on-close
    class="matrix-dialog-wrapper"
  >
    <div v-if="stage" class="stage-table-block">
      <!-- 弹窗顶栏信息与状态切换 -->
      <div class="stage-block-header">
        <div class="stage-title-left">
          <span class="block-stage-prefix">📍 阶段：</span>
          <span class="block-stage-name">{{ stage.title }}</span>
          <span class="block-stage-dates" style="margin-left: 12px">
            排期：{{ stage.startDate || '未定' }} 至 {{ stage.endDate || '未定' }}
          </span>
        </div>
        <div class="stage-title-right">
          <el-radio-group
            :model-value="stage.status"
            size="small"
            @change="handleStageStatusChange"
          >
            <el-radio-button value="TODO">待处理</el-radio-button>
            <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
            <el-radio-button value="DONE">已完成</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 树形 Excel 协同表格 -->
      <el-table
        :data="paginatedTasks"
        border
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children' }"
        :indent="28"
        class="excel-table-style"
        @filter-change="handleFilterChange"
      >
        <!-- 1. 任务标题列 (双击原地编辑 + 依赖阻塞感知) -->
        <el-table-column label="任务与子项内容 (双击编辑 / 回车保存)" min-width="280">
          <template #default="scope">
            <div class="inline-edit-cell" @dblclick.stop="startTitleEdit(scope.row)">
              <div class="title-with-badge">
                <el-input
                  v-if="editingTitleTaskId === scope.row.id"
                  v-model="scope.row.title"
                  size="small"
                  autofocus
                  @blur="finishTitleEdit(scope.row)"
                  @keyup.enter="finishTitleEdit(scope.row)"
                />
                <span
                  v-else
                  :class="['cell-text', { 'completed-style': scope.row.status === 'DONE' }]"
                >
                  {{ scope.row.title }}
                </span>

                <!-- 依赖阻塞智能告警徽章 -->
                <el-tooltip
                  v-if="getBlockedInfo(scope.row).isBlocked"
                  :content="`⚠️ 依赖阻塞: 需等待前置任务 [${getBlockedInfo(scope.row).blockingNames}] 完成`"
                  placement="top"
                >
                  <el-tag size="small" type="danger" class="blocked-tag">⚠️ 阻塞</el-tag>
                </el-tooltip>
              </div>

              <el-button
                class="add-sub-child-btn"
                size="small"
                type="primary"
                link
                @click.stop="handleInlineAddChild(scope.row)"
              >
                + 拆解子项
              </el-button>
            </div>
          </template>
        </el-table-column>

        <!-- 2. 状态列 -->
        <el-table-column
          label="状态"
          width="130"
          align="center"
          column-key="status"
          :filters="[
            { text: '待处理', value: 'TODO' },
            { text: '进行中', value: 'IN_PROGRESS' },
            { text: '已完成', value: 'DONE' }
          ]"
        >
          <template #default="scope">
            <el-select
              v-model="scope.row.status"
              size="small"
              style="width: 100%"
              @change="saveSubTask(scope.row)"
            >
              <el-option label="待处理" value="TODO" />
              <el-option label="进行中" value="IN_PROGRESS" />
              <el-option label="已完成" value="DONE" />
            </el-select>
          </template>
        </el-table-column>

        <!-- 3. 负责人列 -->
        <el-table-column
          label="负责人"
          width="135"
          align="center"
          column-key="assignee"
          :filters="assigneeFilters"
        >
          <template #default="scope">
            <div class="inline-edit-cell" @dblclick.stop="startAssigneeEdit(scope.row)">
              <el-input
                v-if="editingAssigneeTaskId === scope.row.id"
                v-model="scope.row.assignee"
                size="small"
                autofocus
                @blur="finishAssigneeEdit(scope.row)"
                @keyup.enter="finishAssigneeEdit(scope.row)"
              />
              <span v-else class="assignee-tag">👤 {{ scope.row.assignee || '未分配' }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 4. 起止排期 -->
        <el-table-column label="起止排期" width="200" align="center">
          <template #default="scope">
            <div
              class="inline-edit-cell date-cell"
              @dblclick.stop="editingDateTaskId = scope.row.id"
            >
              <el-date-picker
                v-if="editingDateTaskId === scope.row.id"
                v-model="scope.row.dateRange"
                type="daterange"
                range-separator="-"
                start-placeholder="始"
                end-placeholder="止"
                size="small"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                @change="finishDateEdit(scope.row)"
                @blur="editingDateTaskId = null"
              />
              <span v-else class="date-preview-text">
                📅
                {{
                  scope.row.startDate && scope.row.endDate
                    ? `${scope.row.startDate} 至 ${scope.row.endDate}`
                    : '暂无排期'
                }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 5. 动态 JSONB 扩展列 -->
        <el-table-column
          v-for="key in stageColumns"
          :key="key"
          :column-key="key"
          min-width="150"
          :filters="getCustomColumnFilters(key)"
        >
          <template #header>
            <div class="custom-header-cell">
              <span class="custom-header-title" :title="key">{{ key }}</span>
              <el-tooltip content="删除此整列" placement="top" :show-after="200">
                <span class="header-delete-btn" @click.stop="handleDeleteColumn(key)">✕</span>
              </el-tooltip>
            </div>
          </template>
          <template #default="scope">
            <div class="inline-edit-cell" @dblclick.stop="startCustomFieldEdit(scope.row, key)">
              <el-input
                v-if="editingCustomField.taskId === scope.row.id && editingCustomField.key === key"
                v-model="scope.row.customFields[key]"
                size="small"
                autofocus
                @blur="finishCustomFieldEdit(scope.row, key)"
                @keyup.enter="finishCustomFieldEdit(scope.row, key)"
                @keyup.esc="cancelCustomFieldEdit(scope.row, key)"
              />
              <span
                v-else
                :class="['custom-field-text', { 'is-empty': !scope.row.customFields?.[key] }]"
                @click="startCustomFieldEdit(scope.row, key)"
              >
                {{ scope.row.customFields?.[key] || '添加内容...' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 6. 表头末尾 [+ 新增列] -->
        <el-table-column width="50" align="center" :resizable="false">
          <template #header>
            <el-tooltip content="点击向矩阵追加自定义属性列" placement="top" :show-after="300">
              <div class="add-column-header-btn" @click="promptAddColumn">➕</div>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 7. 操作列 -->
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="openDepManager(scope.row)">
              🔗 依赖
            </el-button>
            <el-button type="danger" link size="small" @click="handleDeleteTask(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 快速添加行 -->
      <div class="excel-quick-append-row">
        <span class="append-tag">➕ 添加行</span>
        <el-input
          v-model="quickTitle"
          placeholder="添加一级子任务..."
          size="small"
          style="flex: 3 !important; margin-right: 12px"
        />
        <el-input
          v-model="quickAssignee"
          placeholder="负责人"
          size="small"
          style="flex: 1 !important; margin-right: 12px"
        />
        <el-button type="primary" size="small" @click="handleQuickAdd">确定添加</el-button>
      </div>

      <!-- 底部分页（明确展示一级任务项计数） -->
      <div class="pagination-wrapper" style="margin-top: 15px">
        <el-pagination
          v-model:current-page="taskCurrentPage"
          v-model:page-size="taskPageSize"
          :page-sizes="[5, 10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredTasks.length"
          @size-change="taskCurrentPage = 1"
        >
          <template #total>
            <span>共 {{ filteredTasks.length }} 个根任务项</span>
          </template>
        </el-pagination>
      </div>
    </div>

    <!-- 任务依赖拓扑管理弹窗 -->
    <TaskDependencyDialog
      v-if="stage"
      v-model="depDialogVisible"
      :stage-id="stage.id"
      :task="selectedDepTask"
      :all-tasks="flatTasks"
      :dependencies="dependencies"
      @updated="loadDependencies"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { updateStageApi } from '../api/stage'
import { createSubTaskApi, updateSubTaskApi, deleteSubTaskApi } from '../api/subtask'
import { getDependenciesApi } from '../api/dependency'
import type { Stage, SubTask, TaskDependency } from '@/types'
import {
  scanCustomColumns,
  updateOriginalNode,
  filterTreeData,
  flattenTaskTree,
  checkTaskBlocked
} from '../composables/useMatrixTree'
import TaskDependencyDialog from './TaskDependencyDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  stage: Stage | null
  tasks: SubTask[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'refresh-tasks'): void
}>()

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  val => {
    visible.value = val
  }
)
watch(visible, val => {
  emit('update:modelValue', val)
})

const manualColumns = ref<string[]>([])
const activeFilters = ref<Record<string, any[]>>({})
const dependencies = ref<TaskDependency[]>([])

const taskCurrentPage = ref(1)
const taskPageSize = ref(10)

const quickTitle = ref('')
const quickAssignee = ref('')

const editingTitleTaskId = ref<number | null>(null)
const editingAssigneeTaskId = ref<number | null>(null)
const editingDateTaskId = ref<number | null>(null)
const editingCustomField = ref<{ taskId: number | null; key: string | null }>({
  taskId: null,
  key: null
})
const originalValCache = ref('')

// 依赖弹窗状态
const depDialogVisible = ref(false)
const selectedDepTask = ref<SubTask | null>(null)

// 提取当前所有任务的扁平数组
const flatTasks = computed(() => flattenTaskTree(props.tasks))

// 校验某任务是否阻塞
const getBlockedInfo = (task: SubTask) => {
  return checkTaskBlocked(task, flatTasks.value, dependencies.value)
}

const loadDependencies = async () => {
  if (props.stage) {
    dependencies.value = await getDependenciesApi(props.stage.id)
  }
}

watch(
  () => props.stage,
  val => {
    if (val) loadDependencies()
  },
  { immediate: true }
)

const openDepManager = (task: SubTask) => {
  selectedDepTask.value = task
  depDialogVisible.value = true
}

// 动态提取全部扩展列 Key
const stageColumns = computed(() => {
  const scanned = scanCustomColumns(props.tasks)
  return Array.from(new Set([...scanned, ...manualColumns.value]))
})

// 计算过滤后的任务树
const filteredTasks = computed(() => {
  const allowedStatuses =
    activeFilters.value['status'] && activeFilters.value['status'].length > 0
      ? activeFilters.value['status']
      : ['TODO', 'IN_PROGRESS', 'DONE']

  const hasOtherFilters = Object.keys(activeFilters.value).some(
    k => k !== 'status' && activeFilters.value[k]?.length > 0
  )
  if (allowedStatuses.length === 3 && !hasOtherFilters) {
    return props.tasks
  }
  return filterTreeData(props.tasks, allowedStatuses, activeFilters.value)
})

const paginatedTasks = computed(() => {
  const start = (taskCurrentPage.value - 1) * taskPageSize.value
  return filteredTasks.value.slice(start, start + taskPageSize.value)
})

const assigneeFilters = computed(() => {
  const values = new Set<string>()
  flatTasks.value.forEach(t => {
    values.add(t.assignee ? t.assignee.trim() : '未分配')
  })
  return Array.from(values).map(val => ({ text: val, value: val }))
})

const getCustomColumnFilters = (key: string) => {
  const values = new Set<string>()
  let hasLongText = false
  flatTasks.value.forEach(t => {
    const val = t.customFields?.[key]
    if (val && String(val).trim() !== '') {
      const str = String(val).trim()
      if (str.length > 25 || str.includes('\n')) hasLongText = true
      values.add(str)
    } else {
      values.add('空')
    }
  })
  return hasLongText ? undefined : Array.from(values).map(v => ({ text: v, value: v }))
}

const handleFilterChange = (filters: Record<string, any[]>) => {
  for (const k in filters) {
    activeFilters.value[k] = filters[k]
  }
  taskCurrentPage.value = 1
}

const handleStageStatusChange = async (newStatus: any) => {
  if (!props.stage) return
  try {
    const updatedStage = { ...props.stage, status: newStatus }
    await updateStageApi(props.stage.id, updatedStage)
    ElMessage.success(`阶段状态已更新: ${newStatus}`)
    emit('refresh-tasks')
  } catch (err) {}
}

// ----------------- 原地编辑保存 -----------------
const startTitleEdit = (row: SubTask) => {
  editingTitleTaskId.value = row.id
  originalValCache.value = row.title || ''
}

const finishTitleEdit = async (row: SubTask) => {
  editingTitleTaskId.value = null
  if (!row.title.trim() || row.title === originalValCache.value) {
    row.title = originalValCache.value
    return
  }
  await saveSubTask(row)
}

const startAssigneeEdit = (row: SubTask) => {
  editingAssigneeTaskId.value = row.id
  originalValCache.value = row.assignee || ''
}

const finishAssigneeEdit = async (row: SubTask) => {
  editingAssigneeTaskId.value = null
  if (row.assignee === originalValCache.value) return
  await saveSubTask(row)
}

const finishDateEdit = async (row: SubTask) => {
  editingDateTaskId.value = null
  if (row.dateRange && row.dateRange.length === 2) {
    row.startDate = row.dateRange[0]
    row.endDate = row.dateRange[1]
  } else {
    row.startDate = null
    row.endDate = null
  }
  await saveSubTask(row)
}

const startCustomFieldEdit = (row: SubTask, key: string) => {
  editingCustomField.value = { taskId: row.id, key }
  originalValCache.value = row.customFields?.[key] || ''
}

const cancelCustomFieldEdit = (row: SubTask, key: string) => {
  if (row.customFields) row.customFields[key] = originalValCache.value
  editingCustomField.value = { taskId: null, key: null }
}

const finishCustomFieldEdit = async (row: SubTask, key: string) => {
  editingCustomField.value = { taskId: null, key: null }
  if (row.customFields?.[key] === originalValCache.value) return
  await saveSubTask(row)
}

const saveSubTask = async (row: SubTask) => {
  try {
    updateOriginalNode(props.tasks, row)
    await updateSubTaskApi(row.id, {
      id: row.id,
      stageId: row.stageId,
      parentId: row.parentId,
      title: row.title,
      assignee: row.assignee,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      customFields: row.customFields
    })
    ElMessage.success('保存成功')
  } catch (err) {
    emit('refresh-tasks')
  }
}

// ----------------- 子项拆解与行追加 -----------------
const handleInlineAddChild = async (parentRow: SubTask) => {
  if (!props.stage) return
  try {
    const newChild = await createSubTaskApi({
      stageId: props.stage.id,
      parentId: parentRow.id,
      title: '新拆解子项',
      assignee: parentRow.assignee || '',
      status: 'TODO'
    })
    ElMessage.success('已新建子项，双击可改名')
    emit('refresh-tasks')
    startTitleEdit(newChild)
  } catch (err) {}
}

const handleQuickAdd = async () => {
  if (!props.stage || !quickTitle.value.trim()) {
    ElMessage.warning('任务名称不可为空')
    return
  }
  try {
    await createSubTaskApi({
      stageId: props.stage.id,
      title: quickTitle.value.trim(),
      assignee: quickAssignee.value.trim(),
      status: 'TODO'
    })
    ElMessage.success('任务录入完成')
    quickTitle.value = ''
    quickAssignee.value = ''
    emit('refresh-tasks')
  } catch (err) {}
}

const handleDeleteTask = (id: number) => {
  ElMessageBox.confirm('移除该项将同步删除其所有子拆解项，是否继续？', '提示', { type: 'warning' })
    .then(async () => {
      await deleteSubTaskApi(id)
      ElMessage.success('删除成功')
      emit('refresh-tasks')
    })
    .catch(() => {})
}

// ----------------- JSONB 扩展列追加与删除 -----------------
const promptAddColumn = () => {
  ElMessageBox.prompt(
    '请输入新扩展列的名称（如：测试负责人、Bug单号、设计稿Link）',
    '➕ 追加矩阵列',
    {
      confirmButtonText: '确定追加',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '列名不能为空'
    }
  )
    .then(({ value }) => {
      const newKey = value.trim()
      if (stageColumns.value.includes(newKey)) {
        ElMessage.warning(`列名「${newKey}」已存在`)
        return
      }
      manualColumns.value.push(newKey)
      ElMessage.success(`已成功追加扩展列「${newKey}」`)
    })
    .catch(() => {})
}

const handleDeleteColumn = (key: string) => {
  ElMessageBox.confirm(
    `确定要删除整列「${key}」吗？所有任务在该列填写的内容将被清空。`,
    '删除扩展列',
    {
      type: 'warning'
    }
  )
    .then(async () => {
      manualColumns.value = manualColumns.value.filter(k => k !== key)
      const affectedNodes: SubTask[] = []
      const removeKey = (nodes: SubTask[]) => {
        nodes.forEach(n => {
          if (n.customFields && Object.prototype.hasOwnProperty.call(n.customFields, key)) {
            delete n.customFields[key]
            affectedNodes.push(n)
          }
          if (n.children && n.children.length > 0) removeKey(n.children)
        })
      }
      removeKey(props.tasks)
      for (const node of affectedNodes) {
        await updateSubTaskApi(node.id, node).catch(() => {})
      }
      ElMessage.success(`扩展列「${key}」已删除`)
      emit('refresh-tasks')
    })
    .catch(() => {})
}
</script>

<style scoped>
.stage-table-block {
  border: 1px solid rgba(55, 53, 47, 0.09);
  border-radius: 6px;
  overflow: hidden;
}

.stage-block-header {
  height: 48px;
  background-color: #f7f7f5;
  border-bottom: 1px solid rgba(55, 53, 47, 0.09);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.block-stage-prefix {
  font-size: 13px;
  font-weight: 600;
  color: #37352f;
}

.block-stage-name {
  font-size: 13px;
  font-weight: 600;
  color: #37352f;
}

.block-stage-dates {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.5);
}

.excel-table-style {
  --el-table-border-color: rgba(55, 53, 47, 0.05) !important;
  --el-table-header-bg-color: #f7f7f5 !important;
}

.excel-table-style :deep(.cell) {
  padding: 8px 10px !important;
}

.inline-edit-cell {
  border: 1px dashed transparent;
  padding: 2px 6px;
  border-radius: 3px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  transition: all 0.12s ease-in-out;
}

.inline-edit-cell:hover {
  border-color: rgba(55, 53, 47, 0.16);
  background-color: rgba(55, 53, 47, 0.03);
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.blocked-tag {
  font-size: 10px !important;
  height: 18px !important;
  line-height: 18px !important;
  padding: 0 5px !important;
  cursor: help;
  font-weight: 600;
}

.add-sub-child-btn {
  visibility: hidden;
  font-size: 11px;
  margin-left: 10px;
  color: #2383e2;
}

.inline-edit-cell:hover .add-sub-child-btn {
  visibility: visible;
}

.cell-text,
.custom-field-text {
  font-size: 13px;
  color: #37352f;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  display: block;
  text-align: left;
}

.completed-style {
  text-decoration: line-through;
  color: rgba(55, 53, 47, 0.35);
}

.custom-field-text.is-empty {
  color: rgba(55, 53, 47, 0.25);
  font-style: italic;
  font-size: 12px;
}

.assignee-tag {
  font-size: 11px;
  background-color: rgba(55, 53, 47, 0.05);
  padding: 3px 8px;
  border-radius: 3px;
  color: #37352f;
  font-weight: 500;
}

.date-preview-text {
  font-size: 12px;
  color: rgba(55, 53, 47, 0.7);
}

.custom-header-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.custom-header-title {
  font-weight: 600;
  color: #37352f;
}

.header-delete-btn {
  cursor: pointer;
  font-size: 12px;
  color: #909399;
  padding: 1px 4px;
  border-radius: 50%;
}

.header-delete-btn:hover {
  background-color: #fef0f0;
  color: #f56c6c;
}

.add-column-header-btn {
  cursor: pointer;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(55, 53, 47, 0.45);
}

.add-column-header-btn:hover {
  color: #2383e2;
  transform: scale(1.15);
}

.excel-quick-append-row {
  height: 48px;
  background-color: #fafafa;
  border: 1px solid rgba(55, 53, 47, 0.09);
  border-top: none;
  border-radius: 0 0 6px 6px;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.append-tag {
  font-size: 12px;
  color: #2383e2;
  font-weight: 600;
  margin-right: 15px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>
