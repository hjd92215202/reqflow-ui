import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useRequirementStages } from '../src/features/requirement-workspace/composables/useRequirementStages'
import { useStageTasks } from '../src/features/requirement-workspace/composables/useStageTasks'
import { updateOriginalNode } from '../src/features/requirement-workspace/composables/useTaskTree'
import { updateStageApi } from '../src/features/requirement-workspace/api/stage'
import {
  getSubTasksApi,
  updateSubTaskApi,
  createSubTaskApi
} from '../src/features/requirement-workspace/api/task'
import { getDependenciesApi } from '../src/features/requirement-workspace/api/dependency'
import type { SubTask } from '../src/types'

vi.mock('../src/features/requirement-workspace/api/stage', () => ({
  getStagesApi: vi.fn(),
  createStageApi: vi.fn(),
  updateStageApi: vi.fn(),
  deleteStageApi: vi.fn()
}))
vi.mock('../src/features/requirement-workspace/api/task', () => ({
  getSubTasksApi: vi.fn(),
  createSubTaskApi: vi.fn(),
  updateSubTaskApi: vi.fn(),
  deleteSubTaskApi: vi.fn()
}))
vi.mock('../src/features/requirement-workspace/api/dependency', () => ({
  getDependenciesApi: vi.fn(),
  createDependencyApi: vi.fn(),
  deleteDependencyApi: vi.fn()
}))
const task: SubTask = {
  id: 3,
  stageId: 2,
  title: '任务',
  status: 'TODO',
  customFields: { link: 'keep' },
  note: '说明',
  deliverable: '产物',
  completionCriteria: '测试通过'
}
beforeEach(() => {
  vi.mocked(getSubTasksApi).mockResolvedValue([{ ...task }])
  vi.mocked(getDependenciesApi).mockResolvedValue([])
})
describe('交付标准在局部保存、缓存与并发编辑中的保留', () => {
  it('阶段状态操作只发送修改字段', async () => {
    const state = useRequirementStages()
    state.stages.value = [
      { id: 2, requirementId: 1, title: '阶段', status: 'TODO', goal: '已有目标' }
    ]
    vi.mocked(updateStageApi).mockResolvedValueOnce({ ...state.stages.value[0], status: 'DONE' })
    await state.updateStage(2, { status: 'DONE' })
    expect(updateStageApi).toHaveBeenCalledWith(2, { status: 'DONE' })
    expect(state.stages.value[0].goal).toBe('已有目标')
  })
  it('旧响应省略标准时保留，明确 null 才清空，树结构也保留', () => {
    const tree = [{ ...task, children: [{ ...task, id: 4 }] }]
    const oldResponse = { ...task }
    delete oldResponse.deliverable
    delete oldResponse.completionCriteria
    updateOriginalNode(tree, oldResponse)
    expect(tree[0].deliverable).toBe('产物')
    expect(tree[0].children).toHaveLength(1)
    updateOriginalNode(tree, { ...task, deliverable: null, completionCriteria: null })
    expect(tree[0].deliverable).toBeNull()
    expect(tree[0].completionCriteria).toBeNull()
  })
  it('普通保存不含标准；同任务后续标准保存等待前一次完成', async () => {
    const state = useStageTasks()
    await state.loadStageTasks(2)
    let finish!: (value: SubTask) => void
    vi.mocked(updateSubTaskApi).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    vi.mocked(updateSubTaskApi).mockResolvedValueOnce({
      ...task,
      status: 'DONE',
      deliverable: '新产物'
    })
    const first = state.updateTaskLocallyAndPersist(2, { ...task, status: 'DONE' })
    const second = state.updateTaskLocallyAndPersist(2, task, { deliverable: '新产物' })
    await flushPromises()
    expect(updateSubTaskApi).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateSubTaskApi).mock.calls[0][1]).not.toHaveProperty('deliverable')
    expect(vi.mocked(updateSubTaskApi).mock.calls[0][1]).not.toHaveProperty('completionCriteria')
    finish({ ...task, status: 'DONE' })
    await Promise.all([first, second])
    expect(updateSubTaskApi).toHaveBeenLastCalledWith(3, { deliverable: '新产物' })
    expect(state.stageTasksCache.value[2][0]).toMatchObject({
      status: 'DONE',
      deliverable: '新产物',
      completionCriteria: '测试通过'
    })
  })
  it('任务创建提交可选标准；失败后仍可再次保存', async () => {
    const state = useStageTasks()
    await state.loadStageTasks(2)
    vi.mocked(createSubTaskApi).mockResolvedValueOnce(task)
    await state.createTask(2, '任务', '', null, {
      deliverable: '产物',
      completionCriteria: '测试通过'
    })
    expect(createSubTaskApi).toHaveBeenCalledWith(
      expect.objectContaining({
        deliverable: '产物',
        completionCriteria: '测试通过',
        customFields: {}
      })
    )
    vi.mocked(updateSubTaskApi).mockRejectedValueOnce(new Error('offline'))
    await expect(
      state.updateTaskLocallyAndPersist(2, task, { deliverable: '新产物' })
    ).rejects.toThrow('offline')
    vi.mocked(updateSubTaskApi).mockResolvedValueOnce({ ...task, deliverable: '新产物' })
    await state.updateTaskLocallyAndPersist(2, task, { deliverable: '新产物' })
    expect(state.stageTasksCache.value[2][0].deliverable).toBe('新产物')
  })
})
