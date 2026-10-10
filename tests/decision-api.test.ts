import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from '../src/api/request'
import {
  createDecisionApi,
  updateDecisionApi,
  supersedeDecisionApi,
  getDecisionsApi
} from '../src/features/requirement-workspace/api/decision'
import { emptyDecision } from '../src/features/requirement-workspace/types/decision'
vi.mock('../src/api/request', () => ({ default: { post: vi.fn(), put: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
describe('决策接口边界', () => {
  it('创建仅发送关联 ID 和内容，不发送客户端上下文名称或身份', async () => {
    const content = emptyDecision()
    await createDecisionApi(
      1,
      { stageId: 2, subTaskId: 3, stageTitle: '客户端名称', subTaskTitle: '客户端任务' },
      content
    )
    expect(request.post).toHaveBeenCalledWith('/api/requirements/1/decisions', {
      stageId: 2,
      subTaskId: 3,
      content
    })
    await createDecisionApi(1, {}, content)
    expect(request.post).toHaveBeenLastCalledWith('/api/requirements/1/decisions', {
      stageId: null,
      subTaskId: null,
      content
    })
  })
  it('编辑与替代发送版本，替代使用独立事务接口', async () => {
    const content = emptyDecision()
    await updateDecisionApi(1, 7, 3, content)
    expect(request.put).toHaveBeenCalledWith('/api/requirements/1/decisions/7', {
      version: 3,
      content
    })
    await supersedeDecisionApi(1, 7, 3, content)
    expect(request.post).toHaveBeenCalledWith('/api/requirements/1/decisions/7/supersede', {
      version: 3,
      content
    })
  })
  it('列表发送服务端筛选及分页参数', async () => {
    const params = { stageId: 2, subTaskId: 3, status: 'ACCEPTED' as const, page: 1, size: 20 }
    await getDecisionsApi(1, params)
    expect(request.get).toHaveBeenCalledWith('/api/requirements/1/decisions', { params })
  })
})
