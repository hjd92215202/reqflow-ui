// src/features/workspace/api.ts
import request from '@/api/request'
import type { Workspace, Project } from '@/types'

export function getWorkspacesApi(): Promise<Workspace[]> {
  return request.get<Workspace[]>('/api/workspaces')
}

export function createWorkspaceApi(data: {
  name: string
  description?: string
}): Promise<Workspace> {
  return request.post<Workspace>('/api/workspaces', data)
}

export function getProjectsApi(workspaceId: number): Promise<Project[]> {
  return request.get<Project[]>('/api/projects', { params: { workspaceId } })
}

export function createProjectApi(data: {
  workspaceId: number
  name: string
  identifier: string
  description?: string
  leadId?: number
}): Promise<Project> {
  return request.post<Project>('/api/projects', data)
}
