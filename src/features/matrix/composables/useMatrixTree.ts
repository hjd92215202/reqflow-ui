// src/features/matrix/composables/useMatrixTree.ts
import type { SubTask, TaskDependency } from '@/types'

/** 一维扁平任务列表转换为递归树形结构 */
export function arrayToTree(list: SubTask[]): SubTask[] {
  const map: Record<number, number> = {}
  const roots: SubTask[] = []
  const clonedList = list.map(item => ({ ...item, children: [] as SubTask[] }))

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

/** 深度优先递归扫描整棵树，动态提取所有的 JSONB 扩展列 Key */
export function scanCustomColumns(list: SubTask[]): string[] {
  const keys = new Set<string>()
  const traverse = (items: SubTask[]) => {
    items.forEach(item => {
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
    })
  }
  traverse(list)
  return Array.from(keys)
}

/** 递归更新树中的指定节点数据 */
export function updateOriginalNode(nodes: SubTask[], updatedNode: SubTask): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === updatedNode.id) {
      nodes[i].status = updatedNode.status
      nodes[i].title = updatedNode.title
      nodes[i].assignee = updatedNode.assignee
      nodes[i].startDate = updatedNode.startDate
      nodes[i].endDate = updatedNode.endDate
      nodes[i].customFields = { ...updatedNode.customFields }
      return true
    }
    // 提取局部变量以让 TypeScript 严格收窄类型
    const childList = nodes[i].children
    if (childList && childList.length > 0) {
      const found = updateOriginalNode(childList, updatedNode)
      if (found) return true
    }
  }
  return false
}

/** 树形数据多条件综合过滤（状态 + 表头自定义列筛选） */
export function filterTreeData(
  nodes: SubTask[],
  allowedStatuses: string[],
  currentFilters: Record<string, any[]>
): SubTask[] {
  const result: SubTask[] = []
  for (const node of nodes) {
    const clonedNode: SubTask = { ...node, children: [] }

    const nodeChildren = node.children
    if (nodeChildren && nodeChildren.length > 0) {
      clonedNode.children = filterTreeData(nodeChildren, allowedStatuses, currentFilters)
    }

    const isStatusMatch = allowedStatuses.length === 0 || allowedStatuses.includes(node.status)

    let isHeaderFiltersMatch = true
    for (const key in currentFilters) {
      if (key === 'status') continue
      const selectedVals = currentFilters[key]
      if (selectedVals && selectedVals.length > 0) {
        let nodeVal: string
        if (key === 'assignee') {
          nodeVal = node.assignee ? node.assignee.trim() : '未分配'
        } else {
          nodeVal = node.customFields?.[key] ? String(node.customFields[key]).trim() : '空'
        }
        if (!selectedVals.includes(nodeVal)) {
          isHeaderFiltersMatch = false
          break
        }
      }
    }

    const isCurrentMatch = isStatusMatch && isHeaderFiltersMatch
    // 增加可选链保护，避免 undefined 告警
    const hasMatchingChildren = Boolean(clonedNode.children && clonedNode.children.length > 0)

    if (isCurrentMatch || hasMatchingChildren) {
      result.push(clonedNode)
    }
  }
  return result
}

/** 统计某阶段下所有任务的总数与完成数 */
export function calculateStageTaskStats(tasks: SubTask[]): {
  total: number
  done: number
  percent: number
} {
  let total = 0
  let done = 0
  const countTasks = (list: SubTask[]) => {
    list.forEach(item => {
      total++
      if (item.status === 'DONE') done++
      if (item.children && item.children.length > 0) countTasks(item.children)
    })
  }
  countTasks(tasks)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, percent }
}

/** 扁平化提取整棵树中的所有子任务节点（便于 O(1) 索引比对） */
export function flattenTaskTree(nodes: SubTask[]): SubTask[] {
  const result: SubTask[] = []
  const traverse = (items: SubTask[]) => {
    items.forEach(item => {
      result.push(item)
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    })
  }
  traverse(nodes)
  return result
}

export interface TaskBlockedResult {
  isBlocked: boolean
  blockingTasks: SubTask[]
  blockingNames: string
}

/**
 * 校验某任务是否受到未完成前置任务的阻塞
 * 公式: IsBlocked = ∃ Predecessor p ∈ Dependencies, where p.status != 'DONE'
 */
export function checkTaskBlocked(
  task: SubTask,
  allFlatTasks: SubTask[],
  dependencies: TaskDependency[]
): TaskBlockedResult {
  // 如果任务本身已经是已完成，则不再视作阻塞状态
  if (task.status === 'DONE') {
    return { isBlocked: false, blockingTasks: [], blockingNames: '' }
  }

  const flatMap = new Map<number, SubTask>(allFlatTasks.map(t => [t.id, t]))
  // 找出所有以此任务为后置任务 (successor) 的依赖边
  const myPredecessorDeps = dependencies.filter(d => d.successorId === task.id)

  const blockingTasks: SubTask[] = []
  for (const dep of myPredecessorDeps) {
    const predecessor = flatMap.get(dep.predecessorId)
    // 若前置任务存在且状态不是 DONE，则构成有效阻塞
    if (predecessor && predecessor.status !== 'DONE') {
      blockingTasks.push(predecessor)
    }
  }

  const isBlocked = blockingTasks.length > 0
  const blockingNames = blockingTasks.map(t => t.title).join('、')
  return { isBlocked, blockingTasks, blockingNames }
}
