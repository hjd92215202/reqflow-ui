// src/features/requirement/api.ts
import request from '@/api/request'
import type { Requirement, PageResult } from '@/types'

export interface RequirementQueryParams {
  page: number
  size: number
  projectId?: number
}

export function getRequirementsListApi(
  params?: RequirementQueryParams
): Promise<PageResult<Requirement> | Requirement[]> {
  return request.get<PageResult<Requirement> | Requirement[]>('/api/requirements', { params })
}

export function getRequirementApi(id: number): Promise<Requirement> {
  return request.get<Requirement>(`/api/requirements/${id}`)
}

export function createRequirementApi(data: Partial<Requirement>): Promise<Requirement> {
  return request.post<Requirement>('/api/requirements', data)
}

export function updateRequirementApi(id: number, data: Partial<Requirement>): Promise<Requirement> {
  return request.put<Requirement>(`/api/requirements/${id}`, data)
}

export function deleteRequirementApi(id: number): Promise<string> {
  return request.delete<string>(`/api/requirements/${id}`)
}
