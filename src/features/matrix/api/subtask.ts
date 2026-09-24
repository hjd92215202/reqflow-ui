// src/features/matrix/api/subtask.ts
import request from '@/api/request'
import type { SubTask } from '@/types'

export function getSubTasksApi(stageId: number): Promise<SubTask[]> {
  return request.get<SubTask[]>(`/api/subtasks/stage/${stageId}`)
}

export function createSubTaskApi(data: Partial<SubTask>): Promise<SubTask> {
  return request.post<SubTask>('/api/subtasks', data)
}

export function updateSubTaskApi(id: number, data: Partial<SubTask>): Promise<SubTask> {
  return request.put<SubTask>(`/api/subtasks/${id}`, data)
}

export function deleteSubTaskApi(id: number): Promise<string> {
  return request.delete<string>(`/api/subtasks/${id}`)
}
