<template>
  <div class="workspace">
    <div class="content-card">
      <div class="table-toolbar">
        <span class="table-title">需求事项库</span>
        <el-button type="primary" @click="openCreateDialog">录入新需求</el-button>
      </div>

      <el-table :data="tableData" style="width: 100%; margin-top: 15px;" border stripe v-loading="loading">
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

        <!-- 新增：阶段完成度 (迷你进度条与阶段徽章) -->
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

// 各需求下的阶段完成统计映射表 ({ [reqId]: { done, total, percent } })
const stageStatsMap = ref({})

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const form = ref({
  id: null,
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO',
  startDate: null,
  endDate: null
})

const loadRequirements = async () => {
  loading.value = true
  try {
    const res = await getRequirementsListApi({
      page: currentPage.value - 1, // Spring Data 页码从 0 开始
      size: pageSize.value
    })
    // 兼容后端返回分页 Page 对象与普通 List 数组两种情况
    if (res && res.content !== undefined) {
      tableData.value = res.content
      total.value = res.totalElements || 0
    } else if (Array.isArray(res)) {
      tableData.value = res
      total.value = res.length
    }
    // 异步计算并统计当前列表所有需求的阶段完成进度
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

/* 1. 撑开表格单元格的纵向空间（增加上下内边距至 12px） */
:deep(.el-table .el-table__cell) {
  padding: 12px 0 !important;
}

/* 重写 Element Plus Tag 基础样式为 Notion 风格 */
:deep(.el-tag) {
  font-size: 11px !important;     /* 稍微降低字号以减少字符侵略感 */
  height: 20px !important;        /* 固定标签高度 */
  line-height: 20px !important;   /* 文字垂直居中 */
  padding: 0 8px !important;      /* 左右内收，保持胶囊形状 */
  border: none !important;
  border-radius: 3px !important;
  font-weight: 500;
  letter-spacing: 0.3px;          /* 微调字间距提高易读性 */
}

/* 重新配置各类状态的淡色系调色板 */
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