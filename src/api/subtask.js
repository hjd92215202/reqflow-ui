import request from './request'

/**
 * 1. 根据“阶段ID”获取该执行阶段下的所有子任务
 * 对接后端：GET /api/subtasks/stage/{stageId}
 * @param {number} stageId - 阶段ID
 */
export function getSubTasksApi(stageId) {
  return request.get(`/api/subtasks/stage/${stageId}`)
}

/**
 * 2. 创建一个属于特定阶段的子任务
 * 对接后端：POST /api/subtasks
 * @param {object} data - 包含: stageId, title, assignee
 */
export function createSubTaskApi(data) {
  return request.post('/api/subtasks', data)
}

/**
 * 3. 更新子任务（支持勾选完成状态、修改标题、修改负责人）
 * 对接后端：PUT /api/subtasks/{id}
 * @param {number} id - 子任务ID
 * @param {object} data - 子任务数据对象
 */
export function updateSubTaskApi(id, data) {
  return request.put(`/api/subtasks/${id}`, data)
}

/**
 * 4. 删除指定的子任务
 * 对接后端：DELETE /api/subtasks/{id}
 * @param {number} id - 子任务ID
 */
export function deleteSubTaskApi(id) {
  return request.delete(`/api/subtasks/${id}`)
}