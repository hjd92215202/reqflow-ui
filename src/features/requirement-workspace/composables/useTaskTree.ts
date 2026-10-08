import type { SubTask, TaskDependency } from '@/types'
import type { TaskFilters } from '@/types'

/** 扁平数组递归构建为树形结构，兼容 parentId 与 parent_id */
export function arrayToTree(list: SubTask[]): SubTask[] {
  const map: Record<number, number> = {}
  const roots: SubTask[] = []
  const clonedList: SubTask[] = list.map(item => ({
    ...item,
    children: []
  }))

  for (let i = 0; i < clonedList.length; i++) {
    map[clonedList[i].id] = i
  }

  for (let i = 0; i < clonedList.length; i++) {
    const node = clonedList[i]
    const pId =
      node.parentId !== undefined && node.parentId !== null ? node.parentId : node.parent_id
    if (pId && map[pId] !== undefined) {
      clonedList[map[pId]].children!.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/** 扁平化展开整棵任务树（用于索引比对与前置依赖检查） */
export function flattenTaskTree(nodes: SubTask[]): SubTask[] {
  const result: SubTask[] = []
  const traverse = (items: SubTask[]) => {
    for (const item of items) {
      result.push(item)
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    }
  }
  traverse(nodes)
  return result
}

/** 根据 ID 递归寻找指定任务节点 */
export function findTaskInTree(nodes: SubTask[], taskId: number): SubTask | null {
  for (const node of nodes) {
    if (node.id === taskId) return node
    if (node.children && node.children.length > 0) {
      const match = findTaskInTree(node.children, taskId)
      if (match) return match
    }
  }
  return null
}

/** 递归扫描任务树中所有出现的动态字段 JSONB Key */
export function scanCustomColumns(list: SubTask[]): string[] {
  const keys = new Set<string>()
  const traverse = (items: SubTask[]) => {
    for (const item of items) {
      if (item.customFields) {
        Object.keys(item.customFields).forEach(k => {
          if (k && k.trim() !== '') {
            keys.add(k.trim())
          }
        })
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    }
  }
  traverse(list)
  return Array.from(keys)
}

/** 原地局部替换/更新树节点，避免全局重新拉取 */
export function updateOriginalNode(nodes: SubTask[], updatedNode: SubTask): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === updatedNode.id) {
      nodes[i].title = updatedNode.title
      nodes[i].status = updatedNode.status
      nodes[i].assignee = updatedNode.assignee
      nodes[i].startDate = updatedNode.startDate
      nodes[i].endDate = updatedNode.endDate
      nodes[i].note = updatedNode.note ?? ''
      nodes[i].customFields = { ...updatedNode.customFields }
      return true
    }
    const children = nodes[i].children
    if (children && children.length > 0) {
      const found = updateOriginalNode(children, updatedNode)
      if (found) return true
    }
  }
  return false
}

/** 树形结构多维条件过滤：若子项命中，保留父级以维系上下文层级 */
export function filterTreeData(nodes: SubTask[], filters: TaskFilters): SubTask[] {
  const result: SubTask[] = []
  const kw = filters.keyword.trim().toLowerCase()

  for (const node of nodes) {
    const clonedNode: SubTask = { ...node, children: [] }

    if (node.children && node.children.length > 0) {
      clonedNode.children = filterTreeData(node.children, filters)
    }

    const matchKeyword = !kw || node.title.toLowerCase().includes(kw)
    const matchStatus = filters.statuses.length === 0 || filters.statuses.includes(node.status)
    const nodeAssignee = node.assignee ? node.assignee.trim() : '未分配'
    const matchAssignee = filters.assignees.length === 0 || filters.assignees.includes(nodeAssignee)

    let matchCustomFields = true
    for (const [key, selectedVals] of Object.entries(filters.customFields)) {
      if (selectedVals && selectedVals.length > 0) {
        const fieldVal = node.customFields?.[key] ? String(node.customFields[key]).trim() : '空'
        if (!selectedVals.includes(fieldVal)) {
          matchCustomFields = false
          break
        }
      }
    }

    const currentMatches = matchKeyword && matchStatus && matchAssignee && matchCustomFields
    const hasMatchingChildren = Boolean(clonedNode.children && clonedNode.children.length > 0)

    if (currentMatches || hasMatchingChildren) {
      result.push(clonedNode)
    }
  }
  return result
}

export interface TaskBlockedResult {
  isBlocked: boolean
  blockingTasks: SubTask[]
  blockingNames: string
}

/** 校验任务是否被前置未完成任务阻塞 */
export function checkTaskBlocked(
  task: SubTask,
  allFlatTasks: SubTask[],
  dependencies: TaskDependency[]
): TaskBlockedResult {
  if (task.status === 'DONE') {
    return { isBlocked: false, blockingTasks: [], blockingNames: '' }
  }

  const flatMap = new Map<number, SubTask>(allFlatTasks.map(t => [t.id, t]))
  const myPredecessorDeps = dependencies.filter(d => d.successorId === task.id)

  const blockingTasks: SubTask[] = []
  for (const dep of myPredecessorDeps) {
    const predecessor = flatMap.get(dep.predecessorId)
    if (predecessor && predecessor.status !== 'DONE') {
      blockingTasks.push(predecessor)
    }
  }

  return {
    isBlocked: blockingTasks.length > 0,
    blockingTasks,
    blockingNames: blockingTasks.map(t => t.title).join('、')
  }
}
