// src/features/wiki/api.ts
import request from '@/api/request'
import type { WikiDocument } from '@/types'

export interface ShareTokenResponse {
  shareToken: string
}

/** 获取安全只读分享 Token */
export function getDocShareTokenApi(id: number): Promise<ShareTokenResponse> {
  return request.post<ShareTokenResponse>(`/api/wikis/${id}/share-token`)
}

export function getWikiListApi(params?: { requirementId?: number }): Promise<WikiDocument[]> {
  return request.get<WikiDocument[]>('/api/wikis', { params })
}

export function getWikiDetailApi(id: number): Promise<WikiDocument> {
  return request.get<WikiDocument>(`/api/wikis/${id}`)
}

export function createWikiApi(data: Partial<WikiDocument>): Promise<WikiDocument> {
  return request.post<WikiDocument>('/api/wikis', data)
}

export function updateWikiApi(id: number, data: Partial<WikiDocument>): Promise<WikiDocument> {
  return request.put<WikiDocument>(`/api/wikis/${id}`, data)
}

export function deleteWikiApi(id: number): Promise<string> {
  return request.delete<string>(`/api/wikis/${id}`)
}
