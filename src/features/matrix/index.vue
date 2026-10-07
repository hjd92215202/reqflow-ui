<!-- src/features/matrix/index.vue -->
<template>
  <div class="workbench-workspace">
    <el-alert
      v-if="loadError && selectedRequirement"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
      class="matrix-load-error"
    >
      <template #default>
        <el-button link type="primary" @click="initWorkspaceData">重新加载</el-button>
      </template>
    </el-alert>
    <!-- 需求全局视图与阶段总览 -->
    <div v-if="selectedRequirement" class="matrix-board">
      <!-- 1. 顶栏项目概览与需求切换器 -->
      <div class="board-top-info">
        <div>
          <div class="header-title-row">
            <span class="header-req-icon">📋</span>
            <el-select
              v-model="activeReqId"
              placeholder="请选择/切换需求项目"
              size="large"
              class="header-req-select"
              @change="handleReqSelectChange"
            >
              <el-option
                v-for="req in requirements"
                :key="req.id"
                :label="req.title"
                :value="req.id"
              >
                <div class="req-option-item">
                  <span class="req-option-title">{{ req.title }}</span>
                  <el-tag
                    :type="getPriorityTag(req.priority)"
                    size="small"
                    style="margin-left: 8px"
                  >
                    {{ req.priority }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>

            <el-tag
              :type="getPriorityTag(selectedRequirement.priority)"
              size="small"
              style="margin-left: 12px"
            >
              {{ selectedRequirement.priority }} 优先级
            </el-tag>
          </div>
          <p v-if="selectedRequirement.description" class="board-header-desc">
            {{ selectedRequirement.description }}
          </p>
        </div>

        <div class="top-action-bar">
          <el-button type="primary" size="default" @click="stageDialogVisible = true">
            ➕ 划分新执行阶段
          </el-button>
        </div>
      </div>

      <el-divider style="margin: 18px 0 20px 0" />

      <!-- 2. 解耦出的阶段列表卡片组件 -->
      <div v-if="workspaceLoading" class="matrix-loading-state">
        <el-skeleton :rows="5" animated />
      </div>
      <StageCardList
        v-else
        :stages="stages"
        :sub-tasks-map="stageSubTasksMap"
        @refresh="refreshData"
        @open-matrix="openMatrixModal"
      />
    </div>

    <div v-else-if="workspaceLoading" class="empty-board-state matrix-loading-state">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else-if="loadError" class="empty-board-state">
      <el-empty :description="loadError" :image-size="120">
        <el-button type="primary" @click="initWorkspaceData">重新加载</el-button>
      </el-empty>
    </div>

    <div v-else class="empty-board-state">
      <el-empty description="暂无需求事项，请先在【需求事项管理】中录入需求" :image-size="120" />
    </div>

    <!-- 3. 解耦出的微观协同矩阵大弹窗 -->
    <MatrixDialog
      v-model="matrixModalVisible"
      :stage="activeStage"
      :tasks="activeStageTasks"
      @refresh-tasks="refreshActiveStageTasks"
    />

    <!-- 4. 划分阶段对话框 -->
    <StageDialog
      v-model="stageDialogVisible"
      :requirement-id="selectedRequirement ? selectedRequirement.id : null"
      @created="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRequirementsListApi } from '@/features/requirement/api'
import { getStagesApi } from './api/stage'
import { getSubTasksApi } from './api/subtask'
import { useWorkspaceStore } from '@/store/workspace'
import type { Requirement, Stage, SubTask, PriorityLevel } from '@/types'
import { arrayToTree } from './composables/useMatrixTree'
import StageCardList from './components/StageCardList.vue'
import StageDialog from './components/StageDialog.vue'
import MatrixDialog from './components/MatrixDialog.vue'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()

const requirements = ref<Requirement[]>([])
const loadError = ref('')
const workspaceLoading = ref(false)
const activeReqId = ref<number | null>(null)
const selectedRequirement = ref<Requirement | null>(null)
const stages = ref<Stage[]>([])
const stageSubTasksMap = ref<Record<number, SubTask[]>>({})

const stageDialogVisible = ref(false)
const matrixModalVisible = ref(false)
const activeStage = ref<Stage | null>(null)

const activeStageTasks = computed(() => {
  if (!activeStage.value) return []
  return stageSubTasksMap.value[activeStage.value.id] || []
})
let workspaceRequestId = 0

// 监听项目集切换，自动重新载入对应的需求矩阵
watch(
  () => workspaceStore.activeProjectId,
  () => {
    selectedRequirement.value = null
    activeReqId.value = null
    requirements.value = []
    stages.value = []
    stageSubTasksMap.value = {}
    initWorkspaceData()
  }
)

const getPriorityTag = (p: PriorityLevel): 'danger' | 'warning' | 'info' => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const loadStagesAndTasks = async (reqId: number, requestId?: number) => {
  const generation = requestId ?? workspaceRequestId
  workspaceLoading.value = true
  try {
    const stageList = await getStagesApi(reqId)
    if (generation !== workspaceRequestId) return
    const loadedTasks: Record<number, SubTask[]> = {}
    for (const s of stageList) {
      const flatList = await getSubTasksApi(s.id)
      if (generation !== workspaceRequestId) return
      loadedTasks[s.id] = arrayToTree(flatList)
    }
    stages.value = stageList
    stageSubTasksMap.value = loadedTasks
  } finally {
    if (generation === workspaceRequestId) workspaceLoading.value = false
  }
}

const refreshData = async () => {
  if (selectedRequirement.value) {
    try {
      await loadStagesAndTasks(selectedRequirement.value.id)
      loadError.value = ''
    } catch {
      loadError.value = '阶段或工作项加载失败，当前保留上次成功的数据。请重试。'
    }
  }
}

const refreshActiveStageTasks = async () => {
  if (activeStage.value) {
    workspaceLoading.value = true
    try {
      const flatList = await getSubTasksApi(activeStage.value.id)
      stageSubTasksMap.value[activeStage.value.id] = arrayToTree(flatList)
      loadError.value = ''
    } catch {
      loadError.value = '该阶段工作项加载失败，仍显示上次成功的数据。'
    } finally {
      workspaceLoading.value = false
    }
  }
}

const openMatrixModal = async (stage: Stage) => {
  activeStage.value = stage
  await refreshActiveStageTasks()
  matrixModalVisible.value = true
}

const handleReqSelectChange = async (reqId: number) => {
  const target = requirements.value.find(r => r.id === reqId)
  if (target) {
    const requestId = ++workspaceRequestId
    selectedRequirement.value = target
    activeReqId.value = target.id
    stages.value = []
    stageSubTasksMap.value = {}
    loadError.value = ''
    router.replace({ path: '/matrix', query: { reqId } })
    try {
      await loadStagesAndTasks(target.id, requestId)
    } catch {
      if (requestId === workspaceRequestId) {
        loadError.value = '该需求的阶段或工作项加载失败，请重试。'
      }
    }
  }
}

const initWorkspaceData = async () => {
  const requestId = ++workspaceRequestId
  const projectId = workspaceStore.activeProjectId
  workspaceLoading.value = true
  loadError.value = ''
  try {
    const res = await getRequirementsListApi({
      page: 0,
      size: 200,
      projectId: projectId || undefined
    })
    if (requestId !== workspaceRequestId || projectId !== workspaceStore.activeProjectId) return

    let list: Requirement[] = []
    if (Array.isArray(res)) {
      list = res
    } else if (res && (res as any).content) {
      list = (res as any).content
    }
    requirements.value = list

    const queryReqId = route.query.reqId ? Number(route.query.reqId) : null
    const target = list.find(r => r.id === queryReqId) || list[0] || null

    if (target) {
      if (selectedRequirement.value?.id !== target.id) {
        stages.value = []
        stageSubTasksMap.value = {}
      }
      selectedRequirement.value = target
      activeReqId.value = target.id
      await loadStagesAndTasks(target.id, requestId)
    } else {
      selectedRequirement.value = null
      activeReqId.value = null
      stages.value = []
      stageSubTasksMap.value = {}
    }
  } catch {
    if (requestId === workspaceRequestId) {
      loadError.value = '需求矩阵加载失败，请检查网络后重试。'
    }
  } finally {
    if (requestId === workspaceRequestId) workspaceLoading.value = false
  }
}

onMounted(() => {
  initWorkspaceData()
})
</script>

<style scoped>
.workbench-workspace {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.matrix-load-error {
  margin-bottom: 14px;
}
.matrix-loading-state {
  padding: 18px;
}

.matrix-board {
  background-color: #ffffff;
  border-radius: 6px;
  padding: 24px;
  border: 1px solid rgba(55, 53, 47, 0.09);
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.04);
}

.board-top-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-title-row {
  display: flex;
  align-items: center;
}

.header-req-icon {
  font-size: 18px;
  margin-right: 8px;
}

.header-req-select {
  width: 320px;
}

:deep(.header-req-select .el-input__wrapper) {
  box-shadow: none !important;
  background-color: transparent !important;
  padding-left: 0 !important;
}

:deep(.header-req-select .el-input__inner) {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #37352f !important;
}

.req-option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.req-option-title {
  font-size: 13px;
  font-weight: 500;
  color: #37352f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.board-header-desc {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: rgba(55, 53, 47, 0.6);
}

.empty-board-state {
  flex: 1;
  background-color: #ffffff;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.04);
}
</style>
