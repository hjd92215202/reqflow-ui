/* eslint-disable vue/one-component-per-file -- Test-only component stubs share a fixture. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import ElementPlus from 'element-plus'
import Card from '../src/features/requirement-workspace/components/Overview/RequirementDefinitionCard.vue'
import {
  emptyDefinition,
  type DefinitionResponse
} from '../src/features/requirement/types/definition'
import {
  getDefinitionApi,
  saveDefinitionApi,
  confirmDefinitionApi
} from '../src/features/requirement/api/definition'

vi.mock('../src/features/requirement/api/definition', () => ({
  getDefinitionApi: vi.fn(),
  saveDefinitionApi: vi.fn(),
  confirmDefinitionApi: vi.fn()
}))
vi.mock('../src/features/requirement/composables/useDefinitionCapability', () => ({
  useDefinitionCapability: () => ({ capability: ref('available'), retryCapability: vi.fn() })
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn()
}))

const Input = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: `<textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})
const Form = defineComponent({ template: '<form @submit.prevent><slot /></form>' })
const FormItem = defineComponent({
  props: { label: String },
  template: '<label>{{ label }}<slot /></label>'
})
const initial = (): DefinitionResponse => ({
  definition: emptyDefinition(),
  state: 'NOT_STARTED',
  version: 0,
  confirmedAt: null,
  confirmedBy: null
})
const openCard = () =>
  mount(Card, {
    props: { requirementId: 42 },
    global: {
      plugins: [ElementPlus],
      stubs: { ElInput: Input, ElForm: Form, ElFormItem: FormItem }
    }
  })
const button = (wrapper: ReturnType<typeof openCard>, text: string) =>
  wrapper.findAll('button').find(item => item.text() === text)!

beforeEach(() => {
  vi.mocked(getDefinitionApi).mockResolvedValue(initial())
})

describe('问题定义保存与恢复', () => {
  it('旧需求显示空态，未验证内容不会显示已确认', async () => {
    const wrapper = openCard()
    await flushPromises()
    expect(wrapper.text()).toContain('未开始')
    expect(wrapper.text()).toContain('尚未定义成功标准')
    expect(button(wrapper, '确认定义').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('保存失败保留输入并允许重试', async () => {
    vi.mocked(saveDefinitionApi).mockRejectedValueOnce(new Error('offline'))
    const wrapper = openCard()
    await flushPromises()
    await button(wrapper, '完善问题定义').trigger('click')
    await wrapper.find('textarea').setValue('重要问题')
    await button(wrapper, '保存定义').trigger('click')
    await flushPromises()
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('重要问题')
    expect(wrapper.text()).toContain('输入已保留')
    expect(vi.mocked(confirmDefinitionApi)).not.toHaveBeenCalled()
    expect(button(wrapper, '保存定义').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
  it('版本冲突读取最新内容，不覆盖草稿；显式选择后按新版本保存', async () => {
    vi.mocked(saveDefinitionApi).mockRejectedValueOnce({
      response: { status: 409, data: { message: '版本冲突' } }
    })
    const wrapper = openCard()
    await flushPromises()
    await button(wrapper, '完善问题定义').trigger('click')
    await wrapper.find('textarea').setValue('我的草稿')
    await button(wrapper, '保存定义').trigger('click')
    await flushPromises()
    expect(button(wrapper, '保存定义').attributes('disabled')).toBeDefined()
    const newest = {
      ...initial(),
      version: 2,
      definition: { ...emptyDefinition(), problemStatement: '其他人的内容' }
    }
    vi.mocked(getDefinitionApi).mockResolvedValueOnce(newest)
    await button(wrapper, '查看最新版本').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('其他人的内容')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('我的草稿')
    await button(wrapper, '保留当前草稿，按最新版本继续编辑').trigger('click')
    vi.mocked(saveDefinitionApi).mockResolvedValueOnce({
      ...newest,
      version: 3,
      definition: { ...emptyDefinition(), problemStatement: '我的草稿' }
    })
    await button(wrapper, '保存定义').trigger('click')
    await flushPromises()
    expect(saveDefinitionApi).toHaveBeenLastCalledWith(
      42,
      2,
      expect.objectContaining({ problemStatement: '我的草稿' })
    )
    wrapper.unmount()
  })
})
