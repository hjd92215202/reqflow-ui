import { ref } from 'vue'
import { getStagesApi, createStageApi, updateStageApi, deleteStageApi } from '../api/stage'
import type { Stage, SubTask } from '@/types'

export function useRequirementStages() {
  const stages = ref<Stage[]>([])
  const loading = ref(false)

  const loadStages = async (requirementId: number): Promise<Stage[]> => {
    loading.value = true
    try {
      const data = await getStagesApi(requirementId)
      stages.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  const createStage = async (
    requirementId: number,
    title: string,
    dateRange?: [string, string]
  ) => {
    const payload: Partial<Stage> = {
      requirementId,
      title: title.trim(),
      status: 'TODO',
      startDate: dateRange?.[0] || null,
      endDate: dateRange?.[1] || null
    }
    const created = await createStageApi(payload)
    stages.value.push(created)
    return created
  }

  const updateStage = async (id: number, data: Partial<Stage>) => {
    const idx = stages.value.findIndex(s => s.id === id)
    const current = idx === -1 ? undefined : stages.value[idx]
    // The API accepts a Stage-shaped body; send the complete current stage so
    // changing one field cannot clear required or unrelated values.
    const payload = current ? { ...current, ...data } : data
    const updated = await updateStageApi(id, payload)
    if (idx !== -1) {
      stages.value[idx] = { ...stages.value[idx], ...updated }
    }
    return updated
  }

  const deleteStage = async (id: number) => {
    await deleteStageApi(id)
    stages.value = stages.value.filter(s => s.id !== id)
  }

  /** 计算阶段进度（前端派生：DONE Task Count / Total Task Count） */
  const calculateStageProgress = (tasks: SubTask[]) => {
    if (!tasks || tasks.length === 0) {
      return { total: 0, done: 0, percent: 0 }
    }
    let total = 0
    let done = 0
    const count = (list: SubTask[]) => {
      for (const t of list) {
        total++
        if (t.status === 'DONE') done++
        if (t.children && t.children.length > 0) count(t.children)
      }
    }
    count(tasks)
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, percent }
  }

  return {
    stages,
    loading,
    loadStages,
    createStage,
    updateStage,
    deleteStage,
    calculateStageProgress
  }
}
