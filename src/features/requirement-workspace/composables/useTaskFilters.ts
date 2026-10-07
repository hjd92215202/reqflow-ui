import { reactive } from 'vue'
import type { TaskFilters, TaskStatus } from '@/types'

export function useTaskFilters() {
  const filters = reactive<TaskFilters>({
    keyword: '',
    statuses: [],
    assignees: [],
    customFields: {}
  })

  const resetFilters = () => {
    filters.keyword = ''
    filters.statuses = []
    filters.assignees = []
    filters.customFields = {}
  }

  const updateFilters = (payload: Partial<TaskFilters>) => {
    if (payload.keyword !== undefined) filters.keyword = payload.keyword
    if (payload.statuses !== undefined) filters.statuses = payload.statuses
    if (payload.assignees !== undefined) filters.assignees = payload.assignees
    if (payload.customFields !== undefined) filters.customFields = payload.customFields
  }

  const setStatusFilter = (statuses: TaskStatus[]) => {
    filters.statuses = statuses
  }

  const setAssigneeFilter = (assignees: string[]) => {
    filters.assignees = assignees
  }

  const setCustomFieldFilter = (fieldKey: string, values: string[]) => {
    if (!values || values.length === 0) {
      delete filters.customFields[fieldKey]
    } else {
      filters.customFields[fieldKey] = values
    }
  }

  return {
    filters,
    resetFilters,
    updateFilters,
    setStatusFilter,
    setAssigneeFilter,
    setCustomFieldFilter
  }
}
