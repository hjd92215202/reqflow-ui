// src/features/requirement-workspace/api/stage.ts
import request from '@/api/request'
import type { Stage } from '@/types'

export function getStagesApi(requirementId: number): Promise<Stage[]> {
  return request.get<Stage[]>(`/api/stages/requirement/${requirementId}`)
}

export function createStageApi(data: Partial<Stage>): Promise<Stage> {
  return request.post<Stage>('/api/stages', data)
}

export function updateStageApi(id: number, data: Partial<Stage>): Promise<Stage> {
  return request.put<Stage>(`/api/stages/${id}`, data)
}

export function deleteStageApi(id: number): Promise<string> {
  return request.delete<string>(`/api/stages/${id}`)
}
