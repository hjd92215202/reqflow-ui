// src/api/wiki.js
import request from './request'

// 1. 向后端申请/获取文档专属的安全随机 Share Token (需要当前用户鉴权)
export function getDocShareTokenApi(id) {
  return request.post(`/api/wikis/${id}/share-token`)
}

// 2. 根据只读 Token 获取公开文档详情（免登录）
export function getSharedWikiDetailApi(token) {
  return request.get(`/api/wikis/share/${token}`)
}

export function getWikiListApi(params) {
  return request.get('/api/wikis', { params })
}

export function getWikiDetailApi(id) {
  return request.get(`/api/wikis/${id}`)
}

export function createWikiApi(data) {
  return request.post('/api/wikis', data)
}

export function updateWikiApi(id, data) {
  return request.put(`/api/wikis/${id}`, data)
}

export function deleteWikiApi(id) {
  return request.delete(`/api/wikis/${id}`)
}
