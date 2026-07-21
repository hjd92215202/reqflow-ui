import request from './request'

export function getCustomColumnsApi(requirementId) {
  return request.get(`/api/custom-columns/requirement/${requirementId}`)
}

export function createCustomColumnApi(data) {
  return request.post('/api/custom-columns', data)
}

export function deleteCustomColumnApi(id) {
  return request.delete(`/api/custom-columns/${id}`)
}