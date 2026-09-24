<!-- src/views/RequirementList.vue -->
<template>
  <div class="page">
    <!-- 统一顶栏 -->
    <div class="page-head">
      <div>
        <div class="eyebrow">REQUIREMENTS</div>
        <h1>需求</h1>
        <p>所有业务目标、里程碑和工程知识资产的统一列表视图。</p>
      </div>
      <el-button type="primary" size="small" @click="openCreate">+ 新建需求</el-button>
    </div>

    <!-- 顶栏工具条 -->
    <div class="toolbar">
      <el-input
        v-model="keyword"
        clearable
        size="small"
        placeholder="搜索需求标题或描述..."
        style="max-width: 320px"
      >
        <template #prefix>⌕</template>
      </el-input>

      <div class="filters">
        <button
          v-for="f in filters"
          :key="f.value"
          :class="{ active: statusFilter === f.value }"
          @click="statusFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- 需求表格主体 -->
    <div class="table-container surface">
      <el-table
        v-loading="loading"
        :data="filteredList"
        row-key="id"
        height="100%"
        class="req-table"
        @row-click="handleRowClick"
      >
        <el-table-column label="需求名称" min-width="280">
          <template #default="{ row }">
            <div class="req-title-cell">
              <div class="req-title-row">
                <strong class="title-text" :title="row.title">{{ row.title }}</strong>
              </div>
              <span class="desc-text" :title="row.description || '暂无描述'">
                {{ row.description || '暂无需求背景或业务价值说明' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="优先级" width="100" align="center">
          <template #default="{ row }">
            <StatusChip :status="row.priority" />
          </template>
        </el-table-column>

        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <StatusChip :status="row.status" />
          </template>
        </el-table-column>

        <el-table-column label="起止排期" width="220" align="center">
          <template #default="{ row }">
            <span class="date-text">
              {{ row.startDate || '未定' }} 至 {{ row.endDate || '未定' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="完成度" width="160" align="center">
          <template #default="{ row }">
            <div class="progress-cell">
              <div class="progress-bar">
                <i :style="{ width: (row.__percent || 0) + '%' }"></i>
              </div>
              <span class="percent-label">{{ row.__percent || 0 }}%</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="170" align="right">
          <template #default="{ row }">
            <div class="actions-cell" @click.stop>
              <el-button link type="primary" size="small" @click="open(row)"> 进入 ➔ </el-button>
              <el-button link size="small" @click="openEdit(row)"> 编辑 </el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页吸底 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          :total="total"
          size="small"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑需求' : '新建需求'"
      width="520px"
      destroy-on-close
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="需求名称" required>
          <el-input v-model="form.title" placeholder="例如：支付系统重构" />
        </el-form-item>
        <el-form-item label="为什么做？(业务背景与目标)">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="描述业务背景与成功指标。"
          />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="优先级">
            <el-select v-model="form.priority">
              <el-option label="P1 (高)" value="HIGH" />
              <el-option label="P2 (中)" value="MEDIUM" />
              <el-option label="P3 (低)" value="LOW" />
            </el-select>
          </el-form-item>
          <el-form-item label="目标交付日期">
            <el-date-picker
              v-model="form.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="截止日期"
            />
          </el-form-item>
        </div>
        <el-form-item v-if="editing" label="需求状态">
          <el-select v-model="form.status">
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="测试中" value="TESTING" />
            <el-option label="已完成" value="DONE" />
            <el-option label="已挂起" value="SUSPENDED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getRequirementsListApi,
  createRequirementApi,
  updateRequirementApi,
  deleteRequirementApi
} from '@/api/requirement'
import { getStagesApi } from '@/api/stage'
import StatusChip from '@/components/workspace/StatusChip.vue'

const router = useRouter()
const loading = ref(false)
const requirements = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const statusFilter = ref('ALL')

const dialogVisible = ref(false)
const editing = ref(false)

const filters = [
  { value: 'ALL', label: '全部' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'TODO', label: '待处理' },
  { value: 'SUSPENDED', label: '挂起' },
  { value: 'DONE', label: '已完成' }
]

const form = ref({
  id: null,
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO',
  startDate: null,
  endDate: null
})

const filteredList = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return requirements.value.filter(r => {
    const textMatch = !q || `${r.title} ${r.description || ''}`.toLowerCase().includes(q)
    const statusMatch = statusFilter.value === 'ALL' || r.status === statusFilter.value
    return textMatch && statusMatch
  })
})

const handleRowClick = row => open(row)

const open = r => {
  router.push(`/requirement/${r.id}`)
}

const openCreate = () => {
  editing.value = false
  form.value = {
    id: null,
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    startDate: null,
    endDate: null
  }
  dialogVisible.value = true
}

const openEdit = r => {
  editing.value = true
  form.value = { ...r }
  dialogVisible.value = true
}

const handleDelete = r => {
  ElMessageBox.confirm(`确定彻底删除需求「${r.title}」吗？关联阶段与任务将同步移除。`, '删除需求', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await deleteRequirementApi(r.id)
      ElMessage.success('需求已删除')
      await load()
    })
    .catch(() => {})
}

