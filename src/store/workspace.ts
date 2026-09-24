// src/store/workspace.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Workspace, Project } from '@/types'

export const useWorkspaceStore = defineStore('workspace', () => {
  // 当前激活的空间与项目 ID（读取持久化数据）
  const activeWorkspaceId = ref<number | null>(
    localStorage.getItem('activeWorkspaceId')
      ? Number(localStorage.getItem('activeWorkspaceId'))
      : null
  )

  const activeProjectId = ref<number | null>(
    localStorage.getItem('activeProjectId') ? Number(localStorage.getItem('activeProjectId')) : null
  )

  // 运行时缓存列表
  const workspaces = ref<Workspace[]>([])
  const projects = ref<Project[]>([])

  function setActiveWorkspace(workspaceId: number | null): void {
    activeWorkspaceId.value = workspaceId
    if (workspaceId !== null) {
      localStorage.setItem('activeWorkspaceId', String(workspaceId))
    } else {
      localStorage.removeItem('activeWorkspaceId')
    }
  }

  function setActiveProject(projectId: number | null): void {
    activeProjectId.value = projectId
    if (projectId !== null) {
      localStorage.setItem('activeProjectId', String(projectId))
    } else {
      localStorage.removeItem('activeProjectId')
    }
  }

  function setWorkspaces(list: Workspace[]): void {
    workspaces.value = list
  }

  function setProjects(list: Project[]): void {
    projects.value = list
  }

  function clearWorkspace(): void {
    activeWorkspaceId.value = null
    activeProjectId.value = null
    workspaces.value = []
    projects.value = []
    localStorage.removeItem('activeWorkspaceId')
    localStorage.removeItem('activeProjectId')
  }

  return {
    activeWorkspaceId,
    activeProjectId,
    workspaces,
    projects,
    setActiveWorkspace,
    setActiveProject,
    setWorkspaces,
    setProjects,
    clearWorkspace
  }
})
