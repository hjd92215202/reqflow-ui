import { describe, expect, it } from 'vitest'
import {
  definitionError,
  definitionIsComplete,
  emptyDefinition,
  normalizeDefinition
} from '../src/features/requirement/types/definition'

describe('问题定义规则', () => {
  it('空定义允许草稿保存，但不能确认', () => {
    expect(definitionError(emptyDefinition())).toBe('')
    expect(definitionIsComplete(emptyDefinition())).toBe(false)
  })
  it('必须填写问题、目标和非空成功标准才能确认', () => {
    const value = {
      ...emptyDefinition(),
      problemStatement: '问题',
      targetOutcome: '结果',
      successCriteria: [
        { id: 'stable-id', description: '达到预期', suggestedMethod: '', targetValue: '' }
      ]
    }
    expect(definitionIsComplete(value)).toBe(true)
    value.successCriteria[0].description = ' '
    expect(definitionIsComplete(value)).toBe(false)
    expect(definitionError(value)).toContain('成功标准描述')
  })
  it('去除空白不更改成功标准 ID', () => {
    const value = {
      ...emptyDefinition(),
      constraints: [' 条件 ', '', ' '],
      successCriteria: [
        { id: 'stable-id', description: ' 结果 ', suggestedMethod: ' 方法 ', targetValue: '' }
      ]
    }
    const normalized = normalizeDefinition(value)
    expect(normalized.constraints).toEqual(['条件'])
    expect(normalized.successCriteria[0]).toEqual({
      id: 'stable-id',
      description: '结果',
      suggestedMethod: '方法',
      targetValue: ''
    })
    expect(value.constraints).toHaveLength(3)
  })
  it('限制列表数量和每项长度', () => {
    expect(definitionError({ ...emptyDefinition(), constraints: Array(51).fill('约束') })).not.toBe(
      ''
    )
    expect(definitionError({ ...emptyDefinition(), assumptions: ['a'.repeat(1001)] })).not.toBe('')
  })
})
