import request from './request'
import axios from 'axios'

// 1. 向后端申请/获取文档专属的安全随机 Share Token (需要当前用户鉴权)
export function getDocShareTokenApi(id) {
  return request.post(`/api/wikis/${id}/share-token`)
}

// 2. 免鉴权只读公开分享请求 (根据安全随机 Token 查找)
export function getSharedWikiDetailApi(token, customBaseUrl) {
  const url = customBaseUrl 
    ? `${customBaseUrl.replace(/\/$/, '')}/api/wikis/share/${token}`
    : `/api/wikis/share/${token}`
  return axios.get(url).then(res => res.data)
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