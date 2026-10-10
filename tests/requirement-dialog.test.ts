/* eslint-disable vue/one-component-per-file -- Test-only component stubs share a fixture. */
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import ElementPlus from 'element-plus'
import Dialog from '../src/features/requirement/components/RequirementDialog.vue'
import { createRequirementApi, updateRequirementApi } from '../src/features/requirement/api'
import type { Requirement } from '../src/types'

const mocks = vi.hoisted(() => ({ push: vi.fn().mockResolvedValue(undefined) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../src/features/requirement/api', () => ({
  createRequirementApi: vi.fn(),
  updateRequirementApi: vi.fn()
}))
vi.mock('../src/store/workspace', () => ({ useWorkspaceStore: () => ({ activeProjectId: 77 }) }))
vi.mock('../src/features/requirement/composables/useDefinitionCapability', () => ({
  useDefinitionCapability: () => ({ capability: ref('available') })
}))
const Modal = defineComponent({
  props: { modelValue: Boolean },
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
})
const Input = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})
const Form = defineComponent({ template: '<div><slot /></div>' })
const existing: Requirement = {
  id: 42,
  title: '旧需求',
  description: '旧背景',
  status: 'DONE',
  priority: 'HIGH',
  startDate: '2026-10-01',
  endDate: null,
  projectId: 11,
  creatorId: 1,
  createdAt: '',
  updatedAt: ''
}
const open = (isEdit: boolean) =>
  mount(Dialog, {
    props: { modelValue: false, isEdit, requirementData: isEdit ? existing : null },
    global: {
      plugins: [ElementPlus],
      stubs: { ElDialog: Modal, ElInput: Input, ElForm: Form, ElFormItem: Form, ElDatePicker: true }
    }
  })
const button = (wrapper: ReturnType<typeof open>, label: string) =>
  wrapper.findAll('button').find(item => item.text() === label)!

describe('快速创建与存量需求编辑', () => {
  it('只填写标题即可创建，并保留项目上下文', async () => {
    vi.mocked(createRequirementApi).mockResolvedValueOnce({ ...existing, id: 55 })
    const wrapper = open(false)
    await wrapper.setProps({ modelValue: true })
    await wrapper.find('input').setValue('新需求')
    await button(wrapper, '创建需求').trigger('click')
    await flushPromises()
    expect(createRequirementApi).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新需求', projectId: 77 })
    )
    expect(mocks.push).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toHaveLength(1)
    wrapper.unmount()
  })
  it('创建并定义问题定位到已创建需求的概览编辑入口', async () => {
    vi.mocked(createRequirementApi).mockResolvedValueOnce({ ...existing, id: 55 })
    const wrapper = open(false)
    await wrapper.setProps({ modelValue: true })
    await wrapper.find('input').setValue('新需求')
    await button(wrapper, '创建并定义问题').trigger('click')
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({
      path: '/requirements/55',
      query: { tab: 'overview', define: '1' }
    })
    wrapper.unmount()
  })
  it('普通编辑保留单侧日期、背景、状态、优先级与原项目', async () => {
    vi.mocked(updateRequirementApi).mockResolvedValueOnce(existing)
    const wrapper = open(true)
    await wrapper.setProps({ modelValue: true })
    await wrapper.find('input').setValue('改标题')
    await button(wrapper, '保存').trigger('click')
    await flushPromises()
    expect(updateRequirementApi).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        title: '改标题',
        startDate: '2026-10-01',
        endDate: null,
        description: '旧背景',
        status: 'DONE',
        priority: 'HIGH',
        projectId: 11
      })
    )
    wrapper.unmount()
  })
})
