import { ref } from 'vue'
import { getSubTasksApi, createSubTaskApi, updateSubTaskApi, deleteSubTaskApi } from '../api/task'
import { getDependenciesApi, createDependencyApi, deleteDependencyApi } from '../api/dependency'
import type { SubTask, TaskDependency, TaskStandards } from '@/types'
import { arrayToTree, updateOriginalNode } from './useTaskTree'

export function useStageTasks() {
  const stageTasksCache = ref<Record<number, SubTask[]>>({})
  const stageDependenciesCache = ref<Record<number, TaskDependency[]>>({})
  const loading = ref(false)
  const pendingSaves = new Map<number, Promise<SubTask>>()

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

  const updateTaskLocallyAndPersist = (
    stageId: number,
    task: SubTask,
    standards?: TaskStandards
  ): Promise<SubTask> => {
    // Ordinary matrix/detail edits never include the independent standards draft.
    const payload: Partial<SubTask> = standards
      ? { ...standards }
      : {
          id: task.id,
          stageId: task.stageId,
          parentId: task.parentId,
          title: task.title,
          assignee: task.assignee,
          status: task.status,
          startDate: task.startDate,
          endDate: task.endDate,
          note: task.note || '',
          customFields: { ...task.customFields }
        }
    const save = async () => {
      if (!standards && stageTasksCache.value[stageId]) {
        updateOriginalNode(stageTasksCache.value[stageId], {
          ...task,
          deliverable: undefined,
          completionCriteria: undefined
        })
      }
      try {
        const updated = await updateSubTaskApi(task.id, payload)
        if (stageTasksCache.value[stageId] && updated)
          updateOriginalNode(stageTasksCache.value[stageId], updated)
        return updated
      } catch (err) {
        await loadStageTasks(stageId, true).catch(() => {})
        throw err
      }
    }
    // Serialize the same task so late ordinary responses cannot replace newer standards.
    const pending = (pendingSaves.get(task.id) ?? Promise.resolve()).catch(() => {}).then(save)
    pendingSaves.set(task.id, pending)
    void pending
      .finally(() => {
        if (pendingSaves.get(task.id) === pending) pendingSaves.delete(task.id)
      })
      .catch(() => {})
    return pending
  }

  const createTask = async (
    stageId: number,
    title: string,
    assignee?: string,
    parentId?: number | null,
    standards?: TaskStandards
  ) => {
    const created = await createSubTaskApi({
      stageId,
      parentId: parentId || null,
      title: title.trim(),
      assignee: assignee ? assignee.trim() : '',
      status: 'TODO',
      customFields: {},
      ...standards
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
