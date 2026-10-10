import { computed, inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import { useDefinitionCapability } from '@/features/requirement/composables/useDefinitionCapability'
import { supportsDecisionRecordsApi } from '../api/decision'
import type { DecisionContext } from '../types/decision'
interface DecisionActions {
  available: Ref<boolean>
  revision?: Ref<number>
  open: (context?: DecisionContext, id?: number) => void
}
export const decisionActionsKey: InjectionKey<DecisionActions> = Symbol('decisionActions')
export function provideDecisionActions(open: DecisionActions['open']) {
  const state = useDefinitionCapability(supportsDecisionRecordsApi)
  const revision = ref(0)
  const actions = {
    available: computed(() => state.capability.value === 'available'),
    revision,
    open
  }
  provide(decisionActionsKey, actions)
  return { ...state, ...actions, notifySaved: () => revision.value++ }
}
export function useDecisionActions() {
  return inject(decisionActionsKey, { available: computed(() => false), open: () => {} })
}
