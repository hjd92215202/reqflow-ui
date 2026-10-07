// src/features/activity/api.ts
import request from '@/api/request'
import type { ActivityLog, PageResult } from '@/types'

export interface ActivityQueryParams {
  workspaceId?: number
  page?: number
  size?: number
}

/** Fetch audit events from the configured server. */
export function getActivityLogsApi(
  params?: ActivityQueryParams
): Promise<PageResult<ActivityLog> | ActivityLog[]> {
  return request.get<PageResult<ActivityLog>>('/api/activities', { params })
}
