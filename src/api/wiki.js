import request from './request'

// 1. 向后端申请/获取文档专属的安全随机 Share Token (需要当前用户鉴权)
export function getDocShareTokenApi(id) {
  return request.post(`/api/wikis/${id}/share-token`)
}

export function getWikiListApi(params) {
  return request({
    url: '/api/wikis',
    method: 'get',
    params
  })
}

export function getWikiDetailApi(id) {
  return request({
    url: `/api/wikis/${id}`,
    method: 'get'
  })
}

export function createWikiApi(data) {
  return request({
    url: '/api/wikis',
    method: 'post',
    data
  })
}

export function updateWikiApi(id, data) {
  return request({
    url: `/api/wikis/${id}`,
    method: 'put',
    data
  })
}

export function deleteWikiApi(id) {
  return request({
    url: `/api/wikis/${id}`,
    method: 'delete'
  })
}