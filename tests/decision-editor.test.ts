import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDecisionEditor } from '../src/features/requirement-workspace/composables/useDecisionEditor'
import * as api from '../src/features/requirement-workspace/api/decision'
import {
  emptyDecision,
  normalizeDecision,
  type DecisionRecord
} from '../src/features/requirement-workspace/types/decision'

vi.mock('../src/features/requirement-workspace/api/decision', () => ({
  getDecisionApi: vi.fn(),
  createDecisionApi: vi.fn(),
  updateDecisionApi: vi.fn(),
  supersedeDecisionApi: vi.fn()
}))
function decision(
  version = 0,
  status: DecisionRecord['content']['status'] = 'PROPOSED'
): DecisionRecord {
  return {
    id: 7,
    requirementId: 1,
    stageId: 2,
    subTaskId: 3,
    stageTitle: '阶段',
    subTaskTitle: '任务',
    content: {
      ...emptyDecision(),
      title: '决策',
      context: '背景',
      status,
      chosenOption: '方案 A',
      rationale: '成本较低',
      aiAssistance: null
    },
    version,
    supersedesDecisionId: null,
    supersededByDecisionId: null,
    createdBy: 9,
    updatedBy: 9,
    createdAt: '2026-10-11T08:00:00',
    updatedAt: '2026-10-11T08:00:00'
  }
}
beforeEach(() => vi.resetAllMocks())
describe('决策显式保存、版本冲突与替代', () => {
  it('提案只需标题和背景；采纳及否决校验在发送前完成', async () => {
    const saved = vi.fn().mockResolvedValue(undefined)
    const editor = useDecisionEditor(() => 1, saved)
    editor.begin('create')
    expect(await editor.save({})).toBe(false)
    editor.draft.value.title = '  缓存选择  '
    editor.draft.value.context = ' 性能目标 '
    editor.draft.value.status = 'ACCEPTED'
    expect(await editor.save({})).toBe(false)
    editor.draft.value.status = 'REJECTED'
    expect(await editor.save({})).toBe(false)
    expect(api.createDecisionApi).not.toHaveBeenCalled()
    editor.draft.value.status = 'PROPOSED'
    vi.mocked(api.createDecisionApi).mockResolvedValue(decision())
    expect(await editor.save({ stageId: 2, subTaskId: 3 })).toBe(true)
    expect(api.createDecisionApi).toHaveBeenCalledWith(
      1,
      { stageId: 2, subTaskId: 3 },
      expect.objectContaining({
        title: '缓存选择',
        context: '性能目标',
        chosenOption: null,
        rationale: null,
        aiAssistance: null
      })
    )
    expect(saved).toHaveBeenCalledOnce()
    expect(editor.dirty.value).toBe(false)
  })
  it('候选方案、风险与 AI 说明规范化，校验失败不发送', async () => {
    const editor = useDecisionEditor(() => 1, vi.fn())
    editor.apply(decision())
    editor.begin('edit')
    editor.draft.value.options = [{ name: ' ', pros: '', cons: '' }]
    expect(await editor.save({})).toBe(false)
    editor.draft.value.options[0] = { name: ' A ', pros: ' 优点 ', cons: ' ' }
    editor.draft.value.assumptions = [' 风险 ']
    editor.draft.value.aiAssistance!.phases = ['COMPARISON']
    editor.draft.value.aiAssistance!.humanJudgment = ' 人工对比 '
    vi.mocked(api.updateDecisionApi).mockResolvedValue(decision(1))
    await editor.save({})
    expect(api.updateDecisionApi).toHaveBeenCalledWith(
      1,
      7,
      0,
      expect.objectContaining({
        options: [{ name: 'A', pros: '优点', cons: null }],
        assumptions: ['风险'],
        aiAssistance: {
          phases: ['COMPARISON'],
          contribution: null,
          humanJudgment: '人工对比',
          handling: null,
          verification: null
        }
      })
    )
  })
  it('普通失败保留草稿和旧版本，重试成功才切回详情', async () => {
    const editor = useDecisionEditor(() => 1, vi.fn())
    editor.apply(decision())
    editor.begin('edit')
    editor.draft.value.title = '本地修改'
    vi.mocked(api.updateDecisionApi)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(decision(1))
    expect(await editor.save({})).toBe(false)
    expect(editor.draft.value.title).toBe('本地修改')
    expect(editor.mode.value).toBe('edit')
    expect(editor.dirty.value).toBe(true)
    expect(editor.conflict.value).toBe(false)
    expect(editor.record.value!.version).toBe(0)
    expect(await editor.save({})).toBe(true)
    expect(editor.mode.value).toBe('view')
  })
  it('409 禁止重复保存，比较不覆盖输入，明确保留后使用新版本', async () => {
    const editor = useDecisionEditor(() => 1, vi.fn())
    editor.apply(decision())
    editor.begin('edit')
    editor.draft.value.rationale = '本地理由'
    vi.mocked(api.updateDecisionApi)
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValueOnce(decision(3))
    expect(await editor.save({})).toBe(false)
    expect(editor.conflict.value).toBe(true)
    await editor.save({})
    expect(api.updateDecisionApi).toHaveBeenCalledOnce()
    vi.mocked(api.getDecisionApi)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(decision(2))
    await editor.compareLatest()
    expect(editor.latest.value).toBeNull()
    expect(editor.draft.value.rationale).toBe('本地理由')
    await editor.compareLatest()
    expect(editor.record.value!.version).toBe(0)
    editor.keepDraft()
    expect(editor.record.value!.version).toBe(2)
    expect(editor.draft.value.rationale).toBe('本地理由')
    await editor.save({})
    expect(api.updateDecisionApi).toHaveBeenLastCalledWith(
      1,
      7,
      2,
      expect.objectContaining({ rationale: '本地理由' })
    )
  })
  it('已被替代的最新记录不可用草稿覆盖，可明确采用只读内容', async () => {
    const editor = useDecisionEditor(() => 1, vi.fn())
    editor.apply(decision())
    editor.begin('edit')
    editor.draft.value.title = '本地修改'
    vi.mocked(api.updateDecisionApi).mockRejectedValue({ response: { status: 409 } })
    await editor.save({})
    vi.mocked(api.getDecisionApi).mockResolvedValue({
      ...decision(1, 'SUPERSEDED'),
      supersededByDecisionId: 8
    })
    await editor.compareLatest()
    editor.keepDraft()
    expect(editor.conflict.value).toBe(true)
    expect(editor.record.value!.version).toBe(0)
    editor.useLatest()
    expect(editor.mode.value).toBe('view')
    expect(editor.record.value!.supersededByDecisionId).toBe(8)
    editor.begin('edit')
    expect(editor.mode.value).toBe('view')
  })
  it('替代使用原版本与专用接口，旧记录内容保持独立', async () => {
    const source = decision(2, 'ACCEPTED')
    const editor = useDecisionEditor(() => 1, vi.fn())
    editor.apply(source)
    editor.begin('replace')
    expect(editor.draft.value.title).toBe('决策（替代）')
    editor.draft.value.chosenOption = '方案 B'
    vi.mocked(api.supersedeDecisionApi).mockResolvedValue({
      ...decision(0, 'ACCEPTED'),
      id: 8,
      supersedesDecisionId: 7
    })
    await editor.save({ stageId: 99 })
    expect(api.supersedeDecisionApi).toHaveBeenCalledWith(
      1,
      7,
      2,
      expect.objectContaining({ chosenOption: '方案 B', status: 'ACCEPTED' })
    )
    expect(api.createDecisionApi).not.toHaveBeenCalled()
    expect(api.updateDecisionApi).not.toHaveBeenCalled()
    expect(source.content.chosenOption).toBe('方案 A')
    expect(editor.record.value!.id).toBe(8)
  })
  it('切换需求后忽略迟到加载和保存，不写入另一需求的界面', async () => {
    let requirement = 1
    const saved = vi.fn()
    const editor = useDecisionEditor(() => requirement, saved)
    let resolve!: (value: DecisionRecord) => void
    vi.mocked(api.getDecisionApi).mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done
        })
    )
    const loading = editor.load(7)
    editor.reset()
    resolve(decision())
    await loading
    expect(editor.record.value).toBeNull()
    editor.apply(decision())
    editor.begin('edit')
    editor.draft.value.title = '修改'
    vi.mocked(api.updateDecisionApi).mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done
        })
    )
    const saving = editor.save({})
    requirement = 2
    editor.reset()
    resolve(decision(1))
    expect(await saving).toBe(false)
    expect(editor.record.value).toBeNull()
    expect(saved).not.toHaveBeenCalled()
    expect(editor.saving.value).toBe(false)
  })
  it('取消比较后可重新比较，迟到响应不改变下一份草稿', async () => {
    const editor = useDecisionEditor(() => 1, vi.fn())
    editor.apply(decision())
    editor.begin('edit')
    let resolve!: (value: DecisionRecord) => void
    vi.mocked(api.getDecisionApi).mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done
        })
    )
    const pending = editor.compareLatest()
    editor.begin('create')
    resolve(decision(1))
    await pending
    expect(editor.latest.value).toBeNull()
    expect(editor.comparing.value).toBe(false)
    expect(normalizeDecision(editor.draft.value).title).toBe('')
  })
})
