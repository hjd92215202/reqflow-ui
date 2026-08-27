import request from './request'
import axios from 'axios'

// 免鉴权只读公开分享请求 (支持动态传入私有化后端 BaseURL)
export function getSharedWikiDetailApi(id, customBaseUrl) {
  const url = customBaseUrl 
    ? `${customBaseUrl.replace(/\/$/, '')}/api/wikis/share/${id}`
    : `/api/wikis/share/${id}`
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