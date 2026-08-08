import request from './request'

export function getMyTodosApi() {
  return request.get('/api/todos')
}

export function createTodoApi(data) {
  return request.post('/api/todos', data)
}

export function updateTodoApi(id, data) {
  return request.put(`/api/todos/${id}`, data)
}

export function toggleTodoApi(id, isProjectTask = false) {
  return request.patch(`/api/todos/${id}/toggle`, null, {
    params: { isProjectTask }
  })
}

export function deleteTodoApi(id, isProjectTask = false) {
  return request.delete(`/api/todos/${id}`, {
    params: { isProjectTask }
  })
}