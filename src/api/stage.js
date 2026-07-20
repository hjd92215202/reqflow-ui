import request from './request' // 引入基础 Axios 实例

/**
 * 1. 查询某个主需求下的所有执行阶段列表
 * 对接后端：GET /api/stages/requirement/{requirementId}
 * @param {number} requirementId - 主需求ID
 */
export function getStagesApi(requirementId) {
  return request.get(`/api/stages/requirement/${requirementId}`)
}

/**
 * 2. 划分并新建一个执行阶段
 * 对接后端：POST /api/stages
 * @param {object} data - 包含: requirementId, title, startDate, endDate
 */
export function createStageApi(data) {
  return request.post('/api/stages', data)
}

/**
 * 3. 更新某个执行阶段的属性（如修改时间范围或标题）
 * 对接后端：PUT /api/stages/{id}
 * @param {number} id - 阶段ID
 * @param {object} data - 修改后的阶段完整属性对象
 */
export function updateStageApi(id, data) {
  return request.put(`/api/stages/${id}`, data)
}

/**
 * 4. 删除指定的执行阶段
 * 对接后端：DELETE /api/stages/{id}
 * @param {number} id - 阶段ID
 */
export function deleteStageApi(id) {
  return request.delete(`/api/stages/${id}`)
}