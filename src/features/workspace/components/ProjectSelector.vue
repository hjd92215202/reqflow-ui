<!-- src/features/workspace/components/ProjectSelector.vue -->
<template>
  <div class="project-selector-container">
    <el-icon class="proj-icon"><FolderOpened /></el-icon>
    <el-select
      v-model="activeWorkspaceId"
      size="small"
      :loading="loading"
      :placeholder="'选择工作空间'"
      class="workspace-select"
      @change="handleWorkspaceChange"
    >
      <el-option
        v-for="workspace in workspaceStore.workspaces"
        :key="workspace.id"
        :label="workspace.name"
        :value="workspace.id"
      />
      <template #footer>
        <button type="button" class="create-proj-footer" @click="workspaceDialogVisible = true">
          <span>＋ 新建工作空间</span>
        </button>
      </template>
    </el-select>
    <el-select
      v-model="activeProjectId"
      size="small"
      :loading="loading"
      :placeholder="workspaceStore.projects.length ? '切换工程项目' : '暂无项目，请新建'"
      class="project-select"
      @change="handleProjectChange"
    >
      <el-option
        v-for="proj in workspaceStore.projects"
        :key="proj.id"
        :label="`${proj.name} (${proj.identifier})`"
        :value="proj.id"
      >
        <div class="project-option-row">
          <span class="proj-name">{{ proj.name }}</span>
          <el-tag size="small" type="info" class="proj-badge">{{ proj.identifier }}</el-tag>
        </div>
      </el-option>

      <template #footer>
        <button type="button" class="create-proj-footer" @click="membersDialogVisible = true">
          <span>成员管理</span>
        </button>
        <button type="button" class="create-proj-footer" @click="createDialogVisible = true">
          <span>➕ 划分新工程项目...</span>
        </button>
      </template>
    </el-select>
    <el-tooltip v-if="loadError" :content="loadError" placement="bottom">
      <el-button
        link
        type="danger"
        size="small"
        :loading="loading"
        aria-label="工作区或项目加载失败，点击重试"
        @click="loadProjects"
      >
        <el-icon><Refresh /></el-icon>
      </el-button>
    </el-tooltip>

    <CreateProjectDialog v-model="createDialogVisible" @created="loadProjects" />
    <WorkspaceDialog v-model="workspaceDialogVisible" @created="handleWorkspaceCreated" />
    <WorkspaceMembersDialog
      v-model="membersDialogVisible"
      :workspace-id="workspaceStore.activeWorkspaceId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/store/workspace'
import { getWorkspacesApi, getProjectsApi } from '../api'
import { FolderOpened, Refresh } from '@element-plus/icons-vue'
import CreateProjectDialog from './CreateProjectDialog.vue'
import WorkspaceMembersDialog from './WorkspaceMembersDialog.vue'
import WorkspaceDialog from './WorkspaceDialog.vue'

const workspaceStore = useWorkspaceStore()
const router = useRouter()
const activeProjectId = ref<number | null>(workspaceStore.activeProjectId)
const activeWorkspaceId = ref<number | null>(workspaceStore.activeWorkspaceId)
const createDialogVisible = ref(false)
const workspaceDialogVisible = ref(false)
const membersDialogVisible = ref(false)
const loading = ref(false)
const loadError = ref('')
let loadRequestId = 0

const returnToRequirementListOnScopeChange = () => {
  if (router.currentRoute.value.name === 'RequirementWorkspace') {
    void router.replace({ name: 'Requirements' })
  }
}

const loadProjects = async () => {
  const requestId = ++loadRequestId
  loading.value = true
  try {
    const wsList = await getWorkspacesApi()
    if (requestId !== loadRequestId) return

    const selectedWorkspace =
      wsList.find(item => item.id === workspaceStore.activeWorkspaceId) || wsList[0]

    if (!selectedWorkspace) {
      workspaceStore.setWorkspaces(wsList)
      workspaceStore.setActiveWorkspace(null)
      workspaceStore.setProjects([])
      activeProjectId.value = null
      workspaceStore.setActiveProject(null)
      loadError.value = ''
      return
    }

    const projList = await getProjectsApi(selectedWorkspace.id)
    if (requestId !== loadRequestId) return

    workspaceStore.setWorkspaces(wsList)
    workspaceStore.setActiveWorkspace(selectedWorkspace.id)
    activeWorkspaceId.value = selectedWorkspace.id
    workspaceStore.setProjects(projList)
    const selectedProject =
      projList.find(item => item.id === workspaceStore.activeProjectId) || projList[0]
    activeProjectId.value = selectedProject?.id ?? null
    workspaceStore.setActiveProject(selectedProject?.id ?? null)
    loadError.value = ''
  } catch {
    if (requestId === loadRequestId) loadError.value = '工作区或项目加载失败，点击重试。'
  } finally {
    if (requestId === loadRequestId) loading.value = false
  }
}

const handleWorkspaceChange = async (workspaceId: number) => {
  workspaceStore.setActiveWorkspace(workspaceId)
  workspaceStore.setActiveProject(null)
  activeProjectId.value = null
  workspaceStore.setProjects([])
  returnToRequirementListOnScopeChange()
  await loadProjects()
}

const handleWorkspaceCreated = async (workspace: { id: number }) => {
  workspaceStore.setActiveWorkspace(workspace.id)
  workspaceStore.setActiveProject(null)
  activeWorkspaceId.value = workspace.id
  activeProjectId.value = null
  await loadProjects()
}

const handleProjectChange = (val: number) => {
  workspaceStore.setActiveProject(val)
  returnToRequirementListOnScopeChange()
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.project-selector-container {
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.proj-icon {
  font-size: 14px;
  color: #5f5e5b;
}

.project-select {
  width: 220px;
}

.workspace-select {
  width: 180px;
}

:deep(.project-select .el-input__wrapper),
:deep(.workspace-select .el-input__wrapper) {
  box-shadow: none !important;
  background-color: rgba(55, 53, 47, 0.05) !important;
  padding: 0 8px !important;
  height: 24px !important;
  border-radius: 4px;
}

:deep(.project-select .el-input__inner),
:deep(.workspace-select .el-input__inner) {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #37352f !important;
}

.project-option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.proj-name {
  font-size: 12px;
  font-weight: 500;
  color: #37352f;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-badge {
  font-size: 10px !important;
  height: 18px !important;
  line-height: 18px !important;
}

.create-proj-footer {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: inherit;
  padding: 6px 12px;
  font-size: 12px;
  color: #2383e2;
  cursor: pointer;
  font-weight: 600;
  border-top: 1px solid rgba(55, 53, 47, 0.08);
}

.create-proj-footer:focus-visible {
  outline: 2px solid rgba(35, 131, 226, 0.55);
  outline-offset: -2px;
}

.create-proj-footer:hover {
  background-color: rgba(35, 131, 226, 0.06);
}
</style>
