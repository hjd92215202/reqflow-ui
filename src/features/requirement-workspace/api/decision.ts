import request from '@/api/request'
import type { PageResult } from '@/types'
import type {
  DecisionContent,
  DecisionContext,
  DecisionRecord,
  DecisionStatus
} from '../types/decision'
const path = (requirementId: number) => `/api/requirements/${requirementId}/decisions`
export const getDecisionsApi = (
  requirementId: number,
  params: {
    stageId?: number | null
    subTaskId?: number | null
    status?: DecisionStatus
    page: number
    size: number
  }
): Promise<PageResult<DecisionRecord>> => request.get(path(requirementId), { params })
export const getDecisionApi = (requirementId: number, id: number): Promise<DecisionRecord> =>
  request.get(`${path(requirementId)}/${id}`)
export const createDecisionApi = (
  requirementId: number,
  context: DecisionContext,
  content: DecisionContent
): Promise<DecisionRecord> =>
  request.post(path(requirementId), {
    stageId: context.stageId ?? null,
    subTaskId: context.subTaskId ?? null,
    content
  })
export const updateDecisionApi = (
  requirementId: number,
  id: number,
  version: number,
  content: DecisionContent
): Promise<DecisionRecord> => request.put(`${path(requirementId)}/${id}`, { version, content })
export const supersedeDecisionApi = (
  requirementId: number,
  id: number,
  version: number,
  content: DecisionContent
): Promise<DecisionRecord> =>
  request.post(`${path(requirementId)}/${id}/supersede`, { version, content })
export async function supportsDecisionRecordsApi(): Promise<boolean> {
  const response = await request.get<{ decisionRecords?: number } | string>('/api/capabilities', {
    validateStatus: status => status === 200 || status === 404
  })
  return typeof response === 'object' && response !== null && response.decisionRecords === 1
}
