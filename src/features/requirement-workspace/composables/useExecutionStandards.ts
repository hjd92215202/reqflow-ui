import { inject, provide, computed, reactive, type InjectionKey, type Ref } from 'vue'
import request from '@/api/request'
import { useDefinitionCapability } from '@/features/requirement/composables/useDefinitionCapability'
import type { SubTask, TaskStandards } from '@/types'

export interface TaskStandardsDraft {
  deliverable: string
  completionCriteria: string
  baseline: string
  editing: boolean
  saving: boolean
  error: string
}
interface ExecutionStandardsContext {
  available: Ref<boolean>
  save: (task: SubTask, changes: TaskStandards) => Promise<SubTask>
  drafts: Record<number, TaskStandardsDraft>
}

export const executionStandardsKey: InjectionKey<ExecutionStandardsContext> =
  Symbol('executionStandards')

export async function supportsExecutionStandardsApi(): Promise<boolean> {
  const response = await request.get<{ executionStandards?: number } | string>(
    '/api/capabilities',
    {
      validateStatus: status => status === 200 || status === 404
    }
  )
  return typeof response === 'object' && response !== null && response.executionStandards === 1
}

export function provideExecutionStandards(save: ExecutionStandardsContext['save']) {
  const { capability, retryCapability } = useDefinitionCapability(supportsExecutionStandardsApi)
  const context = {
    available: computed(() => capability.value === 'available'),
    save,
    drafts: reactive<Record<number, TaskStandardsDraft>>({})
  }
  provide(executionStandardsKey, context)
  return { ...context, capability, retryCapability }
}

export function useExecutionStandards() {
  return inject(executionStandardsKey, {
    available: computed(() => false),
    drafts: reactive<Record<number, TaskStandardsDraft>>({}),
    save: async () => {
      throw new Error('当前服务未启用交付标准')
    }
  })
}
