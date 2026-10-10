/* eslint-disable vue/one-component-per-file -- Test-only component stubs share a fixture. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent, reactive, ref } from 'vue'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '../src/store/user'
import DecisionDrawer from '../src/features/requirement-workspace/components/Decisions/DecisionDrawer.vue'
import DecisionEntry from '../src/features/requirement-workspace/components/Decisions/DecisionEntry.vue'
import RequirementActivity from '../src/features/requirement-workspace/components/Activity/RequirementActivity.vue'
import { getActivityLogsApi } from '../src/features/activity/api'
import { decisionActionsKey } from '../src/features/requirement-workspace/composables/useDecisionActions'
import {
  emptyDecision,
  type DecisionRecord,
  type DecisionContext
} from '../src/features/requirement-workspace/types/decision'
import * as api from '../src/features/requirement-workspace/api/decision'

const routerMocks = vi.hoisted(() => ({
  leave: vi.fn(),
  update: vi.fn(),
  replace: vi.fn(),
  route: null as unknown
}))
vi.mock('vue-router', () => ({
  useRoute: () => routerMocks.route,
  useRouter: () => ({ replace: routerMocks.replace }),
  onBeforeRouteLeave: routerMocks.leave,
  onBeforeRouteUpdate: routerMocks.update
}))
vi.mock('../src/features/requirement-workspace/api/decision', () => ({
  getDecisionsApi: vi.fn(),
  getDecisionApi: vi.fn(),
  createDecisionApi: vi.fn(),
  updateDecisionApi: vi.fn(),
  supersedeDecisionApi: vi.fn()
}))
vi.mock('../src/features/activity/api', () => ({ getActivityLogsApi: vi.fn() }))
const Modal = defineComponent({
  props: { modelValue: Boolean },
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
})
const Input = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: `<textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})
const Group = defineComponent({ template: '<div><slot /></div>' })
let route: { query: Record<string, string>; fullPath: string }
const wrappers: VueWrapper[] = []
const record = (id = 7): DecisionRecord => ({
  id,
  requirementId: 1,
  stageId: 2,
  subTaskId: 3,
  stageTitle: '阶段',
  subTaskTitle: '任务',
  content: { ...emptyDecision(), title: `决策 ${id}`, context: '背景', aiAssistance: null },
  version: 0,
  supersedesDecisionId: null,
  supersededByDecisionId: null,
  createdBy: 9,
  updatedBy: 9,
  createdAt: '2026-10-11T08:00:00',
  updatedAt: '2026-10-11T08:00:00'
})
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(item => item.text() === label)!
function setup(capability = 'available') {
  const wrapper = mount(DecisionDrawer, {
    props: { requirementId: 1, capability },
    global: {
      plugins: [ElementPlus],
      stubs: {
        ElDrawer: Modal,
        ElInput: Input,
        ElForm: Group,
        ElFormItem: Group,
        ElCollapse: Group,
        ElCollapseItem: Group,
        ElDatePicker: true
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}
async function open(wrapper: VueWrapper, context: DecisionContext = {}, id?: number) {
  await (
    wrapper.vm as unknown as { open: (context: DecisionContext, id?: number) => Promise<void> }
  ).open(context, id)
  await flushPromises()
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
  route = reactive({ query: { tab: 'plan' }, fullPath: '/requirement/1?tab=plan' })
  routerMocks.route = route
  routerMocks.replace.mockImplementation(async ({ query }) => {
    route.query = query
    await flushPromises()
    return undefined
  })
  vi.mocked(api.getDecisionsApi).mockResolvedValue({
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 20,
    number: 0
  } as never)
  vi.mocked(api.getDecisionApi).mockImplementation(async (_requirement, id) => record(id))
})
afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers.length = 0
  vi.restoreAllMocks()
})

describe('共用决策入口、抽屉与导航保护', () => {
  it('三个上下文入口透传关联，旧后端入口隐藏', async () => {
    const openRecord = vi.fn()
    for (const context of [{}, { stageId: 2, stageTitle: '阶段' }, { stageId: 2, subTaskId: 3 }]) {
      const wrapper = mount(DecisionEntry, {
        props: { context },
        global: {
          plugins: [ElementPlus],
          provide: {
            [decisionActionsKey as symbol]: { available: ref(true), open: openRecord }
          }
        }
      })
      wrappers.push(wrapper)
      await wrapper.find('button').trigger('click')
      expect(openRecord).toHaveBeenLastCalledWith(context)
    }
    const hidden = mount(DecisionEntry, { global: { plugins: [ElementPlus] } })
    wrappers.push(hidden)
    expect(hidden.find('button').exists()).toBe(false)
  })
  it('阶段与任务列表带过滤上下文，空态可创建提案并保存为可定位链接', async () => {
    const wrapper = setup()
    await open(wrapper, { stageId: 2, subTaskId: 3, subTaskTitle: '任务' })
    expect(api.getDecisionsApi).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ stageId: 2, subTaskId: 3, page: 0, size: 20 })
    )
    expect(wrapper.text()).toContain('还没有决策记录')
    await button(wrapper, '记录决策').trigger('click')
    await wrapper.findAll('textarea')[0].setValue('缓存选择')
    await wrapper.findAll('textarea')[1].setValue('性能目标')
    vi.mocked(api.createDecisionApi)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(record())
    await button(wrapper, '保存决策').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('保存失败，输入已保留')
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toBe('缓存选择')
    await button(wrapper, '保存决策').trigger('click')
    await flushPromises()
    expect(api.createDecisionApi).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ stageId: 2, subTaskId: 3 }),
      expect.objectContaining({ title: '缓存选择', status: 'PROPOSED' })
    )
    expect(route.query).toEqual({ tab: 'plan', decisionId: '7' })
    expect(wrapper.emitted('saved')![0][0]).toEqual(record())
    expect(wrapper.text()).toContain('编辑决策')
  })
  it('直达链接在能力确认后加载，旧后端不调用决策接口', async () => {
    route.query.decisionId = '7'
    const wrapper = setup('checking')
    expect(api.getDecisionApi).not.toHaveBeenCalled()
    await wrapper.setProps({ capability: 'unavailable' })
    expect(wrapper.text()).toContain('请升级后端后使用')
    expect(api.getDecisionsApi).not.toHaveBeenCalled()
    await wrapper.setProps({ capability: 'available' })
    await flushPromises()
    expect(api.getDecisionApi).toHaveBeenCalledWith(1, 7)
    expect(wrapper.text()).toContain('决策 7')
    route.query.decisionId = '8'
    await flushPromises()
    expect(api.getDecisionApi).toHaveBeenLastCalledWith(1, 8)
    await button(wrapper, '关闭').trigger('click')
    await flushPromises()
    expect(route.query).toEqual({ tab: 'plan' })
  })
  it('加载失败提供重试，重试成功展示内容', async () => {
    const wrapper = setup()
    vi.mocked(api.getDecisionApi)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(record())
    await open(wrapper, {}, 7)
    expect(wrapper.text()).toContain('决策加载失败')
    await button(wrapper, '重试加载决策').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('决策 7')
  })
  it('未保存内容可取消关闭和导航，刷新受保护，确认丢弃后关闭', async () => {
    const wrapper = setup()
    await open(wrapper)
    await button(wrapper, '记录决策').trigger('click')
    await wrapper.findAll('textarea')[0].setValue('草稿')
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    await button(wrapper, '取消编辑').trigger('click')
    await flushPromises()
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toBe('草稿')
    expect(await routerMocks.leave.mock.calls[0][0]()).toBe(false)
    expect(
      await routerMocks.update.mock.calls[0][0](
        { fullPath: '/elsewhere' },
        { fullPath: route.fullPath }
      )
    ).toBe(false)
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    confirm.mockResolvedValue('confirm' as never)
    await button(wrapper, '取消编辑').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('textarea')).toHaveLength(0)
    expect(await routerMocks.leave.mock.calls[0][0]()).toBe(true)
  })
  it('409 比较保留输入，采用最新内容之后展示只读替代关联', async () => {
    const wrapper = setup()
    await open(wrapper, {}, 7)
    await button(wrapper, '编辑决策').trigger('click')
    await wrapper.findAll('textarea')[0].setValue('本地标题')
    vi.mocked(api.updateDecisionApi).mockRejectedValue({ response: { status: 409 } })
    await button(wrapper, '保存决策').trigger('click')
    await flushPromises()
    expect(button(wrapper, '保存决策').attributes('disabled')).toBeDefined()
    vi.mocked(api.getDecisionApi).mockResolvedValue({
      ...record(),
      version: 1,
      content: { ...record().content, status: 'SUPERSEDED' },
      supersededByDecisionId: 8
    })
    await button(wrapper, '查看最新版本').trigger('click')
    await flushPromises()
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toBe('本地标题')
    expect(button(wrapper, '保留草稿，按最新版本继续编辑')).toBeUndefined()
    await button(wrapper, '采用最新内容，丢弃草稿').trigger('click')
    await flushPromises()
    expect(button(wrapper, '编辑决策')).toBeUndefined()
    expect(wrapper.text()).toContain('已被替代')
    expect(wrapper.text()).toContain('#8')
  })
  it('需求切换清空列表和关联，迟到结果不污染当前需求', async () => {
    const wrapper = setup()
    let resolve!: (value: unknown) => void
    vi.mocked(api.getDecisionsApi).mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done
        }) as never
    )
    await open(wrapper, { stageId: 2 })
    await wrapper.setProps({ requirementId: 2 })
    resolve({ content: [record()], totalElements: 1 })
    await flushPromises()
    await open(wrapper)
    expect(api.getDecisionsApi).toHaveBeenLastCalledWith(
      2,
      expect.objectContaining({ stageId: undefined, subTaskId: undefined })
    )
    expect(wrapper.text()).not.toContain('决策 7')
  })
  it('切换自托管服务器使旧详情失效，即使需求和决策 ID 相同', async () => {
    route.query.decisionId = '7'
    const wrapper = setup()
    await flushPromises()
    vi.mocked(api.getDecisionApi).mockResolvedValue({
      ...record(),
      content: { ...record().content, title: '新服务器决策' }
    })
    await wrapper.setProps({ capability: 'checking' })
    useUserStore().setServerUrl('http://new-backend')
    await flushPromises()
    await wrapper.setProps({ capability: 'available' })
    await flushPromises()
    expect(api.getDecisionApi).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('新服务器决策')
    expect(wrapper.text()).not.toContain('决策 7')
  })
  it('活动来源可定位决策，保存通知后刷新活动', async () => {
    const openRecord = vi.fn()
    const revision = ref(0)
    vi.mocked(getActivityLogsApi)
      .mockResolvedValueOnce({ content: [] } as never)
      .mockResolvedValueOnce({
        content: [
          {
            id: 1,
            userName: '用户',
            targetType: 'DECISION',
            targetId: 7,
            actionType: 'DECISION_CREATE',
            summary: '记录了决策',
            createdAt: '2026-10-11T08:00:00'
          }
        ]
      } as never)
    const wrapper = mount(RequirementActivity, {
      props: { requirementId: 1 },
      global: {
        plugins: [ElementPlus],
        provide: {
          [decisionActionsKey as symbol]: { available: ref(true), open: openRecord, revision }
        }
      }
    })
    wrappers.push(wrapper)
    await flushPromises()
    revision.value++
    await flushPromises()
    expect(getActivityLogsApi).toHaveBeenCalledTimes(2)
    await button(wrapper, '查看决策 #7').trigger('click')
    expect(openRecord).toHaveBeenCalledWith({}, 7)
  })
})