const save = async () => {
  if (!form.value.title.trim()) return ElMessage.warning('请输入需求名称')
  try {
    if (editing.value) {
      await updateRequirementApi(form.value.id, form.value)
      ElMessage.success('需求已更新')
    } else {
      await createRequirementApi(form.value)
      ElMessage.success('需求已创建')
    }
    dialogVisible.value = false
    await load()
  } catch {}
}

const handlePageChange = val => {
  currentPage.value = val
  load()
}

const handleSizeChange = val => {
  pageSize.value = val
  currentPage.value = 1
  load()
}

const load = async () => {
  loading.value = true
  try {
    const res = await getRequirementsListApi({
      page: currentPage.value - 1,
      size: pageSize.value
    })

    let list = []
    if (res && res.content) {
      list = res.content
      total.value = res.totalElements
    } else if (Array.isArray(res)) {
      list = res
      total.value = res.length
    }

    await Promise.all(
      list.map(async item => {
        try {
          const stages = await getStagesApi(item.id)
          item.__percent = stages?.length
            ? Math.round((stages.filter(s => s.status === 'DONE').length / stages.length) * 100)
            : 0
        } catch {
          item.__percent = 0
        }
      })
    )

    requirements.value = list
  } catch {
    requirements.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  height: 100%;
  padding: 20px 28px 24px;
  max-width: 1560px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  min-height: 52px;
  flex-shrink: 0;
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 1.2px;
  font-weight: 800;
  color: var(--rf-text-3);
  margin-bottom: 6px;
}

.page-head h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.5px;
}

.page-head p {
  font-size: 13px;
  color: var(--rf-text-2);
  margin: 6px 0 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  height: 38px;
  flex-shrink: 0;
}

.filters {
  display: flex;
  gap: 3px;
  background: #fff;
  border: 1px solid var(--rf-border);
  padding: 3px;
  border-radius: 8px;
}

.filters button {
  border: 0;
  background: transparent;
  padding: 5px 12px;
  border-radius: 6px;
  color: var(--rf-text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filters button:hover {
  background: #f7f8fa;
}

.filters button.active {
  background: var(--rf-subtle);
  color: var(--rf-text);
}

.surface {
  background: #fff;
  border: 1px solid var(--rf-border);
  border-radius: 12px;
}

.table-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.req-table {
  width: 100%;
  flex: 1;
  cursor: pointer;
}

.req-table :deep(.el-table__row) {
  transition: background-color 0.15s ease;
}

.req-table :deep(.el-table__row:hover) {
  background-color: #fafbff !important;
}

.req-title-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.req-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-size: 13.5px;
  color: var(--rf-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc-text {
  font-size: 11px;
  color: var(--rf-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 480px;
}

.date-text {
  font-size: 11px;
  color: var(--rf-text-2);
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.progress-bar {
  flex: 1;
  height: 5px;
  background: #edf0f2;
  border-radius: 99px;
  overflow: hidden;
}

.progress-bar i {
  display: block;
  height: 100%;
  background: var(--rf-brand);
  border-radius: 99px;
}

.percent-label {
  font-size: 11px;
  color: var(--rf-text-2);
  width: 34px;
  text-align: right;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.pagination-wrapper {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-top: 1px solid var(--rf-border);
  background: #fff;
  flex-shrink: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid .el-date-editor,
.form-grid .el-select {
  width: 100%;
}
</style>
