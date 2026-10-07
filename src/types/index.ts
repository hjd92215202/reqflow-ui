// src/types/index.ts

// ==========================================
// 1. 基础状态与优先级枚举
// ==========================================
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type RequirementStatus = 'TODO' | 'IN_PROGRESS' | 'TESTING' | 'DONE' | 'SUSPENDED'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type DependencyType = 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH'

// ==========================================
// 2. 账号与认证
// ==========================================
export interface User {
  id: number
  username: string
  nickname?: string
  email?: string
  createdAt?: string
  updatedAt?: string
}

export interface LoginResponse {
  token: string
  nickname: string
}

// ==========================================
// 3. Workspace 与 Project (v2.0 增量)
// ==========================================
export interface Workspace {
  id: number
  name: string
  description?: string
  ownerId: number
  createdAt: string
  updatedAt?: string
}

export interface Project {
  id: number
  workspaceId: number
  name: string
  identifier: string // 项目代号，例如 "REQ", "PAY", "CORE"
  description?: string
  leadId?: number
  status: 'ACTIVE' | 'ARCHIVED'
  createdAt: string
  updatedAt?: string
}

// ==========================================
// 4. 需求事项 (Requirement)
// ==========================================
export interface Requirement {
  id: number
  projectId?: number
  title: string
  description?: string
  status: RequirementStatus
  priority: PriorityLevel
  startDate?: string | null // YYYY-MM-DD
  endDate?: string | null // YYYY-MM-DD
  creatorId: number
  createdAt: string
  updatedAt: string
}

// ==========================================
// 5. 执行阶段 (Stage)
// ==========================================
export interface Stage {
  id: number
  requirementId: number
  title: string
  startDate?: string | null
  endDate?: string | null
  status: TaskStatus
  createdAt?: string
  updatedAt?: string
  // 前端辅助属性（排期绑定）
  dateRange?: [string, string] | []
}

// ==========================================
// 6. 工作矩阵子任务 (SubTask，支持 JSONB 动态扩展列)
// ==========================================
export interface SubTask {
  id: number
  stageId: number
  parentId?: number | null
  parent_id?: number | null
  title: string
  assignee?: string
  status: TaskStatus
  startDate?: string | null
  endDate?: string | null
  // 严格映射 PostgreSQL JSONB 动态扩展字段
  customFields: Record<string, any>
  children?: SubTask[]
  // 前端运行时辅助字段
  dateRange?: [string, string] | []
  latestLog?: string
  predecessorIds?: number[]
}

// ==========================================
// 7. 任务依赖关系拓扑
// ==========================================
export interface TaskDependency {
  id: number
  predecessorId: number
  successorId: number
  type: DependencyType
  createdAt?: string
}

// ==========================================
// 8. 待办事项 (Todo，日常个人与需求派生双轨)
// ==========================================
export interface TodoItem {
  id: number
  userId: number
  title: string
  description?: string | null
  status: TaskStatus
  priority: PriorityLevel
  dueDate?: string | null
  isProjectTask: boolean
  subTaskId?: number
  stageId?: number
  stageTitle?: string
  requirementId?: number
  requirementTitle?: string
  createdAt: string
  updatedAt: string
}

// ==========================================
// 9. Wiki 知识库
// ==========================================
export interface WikiDocument {
  id: number
  requirementId?: number | null
  parentId?: number | null
  title: string
  content: string
  tags?: string
  creatorId: number
  creatorNickname?: string
  requirementTitle?: string
  shareToken?: string // 16位安全随机只读 Token
  createdAt?: string
  updatedAt?: string
}

// ==========================================
// 10. 分页响应与通用 API 响应规范
// ==========================================
export interface PageResult<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

// ==========================================
// 11. 全局工程操作审计流水 (Activity)
// ==========================================
export interface ActivityLog {
  id: number
  workspaceId: number
  userId: number
  userName: string
  targetType: 'REQUIREMENT' | 'STAGE' | 'SUB_TASK' | 'WIKI' | 'PROJECT' | string
  targetId: number
  actionType: string
  summary: string
  detailDiff?: Record<string, any>
  createdAt: string
}

// ==========================================
// 12. Requirement Workspace (第二层设计专属状态定义)
// ==========================================
export type RequirementWorkspaceTab = 'overview' | 'plan' | 'execution' | 'activity' | 'knowledge'

export type TaskViewMode = 'matrix' | 'list' | 'kanban' | 'timeline' | 'dependency'

export interface TaskFilters {
  keyword: string
  statuses: TaskStatus[]
  assignees: string[]
  customFields: Record<string, string[]>
}

export interface RequirementWorkspaceState {
  requirementId: number
  tab: RequirementWorkspaceTab
  stageId: number | null
  taskId: number | null
  taskView: TaskViewMode
}
