import { apiClient } from './client'
import { PaginatedScoredJobsSchema } from '@/lib/schemas'

export interface ScoreFilters {
  minScore?: number
  locationMatch?: boolean
  search?: string
  sort?: 'score:desc' | 'score:asc' | 'publishedAt:desc'
  scoredFrom?: string
  scoredTo?: string
  page?: number
  limit?: number
}

function buildQuery(filters: ScoreFilters): string {
  const params = new URLSearchParams()
  if (filters.minScore !== undefined) params.set('minScore', String(filters.minScore))
  if (filters.locationMatch !== undefined) params.set('locationMatch', String(filters.locationMatch))
  if (filters.search) params.set('search', filters.search)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.scoredFrom) params.set('scoredFrom', filters.scoredFrom)
  if (filters.scoredTo) params.set('scoredTo', filters.scoredTo)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function listScoredJobsForCandidate(candidateId: number, filters: ScoreFilters = {}) {
  return apiClient.get(`/job-scoring/candidate/${candidateId}${buildQuery(filters)}`, PaginatedScoredJobsSchema)
}
