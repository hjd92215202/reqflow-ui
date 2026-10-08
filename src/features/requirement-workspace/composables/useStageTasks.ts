import { ref } from 'vue'
import { getSubTasksApi, createSubTaskApi, updateSubTaskApi, deleteSubTaskApi } from '../api/task'
import { getDependenciesApi, createDependencyApi, deleteDependencyApi } from '../api/dependency'
import type { SubTask, TaskDependency } from '@/types'
import { arrayToTree, updateOriginalNode } from './useTaskTree'

export function useStageTasks() {
  const stageTasksCache = ref<Record<number, SubTask[]>>({})
  const stageDependenciesCache = ref<Record<number, TaskDependency[]>>({})
  const loading = ref(false)

  const loadStageTasks = async (stageId: number, forceRefresh = false): Promise<SubTask[]> => {
    if (!forceRefresh && stageTasksCache.value[stageId]) {
      return stageTasksCache.value[stageId]
    }
    loading.value = true
    try {
      const [flatTasks, deps] = await Promise.all([
        getSubTasksApi(stageId),
        getDependenciesApi(stageId)
      ])
      const tree = arrayToTree(flatTasks)
      stageTasksCache.value[stageId] = tree
      stageDependenciesCache.value[stageId] = deps
      return tree
    } finally {
      loading.value = false
    }
  }

  const invalidateStage = (stageId: number) => {
    delete stageTasksCache.value[stageId]
    delete stageDependenciesCache.value[stageId]
  }

  const updateTaskLocallyAndPersist = async (stageId: number, task: SubTask): Promise<SubTask> => {
    const cachedTree = stageTasksCache.value[stageId]
    if (cachedTree) {
      updateOriginalNode(cachedTree, task)
    }

    const payload: Partial<SubTask> = {
      id: task.id,
      stageId: task.stageId,
      parentId: task.parentId,
      title: task.title,
      assignee: task.assignee,
      status: task.status,
      startDate: task.startDate,
      endDate: task.endDate,
      note: task.note || '',
      customFields: task.customFields
    }

    try {
      return await updateSubTaskApi(task.id, payload)
    } catch (err) {
      await loadStageTasks(stageId, true)
      throw err
    }
  }

  const createTask = async (
    stageId: number,
    title: string,
    assignee?: string,
    parentId?: number | null
  ) => {
    const created = await createSubTaskApi({
      stageId,
      parentId: parentId || null,
      title: title.trim(),
      assignee: assignee ? assignee.trim() : '',
      status: 'TODO',
      customFields: {}
    })
    await loadStageTasks(stageId, true)
    return created
  }

  const deleteTask = async (stageId: number, taskId: number) => {
    await deleteSubTaskApi(taskId)
    await loadStageTasks(stageId, true)
  }

  const addDependency = async (stageId: number, predecessorId: number, successorId: number) => {
    const dep = await createDependencyApi({
      stageId,
      predecessorId,
      successorId,
      type: 'FINISH_TO_START'
    })
    if (!stageDependenciesCache.value[stageId]) {
      stageDependenciesCache.value[stageId] = []
    }
    stageDependenciesCache.value[stageId].push(dep)
    return dep
  }

  const removeDependency = async (stageId: number, depId: number) => {
    await deleteDependencyApi(stageId, depId)
    if (stageDependenciesCache.value[stageId]) {
      stageDependenciesCache.value[stageId] = stageDependenciesCache.value[stageId].filter(
        d => d.id !== depId
      )
    }
  }

  return {
    stageTasksCache,
    stageDependenciesCache,
    loading,
    loadStageTasks,
    invalidateStage,
    updateTaskLocallyAndPersist,
    createTask,
    deleteTask,
    addDependency,
    removeDependency
  }
}
