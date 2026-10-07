import { computed } from 'vue'
import type { SubTask } from '@/types'
import { findTaskInTree } from './useTaskTree'

export function useTaskSelection(
  tasksGetter: () => SubTask[],
  currentTaskIdGetter: () => number | null,
  onSelectTask: (taskId: number | null) => void
) {
  const selectedTask = computed<SubTask | null>(() => {
    const taskId = currentTaskIdGetter()
    if (!taskId) return null
    return findTaskInTree(tasksGetter(), taskId)
  })

  const selectTask = (task: SubTask | null) => {
    onSelectTask(task ? task.id : null)
  }

  const clearSelection = () => {
    onSelectTask(null)
  }

  return {
    selectedTask,
    selectTask,
    clearSelection
  }
}
