export type DecisionStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED'
export interface DecisionOption {
  name: string
  pros: string | null
  cons: string | null
}
export interface AiAssistance {
  phases: string[]
  contribution: string | null
  humanJudgment: string | null
  handling: string | null
  verification: string | null
}
export interface DecisionContent {
  title: string
  context: string
  options: DecisionOption[]
  chosenOption: string | null
  rationale: string | null
  assumptions: string[]
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | null
  status: DecisionStatus
  reviewDate: string | null
  aiAssistance: AiAssistance | null
}
export interface DecisionContext {
  stageId?: number | null
  subTaskId?: number | null
  stageTitle?: string | null
  subTaskTitle?: string | null
}
export interface DecisionRecord extends DecisionContext {
  id: number
  requirementId: number
  content: DecisionContent
  version: number
  supersedesDecisionId: number | null
  supersededByDecisionId: number | null
  createdBy: number
  updatedBy: number
  createdAt: string
  updatedAt: string
}
export const decisionStatuses: Record<DecisionStatus, string> = {
  PROPOSED: '拟议',
  ACCEPTED: '已采纳',
  REJECTED: '已否决',
  SUPERSEDED: '已被替代'
}
export const aiPhases: Record<string, string> = {
  CLARIFICATION: '需求澄清',
  COMPARISON: '方案比较',
  CODING: '代码辅助',
  TEST_DESIGN: '测试设计',
  DOCUMENTATION: '文档整理',
  OTHER: '其他'
}
export const aiHandling: Record<string, string> = {
  ACCEPTED: '采纳',
  MODIFIED: '修改后采纳',
  REJECTED: '拒绝',
  BRAINSTORMING: '仅用于发散'
}
export const emptyAi = (): AiAssistance => ({
  phases: [],
  contribution: '',
  humanJudgment: '',
  handling: null,
  verification: ''
})
export const emptyDecision = (): DecisionContent => ({
  title: '',
  context: '',
  options: [],
  chosenOption: '',
  rationale: '',
  assumptions: [],
  confidence: null,
  status: 'PROPOSED',
  reviewDate: null,
  aiAssistance: emptyAi()
})
export function cloneDecision(input: DecisionContent): DecisionContent {
  return JSON.parse(JSON.stringify(input)) as DecisionContent
}
const text = (value?: string | null) => value?.trim() || null
export function normalizeDecision(input: DecisionContent): DecisionContent {
  const assistance = input.aiAssistance
    ? {
        phases: [...input.aiAssistance.phases],
        contribution: text(input.aiAssistance.contribution),
        humanJudgment: text(input.aiAssistance.humanJudgment),
        handling: text(input.aiAssistance.handling),
        verification: text(input.aiAssistance.verification)
      }
    : null
  return {
    ...input,
    title: input.title.trim(),
    context: input.context.trim(),
    options: input.options.map(option => ({
      name: option.name.trim(),
      pros: text(option.pros),
      cons: text(option.cons)
    })),
    chosenOption: text(input.chosenOption),
    rationale: text(input.rationale),
    assumptions: input.assumptions.map(line => line.trim()),
    confidence: input.confidence || null,
    reviewDate: input.reviewDate || null,
    aiAssistance:
      assistance &&
      (assistance.phases.length ||
        assistance.contribution ||
        assistance.humanJudgment ||
        assistance.handling ||
        assistance.verification)
        ? assistance
        : null
  }
}
export function decisionError(input: DecisionContent): string {
  if (!input.title.trim() || !input.context.trim()) return '请填写决策标题和问题背景'
  if (
    input.title.length > 255 ||
    input.context.length > 10000 ||
    (input.chosenOption?.length || 0) > 10000 ||
    (input.rationale?.length || 0) > 10000
  )
    return '决策内容超过长度限制'
  if (input.status === 'SUPERSEDED') return '请通过替代操作保留决策关联'
  if (input.status === 'ACCEPTED' && (!text(input.chosenOption) || !text(input.rationale)))
    return '采纳决策须填写最终选择和理由'
  if (input.status === 'REJECTED' && !text(input.rationale)) return '否决决策须填写理由'
  if (
    input.options.length > 20 ||
    input.options.some(
      option =>
        !option.name.trim() ||
        option.name.length > 1000 ||
        (option.pros?.length || 0) > 10000 ||
        (option.cons?.length || 0) > 10000
    )
  )
    return '请填写候选方案名称，每个方案的内容需在长度限制内（最多 20 个方案）'
  if (
    input.assumptions.length > 50 ||
    input.assumptions.some(line => !line.trim() || line.length > 1000)
  )
    return '假设与风险每条非空且最多 1000 字，最多 50 条'
  if (
    input.aiAssistance &&
    [
      input.aiAssistance.contribution,
      input.aiAssistance.humanJudgment,
      input.aiAssistance.verification
    ].some(value => (value?.length || 0) > 10000)
  )
    return 'AI 参与说明每项最多 10000 字'
  return ''
}
