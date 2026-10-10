<!-- src/features/requirement-workspace/index.vue -->
<template>
  <div v-loading="loadingReq" class="requirement-workspace-root">
    <template v-if="requirement">
      <!-- 1. 顶部需求看板 -->
      <RequirementHeader
        :requirement="requirement"
        :stage-total-count="stages.length"
        :stage-done-count="stagesDoneCount"
      />

      <!-- 2. Workspace 5级 Tab 栏 -->
      <RequirementTabs v-model="activeTab" :stages-count="stages.length" />

      <el-alert
        v-if="workspaceLoadError"
        :title="workspaceLoadError"
        type="error"
        show-icon
        :closable="false"
        class="workspace-load-error"
      >
        <template #default>
          <el-button link type="primary" :loading="loadingReq" @click="retryWorkspaceData">
            重新加载
          </el-button>
        </template>
      </el-alert>

      <!-- 3. 工作区主体视口 -->
      <main class="workspace-body-container">
        <!-- Tab 1: 概览 -->
        <RequirementOverview
          v-show="activeTab === 'overview'"
          :requirement="requirement"
          :stages="stages"
          :tasks-by-stage="stageTasksCache"
          :dependencies-by-stage="stageDependenciesCache"
          :overview-loading="overviewLoading"
          :overview-error="overviewError"
          @switch-tab="tab => (activeTab = tab as any)"
          @go-stage-execution="handleGoStageExecution"
          @retry-overview="loadOverviewData"
        />

        <!-- Tab 2: 计划 -->
        <RequirementPlan
          v-if="activeTab === 'plan'"
          :stages="stages"
          @create-stage="handleCreateStage"
          @update-stage="handleUpdateStage"
          @delete-stage="handleDeleteStage"
          @go-execution="handleGoStageExecution"
        />

        <!-- Tab 3: 执行 -->
        <RequirementExecution
          v-else-if="activeTab === 'execution'"
          :stages="stages"
          :current-stage-id="currentStageId"
          :filtered-tasks="currentFilteredTasks"
          :all-flat-tasks="currentFlatTasks"
          :dependencies="currentDependencies"
          :all-columns="currentColumns"
          :column-preference-key="`reqflow_workspace_columns_${requirement.id}`"
          :filters="filters"
          :selected-task-id="currentTaskId"
          :selected-task="selectedTask"
          :saving-task-id="savingTaskId"
          @select-stage="id => setStageId(id)"
          @create-stage="planEditorVisible = true"
          @update-filter="updateFilters"
          @reset-filters="resetFilters"
          @add-new-column="promptAddNewColumn"
          @select-task="t => setTaskId(t.id)"
          @close-inspector="setTaskId(null)"
          @update-task="handleUpdateTask"
          @add-child="handleAddChildTask"
          @add-child-with-title="handleAddChildTaskWithTitle"
          @delete-task="handleDeleteTask"
          @create-task="handleCreateTask"
          @add-dep="handleAddDependency"
          @remove-dep="handleRemoveDependency"
        />

        <!-- Tab 4: 活动 (P1 实装) -->
        <RequirementActivity
          v-else-if="activeTab === 'activity'"
          :requirement-id="requirement.id"
        />

        <!-- Tab 5: 知识 (P1 实装) -->
        <RequirementKnowledge
          v-else-if="activeTab === 'knowledge'"
          :requirement-id="requirement.id"
        />
      </main>
    </template>

    <div v-else-if="!loadingReq" class="error-view-box">
      <el-empty
        :description="workspaceLoadError || '无法加载该需求事项，或该需求不存在'"
        :image-size="100"
      >
        <el-button v-if="workspaceLoadError" type="primary" @click="initWorkspace"
          >重新加载</el-button
        >
        <el-button type="primary" @click="goBackHub">返回需求库</el-button>
      </el-empty>
    </div>

    <!-- 弹窗：快捷创建阶段 -->
    <StageEditor v-model="planEditorVisible" @submit="handleCreateStage" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRequirementApi } from '@/features/requirement/api'
import type { Requirement, SubTask } from '@/types'

import { useRequirementWorkspace } from './composables/useRequirementWorkspace'
import { useRequirementStages } from './composables/useRequirementStages'
import { useStageTasks } from './composables/useStageTasks'
import { useTaskFilters } from './composables/useTaskFilters'
import {
  filterTreeData,
  flattenTaskTree,
  scanCustomColumns,
  findTaskInTree
} from './composables/useTaskTree'

import RequirementHeader from './components/RequirementHeader.vue'
import RequirementTabs from './components/RequirementTabs.vue'
import RequirementOverview from './components/Overview/RequirementOverview.vue'
import RequirementPlan from './components/Plan/RequirementPlan.vue'
import RequirementExecution from './components/Execution/RequirementExecution.vue'
import RequirementActivity from './components/Activity/RequirementActivity.vue'
import RequirementKnowledge from './components/Knowledge/RequirementKnowledge.vue'
import StageEditor from './components/Plan/StageEditor.vue'

