<!-- src/features/requirement/index.vue -->
<template>
  <div class="workspace">
    <div class="content-card">
      <div class="table-toolbar">
        <div class="title-with-badge">
          <span class="table-title">需求事项库</span>
          <el-tag v-if="currentProjectName" size="small" type="primary" class="proj-badge">
            📁 {{ currentProjectName }}
          </el-tag>
        </div>
        <el-button type="primary" @click="openCreateDialog">录入新需求</el-button>
      </div>

      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        show-icon
        :closable="false"
        class="load-error-alert"
      >
        <template #default>
          <el-button link type="primary" :loading="loading" @click="loadRequirements"
            >重试</el-button
          >
        </template>
      </el-alert>

      <!-- 1. 需求表格组件 -->
      <RequirementTable
        v-if="showCurrentProjectData && (!loadError || tableData.length > 0)"
        :data="tableData"
        :loading="loading"
        :stage-stats="stageStatsMap"
        @drag-end="handleDragEnd"
        @go-wiki="goToWiki"
        @edit="openEditDialog"
        @delete="handleDelete"
      />
      <div v-else-if="loading" class="table-loading-state">
        <el-skeleton :rows="6" animated />
      </div>
      <el-empty
        v-else-if="loadError"
        description="需求列表加载失败，重试成功后会显示数据"
        :image-size="80"
      >
        <el-button type="primary" :loading="loading" @click="loadRequirements">重新加载</el-button>
      </el-empty>

      <!-- 2. 分页组件 -->
      <div v-if="showCurrentProjectData" class="pagination-wrapper">
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

    <!-- 3. 录入/编辑对话框组件 -->
    <RequirementDialog
      v-model="dialogVisible"
      :is-edit="isEdit"
      :requirement-data="selectedRequirement"
      @saved="loadRequirements"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getRequirementsListApi, deleteRequirementApi } from './api'
import { getStagesApi } from '@/features/requirement-workspace/api/stage'
import { useWorkspaceStore } from '@/store/workspace'
import type { Requirement, PageResult } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'
import RequirementTable, { type StageStat } from './components/RequirementTable.vue'
import RequirementDialog from './components/RequirementDialog.vue'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const tableData = ref<Requirement[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const selectedRequirement = ref<Requirement | null>(null)

const stageStatsMap = ref<Record<number, StageStat>>({})

const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loadError = ref('')
const hasLoadedRequirements = ref(false)
const loadedProjectId = ref<number | null>(null)
let requirementsRequestId = 0

const showCurrentProjectData = computed(
  () => hasLoadedRequirements.value && loadedProjectId.value === workspaceStore.activeProjectId
)

const currentProjectName = computed(() => {
  const current = workspaceStore.projects.find(p => p.id === workspaceStore.activeProjectId)
  return current ? `${current.name} (${current.identifier})` : ''
})

// 监听当前项目集切换，自动重新拉取对应的需求
watch(
  () => workspaceStore.activeProjectId,
  () => {
    currentPage.value = 1
    loadRequirements()
  }
)

const applySavedRequirementOrder = (dataList: Requirement[]): Requirement[] => {
  const savedOrderStr = localStorage.getItem('reqflow_requirement_order')
  if (!savedOrderStr) return dataList
  try {
    const orderIds: number[] = JSON.parse(savedOrderStr)
    const orderMap = new Map(orderIds.map((id, index) => [id, index]))
    return dataList.sort((a, b) => {
      const indexA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : Infinity
      const indexB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : Infinity
      return indexA - indexB
    })
  } catch (e) {
    return dataList
  }
}

const saveRequirementOrder = (list: Requirement[]) => {
  const orderIds = list.map(item => item.id)
  localStorage.setItem('reqflow_requirement_order', JSON.stringify(orderIds))
}

const handleDragEnd = (reorderedList: Requirement[]) => {
  tableData.value = reorderedList
  saveRequirementOrder(reorderedList)
  ElMessage.success('需求展示顺序已更新')
}

const loadRequirements = async () => {
  const requestId = ++requirementsRequestId
  const projectId = workspaceStore.activeProjectId
  loading.value = true
  loadError.value = ''
  try {
    const res = await getRequirementsListApi({
      page: currentPage.value - 1,
      size: pageSize.value,
      projectId: projectId || undefined
    })
    if (requestId !== requirementsRequestId || projectId !== workspaceStore.activeProjectId) return

    let list: Requirement[] = []
    if (res && (res as PageResult<Requirement>).content !== undefined) {
      const pageResult = res as PageResult<Requirement>
      list = pageResult.content
      total.value = pageResult.totalElements || 0
    } else if (Array.isArray(res)) {
      list = res as Requirement[]
      total.value = res.length
    }

    tableData.value = applySavedRequirementOrder(list)
    loadedProjectId.value = projectId
    hasLoadedRequirements.value = true
    await loadRequirementStats(tableData.value, requestId)
  } catch {
    if (requestId === requirementsRequestId) {
      loadError.value =
        showCurrentProjectData.value && tableData.value.length
          ? '需求加载失败，当前保留上次成功加载的结果。'
          : '需求列表加载失败，请检查网络后重试。'
    }
  } finally {
    if (requestId === requirementsRequestId) loading.value = false
  }
}

const loadRequirementStats = async (reqs: Requirement[], requestId: number) => {
  if (!reqs || reqs.length === 0) return
  const stats: Record<number, StageStat> = { ...stageStatsMap.value }
  let failed = false
  await Promise.all(
    reqs.map(async req => {
      try {
        const stages = await getStagesApi(req.id)
        if (stages && stages.length > 0) {
          const done = stages.filter(s => s.status === 'DONE').length
          const totalCount = stages.length
          const percent = Math.round((done / totalCount) * 100)
          stats[req.id] = { total: totalCount, done, percent }
        } else {
          stats[req.id] = { total: 0, done: 0, percent: 0 }
        }
      } catch {
        failed = true
      }
    })
  )
  if (requestId === requirementsRequestId) {
    stageStatsMap.value = stats
    if (failed) loadError.value = '需求已加载，但部分阶段进度暂时不可用。可重试刷新。'
  }
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  loadRequirements()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadRequirements()
}

const goToWiki = (reqId: number) => {
  router.push({ path: '/wiki', query: { reqId } })
}

const openCreateDialog = () => {
  isEdit.value = false
  selectedRequirement.value = null
  dialogVisible.value = true
}

const openEditDialog = (row: Requirement) => {
  isEdit.value = true
  selectedRequirement.value = row
  dialogVisible.value = true
}

const handleDelete = (id: number) => {
  ElMessageBox.confirm(
    '确定要删除该需求吗？其下关联的所有阶段及子任务信息也将一并清空。',
    '重要提示',
    { type: 'warning' }
  )
    .then(async () => {
      try {
        await deleteRequirementApi(id)
      } catch {
        ElMessage.error('删除失败，请重试')
        return
      }
      ElMessage.success('删除成功')
      loadRequirements()
    })
    .catch(error => {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('无法确认删除操作，请重试')
    })
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
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.load-error-alert {
  margin: 14px 0;
}
.table-loading-state {
  padding: 18px 0;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-title {
  font-size: 16px;
  font-weight: bold;
}

.proj-badge {
  font-size: 11px !important;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
