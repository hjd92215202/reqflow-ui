import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import request from '../src/api/request'
import { useUserStore } from '../src/store/user'
import { supportsDefinitionApi } from '../src/features/requirement/api/definition'
import { useDefinitionCapability } from '../src/features/requirement/composables/useDefinitionCapability'
import { supportsExecutionStandardsApi } from '../src/features/requirement-workspace/composables/useExecutionStandards'
import { supportsDecisionRecordsApi } from '../src/features/requirement-workspace/api/decision'

vi.mock('../src/api/request', () => ({ default: { get: vi.fn() } }))
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('自托管后端兼容', () => {
  it('决策能力单独声明，定义和标准能力不等于决策能力', async () => {
    vi.mocked(request.get).mockResolvedValueOnce({
      requirementDefinition: 1,
      executionStandards: 1
    })
    expect(await supportsDecisionRecordsApi()).toBe(false)
    vi.mocked(request.get).mockResolvedValueOnce({ decisionRecords: 1 })
    expect(await supportsDecisionRecordsApi()).toBe(true)
    vi.mocked(request.get).mockResolvedValueOnce({ status: 404 })
    expect(await supportsDecisionRecordsApi()).toBe(false)
  })
  it('仅问题定义能力不足以开启阶段和任务标准', async () => {
    vi.mocked(request.get).mockResolvedValueOnce({ requirementDefinition: 1 })
    expect(await supportsExecutionStandardsApi()).toBe(false)
    vi.mocked(request.get).mockResolvedValueOnce({
      requirementDefinition: 1,
      executionStandards: 1
    })
    expect(await supportsExecutionStandardsApi()).toBe(true)
  })
  it('旧后端返回 404 不作为新功能可用，也不破坏普通接口', async () => {
    vi.mocked(request.get).mockResolvedValueOnce({ status: 404, message: 'Not Found' })
    expect(await supportsDefinitionApi()).toBe(false)
    expect(request.get).toHaveBeenCalledWith(
      '/api/capabilities',
      expect.objectContaining({ validateStatus: expect.any(Function) })
    )
    const validate = vi.mocked(request.get).mock.calls[0][1]!.validateStatus!
    expect(validate(404)).toBe(true)
    expect(validate(403)).toBe(false)
  })
  it('检查失败可以重试，不误判为旧后端', async () => {
    vi.mocked(request.get).mockRejectedValueOnce(new Error('offline'))
    const scope = effectScope()
    const state = scope.run(() => useDefinitionCapability())!
    await flushPromises()
    expect(state.capability.value).toBe('error')
    vi.mocked(request.get).mockResolvedValueOnce({ requirementDefinition: 1 })
    await state.retryCapability()
    expect(state.capability.value).toBe('available')
    scope.stop()
  })
  it('切换服务器忽略旧服务器迟到的检测响应', async () => {
    let resolveOld!: (value: unknown) => void
    vi.mocked(request.get).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve
        })
    )
    const scope = effectScope()
    const state = scope.run(() => useDefinitionCapability())!
    vi.mocked(request.get).mockResolvedValueOnce({ requirementDefinition: 1 })
    useUserStore().setServerUrl('http://new-backend')
    await nextTick()
    await flushPromises()
    expect(state.capability.value).toBe('available')
    resolveOld({ status: 404 })
    await flushPromises()
    expect(state.capability.value).toBe('available')
    scope.stop()
  })
})
