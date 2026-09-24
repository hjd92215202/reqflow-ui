// src/features/matrix/api/dependency.ts
import request from '@/api/request'
import type { TaskDependency, DependencyType } from '@/types'

/** 获取当前执行阶段下所有的任务依赖边 */
export async function getDependenciesApi(stageId: number): Promise<TaskDependency[]> {
  try {
    return await request.get<TaskDependency[]>('/api/matrix/dependencies', {
      params: { stageId }
    })
  } catch (err) {
    // 优雅本地降级兜底，保证无后端阶段依然可在前端顺畅体验拓扑能力
    const localKey = `reqflow_deps_stage_${stageId}`
    const saved = localStorage.getItem(localKey)
    return saved ? JSON.parse(saved) : []
  }
}

/** 为后置任务关联一个前置依赖任务 */
export async function createDependencyApi(data: {
  stageId: number
  predecessorId: number
  successorId: number
  type?: DependencyType
}): Promise<TaskDependency> {
  try {
    return await request.post<TaskDependency>('/api/matrix/dependencies', data)
  } catch (err) {
    const localKey = `reqflow_deps_stage_${data.stageId}`
    const saved = localStorage.getItem(localKey)
    const list: TaskDependency[] = saved ? JSON.parse(saved) : []
    const newDep: TaskDependency = {
      id: Date.now(),
      predecessorId: data.predecessorId,
      successorId: data.successorId,
      type: data.type || 'FINISH_TO_START',
      createdAt: new Date().toISOString()
    }
    list.push(newDep)
    localStorage.setItem(localKey, JSON.stringify(list))
    return newDep
  }
}

/** 解除任务之间的依赖关系 */
export async function deleteDependencyApi(stageId: number, id: number): Promise<string> {
  try {
    return await request.delete<string>(`/api/matrix/dependencies/${id}`)
  } catch (err) {
    const localKey = `reqflow_deps_stage_${stageId}`
    const saved = localStorage.getItem(localKey)
    if (saved) {
      const list: TaskDependency[] = JSON.parse(saved)
      const filtered = list.filter(d => d.id !== id)
      localStorage.setItem(localKey, JSON.stringify(filtered))
    }
    return 'success'
  }
}
