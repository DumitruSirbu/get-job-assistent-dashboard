import { z } from 'zod'
import { apiClient } from './client'
import { PaginatedCompaniesSchema } from '@/lib/schemas'

export interface CompanyFilters {
  search?: string
  isBlacklisted?: boolean
  page?: number
  limit?: number
}

function buildQuery(filters: CompanyFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.isBlacklisted !== undefined) params.set('isBlacklisted', String(filters.isBlacklisted))
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function listCompanies(filters: CompanyFilters = {}) {
  return apiClient.get(`/company${buildQuery(filters)}`, PaginatedCompaniesSchema)
}

export function blacklistCompany(id: number) {
  return apiClient.patch(`/company/${id}/blacklist`, undefined, z.void())
}

export function unblacklistCompany(id: number) {
  return apiClient.patch(`/company/${id}/unblacklist`, undefined, z.void())
}