const router = useRouter()

const {
  requirementId,
  activeTab,
  currentStageId,
  currentTaskId,
  setStageId,
  openStageExecution,
  setTaskId,
  resolveInitialStageId
} = useRequirementWorkspace()

const { stages, loadStages, createStage, updateStage, deleteStage } = useRequirementStages()

const {
  stageTasksCache,
  stageDependenciesCache,
  loadStageTasks,
  updateTaskLocallyAndPersist,
  createTask,
  deleteTask,
  addDependency,
  removeDependency
} = useStageTasks()

const { filters, resetFilters, updateFilters } = useTaskFilters()

const requirement = ref<Requirement | null>(null)
const loadingReq = ref(false)
const workspaceLoadError = ref('')
const planEditorVisible = ref(false)
const manualColumns = ref<string[]>([])
const savingTaskId = ref<number | null>(null)
const overviewLoading = ref(false)
const overviewError = ref('')
let workspaceInitRequestId = 0

const stagesDoneCount = computed(() => stages.value.filter(s => s.status === 'DONE').length)

// 当前激活 Stage 的任务树
const currentTree = computed<SubTask[]>(() => {
  if (!currentStageId.value) return []
  return stageTasksCache.value[currentStageId.value] || []
})

// 当前过滤后的任务树
const currentFilteredTasks = computed<SubTask[]>(() => {
  return filterTreeData(currentTree.value, filters)
})

// 当前展开的扁平数组
const currentFlatTasks = computed<SubTask[]>(() => {
  return flattenTaskTree(currentTree.value)
})

// 当前前置依赖
const currentDependencies = computed(() => {
  if (!currentStageId.value) return []
  return stageDependenciesCache.value[currentStageId.value] || []
})

// 当前动态列 Keys
const currentColumns = computed(() => {
  const scanned = scanCustomColumns(currentTree.value)
  return Array.from(new Set([...scanned, ...manualColumns.value]))
})

// 当前选中的 Task 对象
const selectedTask = computed<SubTask | null>(() => {
  if (!currentTaskId.value) return null
  return findTaskInTree(currentTree.value, currentTaskId.value)
})

// 监听当前 Stage 变化，按需拉取数据
watch(
  currentStageId,
  async newStageId => {
    if (newStageId) {
      try {
        await loadStageTasks(newStageId)
        workspaceLoadError.value = ''
        // 若 URL 中的 taskId 不在该 Stage 内部，清除 taskId 容错
        if (currentTaskId.value && !selectedTask.value) {
          setTaskId(null)
        }
      } catch {
        workspaceLoadError.value = '阶段工作项加载失败，当前保留上次成功的数据。请重试。'
      }
    }
  },
  { immediate: true }
)

const initWorkspace = async () => {
  const requestId = ++workspaceInitRequestId
  const requestedRequirementId = requirementId.value
  loadingReq.value = true
  workspaceLoadError.value = ''
  try {
    const target = await getRequirementApi(requestedRequirementId)
    if (requestId !== workspaceInitRequestId || requestedRequirementId !== requirementId.value)
      return
    requirement.value = target
    try {
      const saved = JSON.parse(localStorage.getItem(`reqflow_manual_columns_${target.id}`) || '[]')
      manualColumns.value = Array.isArray(saved)
        ? saved.filter((item: unknown) => typeof item === 'string')
        : []
    } catch {
      manualColumns.value = []
    }
    const stageList = await loadStages(target.id)
    if (requestId !== workspaceInitRequestId || requestedRequirementId !== requirementId.value)
      return
    workspaceLoadError.value = ''
    if (activeTab.value === 'overview') void loadOverviewData()

    // 若处于 execution Tab 且没有有效 stageId，执行默认推导
    if (activeTab.value === 'execution' && !currentStageId.value) {
      const resolvedId = resolveInitialStageId(stageList)
      if (resolvedId) setStageId(resolvedId)
    }
  } catch (err) {
    if (requestId === workspaceInitRequestId) {
      workspaceLoadError.value = requirement.value
        ? '需求已加载，但阶段数据加载失败。请重试。'
        : '需求加载失败，请检查网络后重试。'
    }
  } finally {
    if (requestId === workspaceInitRequestId) loadingReq.value = false
  }
}

watch(requirementId, () => {
  requirement.value = null
  manualColumns.value = []
  stages.value = []
  setStageId(null)
  void initWorkspace()
})

const retryWorkspaceData = async () => {
  if (!requirement.value) {
    await initWorkspace()
    return
  }
  workspaceLoadError.value = ''
  try {
    await loadStages(requirement.value.id)
    if (currentStageId.value) await loadStageTasks(currentStageId.value, true)
  } catch {
    workspaceLoadError.value = '工作区数据加载失败，请检查网络后重试。'
  }
}

