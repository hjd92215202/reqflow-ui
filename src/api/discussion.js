import request from './request'

/**
 * 1. 根据“阶段ID”获取该执行阶段下的所有讨论和跟进记录
 * 对接后端：GET /api/discussions/stage/{stageId}
 * @param {number} stageId - 阶段ID
 */
export function getDiscussionsApi(stageId) {
  return request.get(`/api/discussions/stage/${stageId}`)
}

/**
 * 2. 提交一条属于特定阶段的沟通讨论/进展记录
 * 对接后端：POST /api/discussions
 * @param {object} data - 包含: stageId, content
 */
export function createDiscussionApi(data) {
  return request.post('/api/discussions', data)
}