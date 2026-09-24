<!-- src/features/workspace/components/ProjectSelector.vue -->
<template>
  <div class="project-selector-container">
    <el-icon class="proj-icon"><FolderOpened /></el-icon>
    <el-select
      v-model="activeProjectId"
      size="small"
      placeholder="切换工程项目"
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
        <div class="create-proj-footer" @click="createDialogVisible = true">
          <span>➕ 划分新工程项目...</span>
        </div>
      </template>
    </el-select>

    <CreateProjectDialog v-model="createDialogVisible" @created="loadProjects" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkspaceStore } from '@/store/workspace'
import { getWorkspacesApi, getProjectsApi } from '../api'
import { FolderOpened } from '@element-plus/icons-vue'
import CreateProjectDialog from './CreateProjectDialog.vue'

const workspaceStore = useWorkspaceStore()
const activeProjectId = ref<number | null>(workspaceStore.activeProjectId)
const createDialogVisible = ref(false)

const loadProjects = async () => {
  try {
    let wsId = workspaceStore.activeWorkspaceId
    if (!wsId) {
      const wsList = await getWorkspacesApi().catch(() => [])
      if (wsList && wsList.length > 0) {
        wsId = wsList[0].id
        workspaceStore.setActiveWorkspace(wsId)
        workspaceStore.setWorkspaces(wsList)
      } else {
        wsId = 1
        workspaceStore.setActiveWorkspace(1)
      }
    }

    const projList = await getProjectsApi(wsId).catch(() => [])
    if (projList && projList.length > 0) {
      workspaceStore.setProjects(projList)
      // 若当前未选项目或选中的项目不在列表里，默认选第一个
      if (!activeProjectId.value || !projList.some(p => p.id === activeProjectId.value)) {
        activeProjectId.value = projList[0].id
        workspaceStore.setActiveProject(projList[0].id)
      }
    }
  } catch (err) {}
}

const handleProjectChange = (val: number) => {
  workspaceStore.setActiveProject(val)
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

:deep(.project-select .el-input__wrapper) {
  box-shadow: none !important;
  background-color: rgba(55, 53, 47, 0.05) !important;
  padding: 0 8px !important;
  height: 24px !important;
  border-radius: 4px;
}

:deep(.project-select .el-input__inner) {
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
  padding: 6px 12px;
  font-size: 12px;
  color: #2383e2;
  cursor: pointer;
  font-weight: 600;
  border-top: 1px solid rgba(55, 53, 47, 0.08);
}

.create-proj-footer:hover {
  background-color: rgba(35, 131, 226, 0.06);
}
</style>
