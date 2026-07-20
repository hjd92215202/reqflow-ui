import request from './request' // 引入统一请求工具

/**
 * 1. 获取某个主需求下的所有进展讨论记录（时间轴数据）
 * @param {number} reqId - 主需求ID
 */
export function getDiscussionsApi(reqId) {
  return request.get(`/api/discussions/requirement/${reqId}`)
}

/**
 * 2. 提交一条新的沟通讨论/进展记录
 * @param {object} data - 包含: requirementId, content
 */
export function createDiscussionApi(data) {
  return request.post('/api/discussions', data)
}