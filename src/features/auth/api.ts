// src/features/auth/api.ts
import request from '@/api/request'
import type { LoginResponse } from '@/types'

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  passwordHash: string
  nickname?: string
  email?: string
}

/** 用户登录 */
export function loginApi(data: LoginParams): Promise<LoginResponse> {
  return request.post<LoginResponse>('/api/auth/login', data)
}

/** 用户注册 */
export function registerApi(data: RegisterParams): Promise<string> {
  return request.post<string>('/api/auth/register', data)
}
