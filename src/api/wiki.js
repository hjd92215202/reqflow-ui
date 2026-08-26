import request from './request'

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