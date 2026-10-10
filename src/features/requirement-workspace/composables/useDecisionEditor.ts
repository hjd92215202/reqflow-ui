import { computed, ref } from 'vue'
import {
  createDecisionApi,
  getDecisionApi,
  updateDecisionApi,
  supersedeDecisionApi
} from '../api/decision'
import {
  cloneDecision,
  decisionError,
  emptyAi,
  emptyDecision,
  normalizeDecision,
  type DecisionContext,
  type DecisionRecord
} from '../types/decision'

export function useDecisionEditor(
  requirementId: () => number,
  onSaved: (record: DecisionRecord) => Promise<void>
) {
  const mode = ref<'list' | 'view' | 'create' | 'edit' | 'replace'>('list')
  const record = ref<DecisionRecord | null>(null)
  const draft = ref(emptyDecision())
  const baseline = ref(JSON.stringify(normalizeDecision(draft.value)))
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const conflict = ref(false)
  const latest = ref<DecisionRecord | null>(null)
  const comparing = ref(false)
  let requestId = 0
  const editing = computed(() => ['create', 'edit', 'replace'].includes(mode.value))
  const dirty = computed(
    () => editing.value && JSON.stringify(normalizeDecision(draft.value)) !== baseline.value
  )
  function reset() {
    requestId++
    loading.value = false
    mode.value = 'list'
    record.value = null
    error.value = ''
    conflict.value = false
    latest.value = null
    comparing.value = false
  }
  function apply(next: DecisionRecord) {
    comparing.value = false
    record.value = next
    draft.value = cloneDecision(next.content)
    draft.value.aiAssistance ??= emptyAi()
    baseline.value = JSON.stringify(normalizeDecision(draft.value))
    mode.value = 'view'
    error.value = ''
    conflict.value = false
    latest.value = null
  }
  async function load(id: number) {
    const current = ++requestId
    const requirement = requirementId()
    loading.value = true
    mode.value = 'view'
    record.value = null
    error.value = ''
    conflict.value = false
    latest.value = null
    try {
      const next = await getDecisionApi(requirement, id)
      if (current === requestId && requirement === requirementId()) apply(next)
    } catch {
      if (current === requestId) error.value = '决策加载失败，请检查权限或网络后重试。'
    } finally {
      if (current === requestId) loading.value = false
    }
  }
  function begin(kind: 'create' | 'edit' | 'replace') {
    requestId++
    loading.value = false
    comparing.value = false
    error.value = ''
    conflict.value = false
    latest.value = null
    if (kind !== 'create' && (!record.value || record.value.content.status === 'SUPERSEDED')) return
    if (kind === 'replace' && record.value?.content.status !== 'ACCEPTED') return
    draft.value = kind === 'create' ? emptyDecision() : cloneDecision(record.value!.content)
    draft.value.aiAssistance ??= emptyAi()
    if (kind === 'replace') {
      draft.value.status = 'ACCEPTED'
      draft.value.title = `${draft.value.title.slice(0, 249)}（替代）`
    }
    baseline.value = JSON.stringify(normalizeDecision(draft.value))
    mode.value = kind
  }
  async function save(context: DecisionContext) {
    if (saving.value || conflict.value || !editing.value) return false
    const validation = decisionError(draft.value)
    if (validation) {
      error.value = validation
      return false
    }
    saving.value = true
    error.value = ''
    const current = requestId
    const requirement = requirementId()
    const content = normalizeDecision(draft.value)
    try {
      const next =
        mode.value === 'create'
          ? await createDecisionApi(requirement, context, content)
          : mode.value === 'replace'
            ? await supersedeDecisionApi(
                requirement,
                record.value!.id,
                record.value!.version,
                content
              )
            : await updateDecisionApi(requirement, record.value!.id, record.value!.version, content)
      if (current !== requestId || requirement !== requirementId()) return false
      apply(next)
      await onSaved(next)
      return true
    } catch (reason) {
      if (current !== requestId || requirement !== requirementId()) return false
      const response = (reason as { response?: { status?: number; data?: { message?: string } } })
        .response
      conflict.value = response?.status === 409
      error.value = conflict.value
        ? '决策已变化，输入已保留。请比较最新内容后继续。'
        : '保存失败，输入已保留，请检查后重试。'
      return false
    } finally {
      saving.value = false
    }
  }
  async function compareLatest() {
    if (!record.value || comparing.value) return
    const current = requestId
    const id = record.value.id
    comparing.value = true
    try {
      const next = await getDecisionApi(requirementId(), id)
      if (current === requestId) latest.value = next
    } catch {
      if (current === requestId) error.value = '最新版本加载失败，草稿仍保留，请重试。'
    } finally {
      if (current === requestId) comparing.value = false
    }
  }
  function keepDraft() {
    if (
      !latest.value ||
      latest.value.content.status === 'SUPERSEDED' ||
      (mode.value === 'replace' && latest.value.content.status !== 'ACCEPTED')
    )
      return
    record.value = latest.value
    latest.value = null
    conflict.value = false
    error.value = ''
  }
  function useLatest() {
    if (latest.value) apply(latest.value)
  }
  return {
    mode,
    record,
    draft,
    loading,
    saving,
    error,
    conflict,
    latest,
    comparing,
    editing,
    dirty,
    reset,
    apply,
    load,
    begin,
    save,
    compareLatest,
    keepDraft,
    useLatest
  }
}
