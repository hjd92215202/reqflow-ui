<template>
  <div class="workspace">
    <div class="content-card">
      <div class="table-toolbar">
        <span class="table-title">需求事项库</span>
        <el-button type="primary" @click="openCreateDialog">录入新需求</el-button>
      </div>

      <el-table
        ref="requirementTableRef"
        :data="tableData"
        style="width: 100%; margin-top: 15px;"
        border
        stripe
        v-loading="loading"
        :row-class-name="tableRowClassName"
      >
        <!-- 核心优化：鼠标按住手柄实时拖动排序 -->
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

        <el-table-column prop="title" label="需求标题" min-width="150" show-overflow-tooltip />
        <el-table-column prop="description" label="核心描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="排期起止" width="220">
          <template #default="scope">
            <span class="date-text" v-if="scope.row.startDate || scope.row.endDate">
              {{ scope.row.startDate || '未定' }} 至 {{ scope.row.endDate || '未定' }}
            </span>
            <span class="date-text-none" v-else>暂无排期</span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="90" align="center">
          <template #default="scope">
            <el-tag :type="getPriorityTag(scope.row.priority)" size="small">{{ scope.row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="进展状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getStatusTag(scope.row.status)" size="small">
              {{ formatStatus(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 阶段完成度 (迷你进度条与阶段徽章) -->
        <el-table-column label="阶段完成度" min-width="170" align="center">
          <template #default="scope">
            <div v-if="stageStatsMap[scope.row.id] && stageStatsMap[scope.row.id].total > 0" class="progress-cell">
              <span class="progress-badge-text">
                📍 {{ stageStatsMap[scope.row.id].done }} / {{ stageStatsMap[scope.row.id].total }} 阶段已完成
              </span>
              <el-progress
                :percentage="stageStatsMap[scope.row.id].percent"
                :status="stageStatsMap[scope.row.id].percent === 100 ? 'success' : ''"
                :stroke-width="6"
                :show-text="false"
              />
            </div>
            <span v-else class="date-text-none">暂无阶段</span>
          </template>
        </el-table-column>

        <el-table-column label="操作面板" width="220" align="center" fixed="right">
          <template #default="scope">
            <el-button size="small" link type="success" @click="goToWorkMatrix(scope.row.id)">矩阵与跟进</el-button>
            <el-button size="small" link type="warning" @click="goToWiki(scope.row.id)">Wiki 沉淀</el-button>
            <el-button size="small" link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button size="small" link type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 需求新建/修改弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '修改需求' : '录入新需求'" width="550px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="需求名称" required>
          <el-input v-model="form.title" placeholder="请输入需求标题" />
        </el-form-item>
        <el-form-item label="需求背景">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入核心背景或业务价值..." />
        </el-form-item>
        <el-form-item label="计划起止">
          <el-date-picker v-model="requirementDateRange" type="daterange" range-separator="至" start-placeholder="开始"
            end-placeholder="截止" value-format="YYYY-MM-DD" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.priority">
            <el-radio-button value="LOW">低</el-radio-button>
            <el-radio-button value="MEDIUM">中</el-radio-button>
            <el-radio-button value="HIGH">高</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="主状态" v-if="isEdit">
          <el-select v-model="form.status" style="width: 100%;">
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="测试中" value="TESTING" />
            <el-option label="已上线" value="DONE" />
            <el-option label="已挂起" value="SUSPENDED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getRequirementsListApi,
  createRequirementApi,
  updateRequirementApi,
  deleteRequirementApi
} from '@/api/requirement'
import { getStagesApi } from '@/api/stage'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const tableData = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const requirementDateRange = ref([])
const requirementTableRef = ref(null)

// 各需求下的阶段完成统计映射表
const stageStatsMap = ref({})

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 正在拖拽的行索引标识
const activeDragIndex = ref(null)

const form = ref({
  id: null,
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO',
  startDate: null,
  endDate: null
})

// 应用本地保存的排序规则
const applySavedRequirementOrder = (dataList) => {
  const savedOrderStr = localStorage.getItem('reqflow_requirement_order')
  if (!savedOrderStr) return dataList
  try {
    const orderIds = JSON.parse(savedOrderStr)
    const orderMap = new Map(orderIds.map((id, index) => [id, index]))
    return dataList.sort((a, b) => {
      const indexA = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity
      const indexB = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity
      return indexA - indexB
    })
  } catch (e) {
    return dataList
  }
}

// 持久化保存排序规则
const saveRequirementOrder = () => {
  const orderIds = tableData.value.map(item => item.id)
  localStorage.setItem('reqflow_requirement_order', JSON.stringify(orderIds))
}

const tableRowClassName = ({ rowIndex }) => {
  return activeDragIndex.value === rowIndex ? 'dragging-row' : ''
}

// ----------------- 核心：鼠标按住手柄滑动实时拖拽排序 -----------------
const startRowDrag = (startIndex, event) => {
  event.preventDefault()
  event.stopPropagation()

  activeDragIndex.value = startIndex
  document.body.style.cursor = 'grabbing'
  document.body.style.userSelect = 'none'

  const handleMouseMove = (e) => {
    if (activeDragIndex.value === null) return

    // 取得 Element Plus 表格中所有的 TR 节点
    const rows = document.querySelectorAll('.workspace .el-table__body-wrapper tbody tr')
    rows.forEach((rowEl, targetIndex) => {
      const rect = rowEl.getBoundingClientRect()
      // 判断当前鼠标 Y 坐标是否落在某个 TR 的上下边界内
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        if (activeDragIndex.value !== targetIndex) {
          // 实时交换数组项
          const movedItem = tableData.value.splice(activeDragIndex.value, 1)[0]
          tableData.value.splice(targetIndex, 0, movedItem)
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
      saveRequirementOrder()
      ElMessage.success('需求展示顺序已更新')
      activeDragIndex.value = null
    }
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

// ----------------- 需求列表数据加载 -----------------
const loadRequirements = async () => {
  loading.value = true
  try {
    const res = await getRequirementsListApi({
      page: currentPage.value - 1,
      size: pageSize.value
    })
    let list = []
    if (res && res.content !== undefined) {
      list = res.content
      total.value = res.totalElements || 0
    } else if (Array.isArray(res)) {
      list = res
      total.value = res.length
    }
    tableData.value = applySavedRequirementOrder(list)
    await loadRequirementStats(tableData.value)
  } catch (error) {
  } finally {
    loading.value = false
  }
}

// 统计各需求的阶段完成进度
const loadRequirementStats = async (reqs) => {
  if (!reqs || reqs.length === 0) return
  const stats = {}
  await Promise.all(
    reqs.map(async (req) => {
      try {
        const stages = await getStagesApi(req.id)
        if (stages && stages.length > 0) {
          const done = stages.filter(s => s.status === 'DONE').length
          const total = stages.length
          const percent = Math.round((done / total) * 100)
          stats[req.id] = { total, done, percent }
        } else {
          stats[req.id] = { total: 0, done: 0, percent: 0 }
        }
      } catch (e) {
        stats[req.id] = { total: 0, done: 0, percent: 0 }
      }
    })
  )
  stageStatsMap.value = stats
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  loadRequirements()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadRequirements()
}

const goToWorkMatrix = (reqId) => {
  router.push({ path: '/matrix', query: { reqId } })
}

const goToWiki = (reqId) => {
  router.push({ path: '/wiki', query: { reqId } })
}

const openCreateDialog = () => {
  isEdit.value = false
  requirementDateRange.value = []
  form.value = { id: null, title: '', description: '', priority: 'MEDIUM', status: 'TODO', startDate: null, endDate: null }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  form.value = { ...row }
  if (row.startDate && row.endDate) {
    requirementDateRange.value = [row.startDate, row.endDate]
  } else {
    requirementDateRange.value = []
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.title.trim()) {
    ElMessage.warning('需求标题不能为空')
    return
  }
  if (requirementDateRange.value && requirementDateRange.value.length === 2) {
    form.value.startDate = requirementDateRange.value[0]
    form.value.endDate = requirementDateRange.value[1]
  } else {
    form.value.startDate = null
    form.value.endDate = null
  }
  try {
    if (isEdit.value) {
      await updateRequirementApi(form.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await createRequirementApi(form.value)
      ElMessage.success('录入成功')
    }
    dialogVisible.value = false
    loadRequirements()
  } catch (error) { }
}

const formatStatus = (status) => {
  const statusMap = {
    'TODO': '待处理',
    'IN_PROGRESS': '进行中',
    'TESTING': '测试中',
    'DONE': '已完成',
    'SUSPENDED': '已挂起'
  }
  return statusMap[status] || status
}

const handleDelete = (id) => {
  ElMessageBox.confirm('确定要删除该需求吗？其下关联的所有阶段及子任务信息也将一并清空。', '重要提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await deleteRequirementApi(id)
      ElMessage.success('删除成功')
      loadRequirements()
    } catch (error) { }
  }).catch(() => { })
}

const getPriorityTag = (p) => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const getStatusTag = (s) => {
  switch (s) {
    case 'TODO': return 'info'
    case 'IN_PROGRESS': return 'warning'
    case 'TESTING': return 'primary'
    case 'DONE': return 'success'
    case 'SUSPENDED': return 'danger'
    default: return 'info'
  }
}

onMounted(() => {
  loadRequirements()
})
</script>

<style scoped>
.workspace {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.content-card {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, .08);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: bold;
}

/* 拖拽手柄样式与高亮反馈 */
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

/* 进度条单元格样式 */
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

/* 分页容器位置样式 */
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 0 !important;
}

:deep(.el-tag) {
  font-size: 11px !important;
  height: 20px !important;
  line-height: 20px !important;
  padding: 0 8px !important;
  border: none !important;
  border-radius: 3px !important;
  font-weight: 500;
  letter-spacing: 0.3px;
}

:deep(.el-tag--success) {
  background-color: #e2f5ec !important;
  color: #0d7c50 !important;
}

:deep(.el-tag--warning) {
  background-color: #fdecc8 !important;
  color: #b36b00 !important;
}

:deep(.el-tag--danger) {
  background-color: #ffe2dd !important;
  color: #df4331 !important;
}

:deep(.el-tag--info) {
  background-color: #eeeeee !important;
  color: #555555 !important;
}

:deep(.el-tag--primary) {
  background-color: #e0f0ff !important;
  color: #0f73da !important;
}
</style>