// src/features/requirement-workspace/api/dependency.ts
import request from '@/api/request'
import type { TaskDependency, DependencyType } from '@/types'

export function getDependenciesApi(stageId: number): Promise<TaskDependency[]> {
  return request.get<TaskDependency[]>('/api/matrix/dependencies', {
    params: { stageId }
  })
}

export async function createDependencyApi(data: {
  stageId: number
  predecessorId: number
  successorId: number
  type?: DependencyType
}): Promise<TaskDependency> {
  return request.post<TaskDependency>('/api/matrix/dependencies', data)
}

export function deleteDependencyApi(_stageId: number, id: number): Promise<string> {
  return request.delete<string>(`/api/matrix/dependencies/${id}`)
}
