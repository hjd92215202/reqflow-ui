import request from './request'

export function getRequirementsListApi() {
  return request({
    url: '/api/requirements',
    method: 'get'
  })
}

export function createRequirementApi(data) {
  return request({
    url: '/api/requirements',
    method: 'post',
    data
  })
}

export function updateRequirementApi(id, data) {
  return request({
    url: `/api/requirements/${id}`,
    method: 'put',
    data
  })
}

export function deleteRequirementApi(id) {
  return request({
    url: `/api/requirements/${id}`,
    method: 'delete'
  })
}