const loadOverviewData = async () => {
  if (!stages.value.length) return
  overviewLoading.value = true
  overviewError.value = ''
  try {
    const results = await Promise.allSettled(stages.value.map(stage => loadStageTasks(stage.id)))
    if (results.some(result => result.status === 'rejected')) {
      overviewError.value = '部分阶段数据暂时无法加载，风险信息可能不完整。请重试或进入执行页确认。'
    }
  } finally {
    overviewLoading.value = false
  }
}

watch(activeTab, tab => {
  if (tab === 'overview') void loadOverviewData()
})

const handleGoStageExecution = (stageId: number) => {
  openStageExecution(stageId)
}

const handleCreateStage = async (payload: { title: string; dateRange: [string, string] | [] }) => {
  if (!requirement.value) return
  await createStage(requirement.value.id, payload.title, payload.dateRange as [string, string])
  ElMessage.success('已新建执行阶段')
}

const handleUpdateStage = async (id: number, data: any) => {
  try {
    await updateStage(id, data)
  } catch {
    let restored = false
    if (requirement.value) {
      try {
        await loadStages(requirement.value.id)
        restored = true
      } catch {
        // The message below asks the user to reload if the server refresh fails.
      }
    }
    ElMessage.error(
      restored ? '阶段保存失败，已恢复最近保存的内容' : '阶段保存失败，请重新加载确认最新状态'
    )
  }
}

const handleDeleteStage = async (id: number) => {
  try {
    await deleteStage(id)
    if (currentStageId.value === id) {
      const nextId = resolveInitialStageId(stages.value)
      setStageId(nextId)
    }
    ElMessage.success('阶段已删除')
  } catch {
    ElMessage.error('删除阶段失败，请重试')
  }
}

const handleUpdateTask = async (task: SubTask) => {
  if (!currentStageId.value) return
  savingTaskId.value = task.id
  try {
    await updateTaskLocallyAndPersist(currentStageId.value, task)
  } catch (err) {
    ElMessage.error('保存任务失败')
  } finally {
    savingTaskId.value = null
  }
}

const handleCreateTask = async (
  payload: { title: string; assignee: string },
  complete: (saved: boolean) => void
) => {
  if (!currentStageId.value) {
    complete(false)
    return
  }
  try {
    const created = await createTask(currentStageId.value, payload.title, payload.assignee)
    ElMessage.success('任务创建成功')
    setTaskId(created.id)
    complete(true)
  } catch {
    ElMessage.error('任务创建失败，请检查后重试')
    complete(false)
  }
}

const handleAddChildTask = async (parentTask: SubTask) => {
  if (!currentStageId.value) return
  const created = await createTask(
    currentStageId.value,
    '新拆解子项',
    parentTask.assignee,
    parentTask.id
  )
  ElMessage.success('已拆解子任务')
  setTaskId(created.id)
}

const handleAddChildTaskWithTitle = async (parentTask: SubTask, title: string) => {
  if (!currentStageId.value) return
  await createTask(currentStageId.value, title, parentTask.assignee, parentTask.id)
  ElMessage.success('已添加子任务')
}

const handleDeleteTask = async (taskId: number) => {
  if (!currentStageId.value) return
  const targetTask = findTaskInTree(currentTree.value, taskId)
  const removedTaskIds = targetTask ? flattenTaskTree([targetTask]).map(task => task.id) : [taskId]
  ElMessageBox.confirm('移除该项将同步删除其所有子拆解项，是否继续？', '提示', {
    type: 'warning'
  })
    .then(async () => {
      await deleteTask(currentStageId.value!, taskId)
      if (currentTaskId.value && removedTaskIds.includes(currentTaskId.value)) {
        setTaskId(null)
      }
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

const handleAddDependency = async (predId: number) => {
  if (!currentStageId.value || !currentTaskId.value) return
  await addDependency(currentStageId.value, predId, currentTaskId.value)
  ElMessage.success('前置依赖已关联')
}

const handleRemoveDependency = async (depId: number) => {
  if (!currentStageId.value) return
  await removeDependency(currentStageId.value, depId)
  ElMessage.success('依赖已解除')
}

const promptAddNewColumn = () => {
  ElMessageBox.prompt('请输入自定义属性名称（如：接口文档、测试单号）', '➕ 追加扩展列', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '列名不能为空'
  })
    .then(({ value }) => {
      const trimmed = value.trim()
      if (!manualColumns.value.includes(trimmed)) {
        manualColumns.value.push(trimmed)
        if (requirement.value) {
          localStorage.setItem(
            `reqflow_manual_columns_${requirement.value.id}`,
            JSON.stringify(manualColumns.value)
          )
        }
        ElMessage.success(`已添加「${trimmed}」`)
      }
    })
    .catch(() => {})
}

const goBackHub = () => {
  router.push('/requirements')
}

onMounted(() => {
  initWorkspace()
})
</script>

<style scoped>
.requirement-workspace-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f7f7f5;
  overflow: hidden;
}

.workspace-body-container {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  background-color: #ffffff;
}

.workspace-load-error {
  margin: 0 24px 12px;
}

.error-view-box {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
