import request from '@/api/request'
import type { DefinitionResponse, RequirementDefinition } from '../types/definition'

export function getDefinitionApi(id: number): Promise<DefinitionResponse> {
  return request.get(`/api/requirements/${id}/definition`)
}

export function saveDefinitionApi(
  id: number,
  version: number,
  definition: RequirementDefinition
): Promise<DefinitionResponse> {
  return request.put(`/api/requirements/${id}/definition`, { version, definition })
}

export function confirmDefinitionApi(id: number, version: number): Promise<DefinitionResponse> {
  return request.post(`/api/requirements/${id}/definition/confirm`, { version })
}

export async function supportsDefinitionApi(): Promise<boolean> {
  const response = await request.get<{ requirementDefinition?: number } | string>(
    '/api/capabilities',
    { validateStatus: status => status === 200 || status === 404 }
  )
  return typeof response === 'object' && response !== null && response.requirementDefinition === 1
}
