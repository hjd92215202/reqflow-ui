import request from './request' // 引入我们在第一阶段配置的统一请求工具

/**
 * 1. 根据主需求ID获取其下的所有子任务
 * @param {number} reqId - 主需求ID
 */
export function getSubTasksApi(reqId) {
  return request.get(`/api/subtasks/requirement/${reqId}`)
}

/**
 * 2. 创建一个新的子任务
 * @param {object} data - 子任务数据，包含: requirementId, title, assignee
 */
export function createSubTaskApi(data) {
  return request.post('/api/subtasks', data)
}

/**
 * 3. 更新子任务（例如修改标题、修改负责人、或者勾选/取消勾选完成状态）
 * @param {number} id - 子任务ID
 * @param {object} data - 完整的子任务对象数据
 */
export function updateSubTaskApi(id, data) {
  return request.put(`/api/subtasks/${id}`, data)
}

/**
 * 4. 删除指定的子task
 * @param {number} id - 子任务ID
 */
export function deleteSubTaskApi(id) {
  return request.delete(`/api/subtasks/${id}`)
}