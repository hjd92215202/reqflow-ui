/* eslint-disable vue/one-component-per-file -- Test-only component stubs share a fixture. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent, reactive, ref } from 'vue'
import ElementPlus, { ElMessageBox } from 'element-plus'
import StageEditor from '../src/features/requirement-workspace/components/Plan/StageEditor.vue'
import TaskCreate from '../src/features/requirement-workspace/components/Execution/TaskCreate.vue'
import TaskDeliveryCriteria from '../src/features/requirement-workspace/components/Execution/TaskDeliveryCriteria.vue'
import { executionStandardsKey } from '../src/features/requirement-workspace/composables/useExecutionStandards'
import type { Stage, SubTask } from '../src/types'

const guards = vi.hoisted(() => ({ leave: vi.fn(), update: vi.fn() }))
vi.mock('vue-router', () => ({
  onBeforeRouteLeave: guards.leave,
  onBeforeRouteUpdate: guards.update
}))
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
const wrappers: VueWrapper[] = []
const stage: Stage = {
  id: 2,
  requirementId: 1,
  title: '阶段',
  status: 'IN_PROGRESS',
  startDate: '2026-10-11',
  endDate: null,
  goal: '目标',
  expectedOutput: '产出',
  exitCriteria: '条件'
}
const task: SubTask = {
  id: 3,
  stageId: 2,
  title: '任务',
  status: 'TODO',
  customFields: {},
  deliverable: '原交付物',
  completionCriteria: '原标准'
}
const setup = (available = true, save = vi.fn(), drafts = reactive({})) => ({
  plugins: [ElementPlus],
  provide: { [executionStandardsKey as symbol]: { available: ref(available), save, drafts } },
  stubs: {
    ElDialog: Modal,
    ElInput: Input,
    ElForm: Group,
    ElFormItem: Group,
    ElCollapse: Group,
    ElCollapseItem: Group,
    ElDatePicker: true
  }
})
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(item => item.text() === label)!
afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers.length = 0
  vi.restoreAllMocks()
})

describe('阶段与任务的轻量创建和交付标准编辑', () => {
  it('阶段编辑保留单侧日期；失败保留输入，成功后才关闭', async () => {
    const wrapper = mount(StageEditor, { props: { modelValue: true, stage }, global: setup() })
    wrappers.push(wrapper)
    await wrapper.findAll('textarea')[1].setValue(' 新目标 ')
    await button(wrapper, '保存阶段').trigger('click')
    const [payload, complete] = wrapper.emitted('submit')![0] as [unknown, (saved: boolean) => void]
    expect(payload).toEqual({
      title: '阶段',
      goal: '新目标',
      expectedOutput: '产出',
      exitCriteria: '条件'
    })
    complete(false)
    await flushPromises()
    expect((wrapper.findAll('textarea')[1].element as HTMLTextAreaElement).value).toBe(' 新目标 ')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await button(wrapper, '保存阶段').trigger('click')
    const nextComplete = wrapper.emitted('submit')![1][1] as (saved: boolean) => void
    nextComplete(true)
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([false])
  })
  it('旧后端阶段快速创建不提交未支持的字段', async () => {
    const wrapper = mount(StageEditor, { props: { modelValue: true }, global: setup(false) })
    wrappers.push(wrapper)
    await wrapper.find('textarea').setValue('快速阶段')
    await button(wrapper, '保存阶段').trigger('click')
    expect(wrapper.findAll('textarea')).toHaveLength(1)
    expect(wrapper.emitted('submit')![0][0]).toEqual({
      title: '快速阶段',
      startDate: null,
      endDate: null
    })
  })
  it('标题即可创建任务，选填内容失败后保留并支持重试', async () => {
    const wrapper = mount(TaskCreate, { props: { modelValue: false }, global: setup() })
    wrappers.push(wrapper)
    await wrapper.setProps({ modelValue: true })
    const fields = wrapper.findAll('textarea')
    await fields[0].setValue('任务')
    await button(wrapper, '创建任务').trigger('click')
    expect(wrapper.emitted('submit')![0][0]).toEqual({
      title: '任务',
      assignee: '',
      deliverable: null,
      completionCriteria: null
    })
    ;(wrapper.emitted('submit')![0][1] as (saved: boolean) => void)(false)
    await fields[2].setValue('交付文档')
    await fields[3].setValue('评审通过')
    await button(wrapper, '创建任务').trigger('click')
    const event = wrapper.emitted('submit')![1]
    expect(event[0]).toEqual({
      title: '任务',
      assignee: '',
      deliverable: '交付文档',
      completionCriteria: '评审通过'
    })
    ;(event[1] as (saved: boolean) => void)(false)
    await flushPromises()
    expect((fields[2].element as HTMLTextAreaElement).value).toBe('交付文档')
  })
  it('任务标准保存失败及普通字段刷新不覆盖草稿；清空可显式保存', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...task, deliverable: null, completionCriteria: null })
    const wrapper = mount(TaskDeliveryCriteria, { props: { task }, global: setup(true, save) })
    wrappers.push(wrapper)
    await button(wrapper, '编辑').trigger('click')
    await wrapper.findAll('textarea')[0].setValue('我的草稿')
    await button(wrapper, '保存交付标准').trigger('click')
    await flushPromises()
    await wrapper.setProps({ task: { ...task, status: 'DONE', deliverable: '服务器新内容' } })
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toBe('我的草稿')
    expect(wrapper.text()).toContain('输入已保留')
    await wrapper.findAll('textarea')[0].setValue('  ')
    await wrapper.findAll('textarea')[1].setValue('')
    await button(wrapper, '保存交付标准').trigger('click')
    await flushPromises()
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ id: 3 }), {
      deliverable: null,
      completionCriteria: null
    })
    expect(wrapper.findAll('textarea')).toHaveLength(0)
  })
  it('离开拒绝丢弃时保留草稿；面板重挂载后也保留，保存中不能离开', async () => {
    let finish!: (task: SubTask) => void
    const save = vi.fn(
      () =>
        new Promise<SubTask>(resolve => {
          finish = resolve
        })
    )
    const shared = setup(true, save)
    let wrapper = mount(TaskDeliveryCriteria, { props: { task }, global: shared })
    wrappers.push(wrapper)
    await button(wrapper, '编辑').trigger('click')
    await wrapper.findAll('textarea')[0].setValue('草稿')
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel')
    const leave = guards.leave.mock.calls.at(-1)![0] as () => Promise<boolean>
    expect(await leave()).toBe(false)
    wrapper.unmount()
    wrappers.pop()
    wrapper = mount(TaskDeliveryCriteria, { props: { task }, global: shared })
    wrappers.push(wrapper)
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toBe('草稿')
    await button(wrapper, '保存交付标准').trigger('click')
    expect(await (guards.leave.mock.calls.at(-1)![0] as () => Promise<boolean>)()).toBe(false)
    finish({ ...task, deliverable: '草稿' })
    await flushPromises()
    expect(await (guards.leave.mock.calls.at(-1)![0] as () => Promise<boolean>)()).toBe(true)
    wrapper.unmount()
    wrappers.pop()
    wrapper = mount(TaskDeliveryCriteria, {
      props: { task: { ...task, deliverable: '更新后的服务端内容' } },
      global: shared
    })
    wrappers.push(wrapper)
    await button(wrapper, '编辑').trigger('click')
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toBe(
      '更新后的服务端内容'
    )
  })
})
