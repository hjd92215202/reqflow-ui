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

export interface WorkspaceMember {
  userId: number
  username: string
  displayName: string
  role: string
}

export interface WorkspaceMembersResult {
  canManage: boolean
  members: WorkspaceMember[]
}

export function getWorkspaceMembersApi(workspaceId: number): Promise<WorkspaceMembersResult> {
  return request.get<WorkspaceMembersResult>(`/api/workspaces/${workspaceId}/members`)
}

export function addWorkspaceMemberApi(workspaceId: number, username: string): Promise<WorkspaceMember> {
  return request.post<WorkspaceMember>(`/api/workspaces/${workspaceId}/members`, { username })
}

export function removeWorkspaceMemberApi(workspaceId: number, userId: number): Promise<void> {
  return request.delete<void>(`/api/workspaces/${workspaceId}/members/${userId}`)
}
