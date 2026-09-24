// src/features/todo/api.ts
import request from '@/api/request'
import type { TodoItem } from '@/types'

export function getMyTodosApi(): Promise<TodoItem[]> {
  return request.get<TodoItem[]>('/api/todos')
}

export function createTodoApi(data: Partial<TodoItem>): Promise<TodoItem> {
  return request.post<TodoItem>('/api/todos', data)
}

export function updateTodoApi(id: number, data: Partial<TodoItem>): Promise<TodoItem> {
  return request.put<TodoItem>(`/api/todos/${id}`, data)
}

export function toggleTodoApi(id: number, isProjectTask: boolean = false): Promise<TodoItem> {
  return request.patch<TodoItem>(`/api/todos/${id}/toggle`, null, {
    params: { isProjectTask }
  })
}

export function deleteTodoApi(id: number, isProjectTask: boolean = false): Promise<string> {
  return request.delete<string>(`/api/todos/${id}`, {
    params: { isProjectTask }
  })
}
