export interface SuccessCriterion {
  id: string
  description: string
  suggestedMethod: string
  targetValue: string
}

export interface RequirementDefinition {
  problemStatement: string
  targetOutcome: string
  constraints: string[]
  assumptions: string[]
  outOfScope: string[]
  successCriteria: SuccessCriterion[]
}

export interface DefinitionResponse {
  definition: RequirementDefinition
  state: 'NOT_STARTED' | 'IN_PROGRESS' | 'CONFIRMED'
  version: number
  confirmedAt: string | null
  confirmedBy: number | null
}

export function emptyDefinition(): RequirementDefinition {
  return {
    problemStatement: '',
    targetOutcome: '',
    constraints: [],
    assumptions: [],
    outOfScope: [],
    successCriteria: []
  }
}

export function normalizeDefinition(value: RequirementDefinition): RequirementDefinition {
  const normalizeLines = (lines: string[]) => lines.map(line => line.trim()).filter(Boolean)
  return {
    problemStatement: value.problemStatement.trim(),
    targetOutcome: value.targetOutcome.trim(),
    constraints: normalizeLines(value.constraints),
    assumptions: normalizeLines(value.assumptions),
    outOfScope: normalizeLines(value.outOfScope),
    successCriteria: value.successCriteria.map(criterion => ({
      id: criterion.id,
      description: criterion.description.trim(),
      suggestedMethod: criterion.suggestedMethod.trim(),
      targetValue: criterion.targetValue.trim()
    }))
  }
}

export function definitionIsComplete(value: RequirementDefinition): boolean {
  return Boolean(
    value.problemStatement.trim() &&
    value.targetOutcome.trim() &&
    value.successCriteria.length &&
    value.successCriteria.every(criterion => criterion.description.trim())
  )
}

export function definitionError(value: RequirementDefinition): string {
  if (value.problemStatement.length > 10000 || value.targetOutcome.length > 10000) {
    return '问题或期望结果最多 10000 字'
  }
  for (const lines of [value.constraints, value.assumptions, value.outOfScope]) {
    if (lines.length > 50 || lines.some(line => line.length > 1000)) {
      return '每组最多 50 条，每条最多 1000 字'
    }
  }
  if (value.successCriteria.length > 50) return '成功标准最多 50 条'
  if (value.successCriteria.some(criterion => !criterion.description.trim())) {
    return '请填写成功标准描述，或删除空白条目'
  }
  if (
    value.successCriteria.some(criterion =>
      [criterion.description, criterion.suggestedMethod, criterion.targetValue].some(
        field => field.length > 1000
      )
    )
  ) {
    return '成功标准的每个字段最多 1000 字'
  }
  return ''
}
