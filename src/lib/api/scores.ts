import { z } from 'zod'
import { JobScoreVisibilityEnum, type IToggleJobScoreVisibilityParams } from '@dumitru_sirbu92/get-job-assistant-sdk'
import { apiClient } from './client'
import { JobScoringRunSnapshotSchema, PaginatedScoredJobsSchema, StartScoringResponseSchema } from '@/lib/schemas'

export { JobScoreVisibilityEnum }
export type { IToggleJobScoreVisibilityParams }

export interface ScoreFilters {
  search?: string
  sort?: 'score:desc' | 'score:asc' | 'publishedAt:desc'
  scoredFrom?: string
  scoredTo?: string
  page?: number
  limit?: number
  applicationStatusIds?: number[]
  noApplication?: boolean
  companyIds?: number[]
  visibility?: JobScoreVisibilityEnum
}

function buildQuery(filters: ScoreFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.scoredFrom) params.set('scoredFrom', filters.scoredFrom)
  if (filters.scoredTo) params.set('scoredTo', filters.scoredTo)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  filters.applicationStatusIds?.forEach(id => params.append('applicationStatusId', String(id)))
  if (filters.noApplication) params.set('noApplication', 'true')
  filters.companyIds?.forEach(id => params.append('companyId', String(id)))
  if (filters.visibility) params.set('visibility', filters.visibility)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

const ToggleVisibilityResponseSchema = z.unknown()

export function toggleScoreVisibility(params: IToggleJobScoreVisibilityParams) {
  return apiClient.patch(
    `/job-scoring/scores/${params.id}/visibility`,
    { hidden: params.hidden },
    ToggleVisibilityResponseSchema,
  )
}

export function listScoredJobsForCandidate(candidateId: number, filters: ScoreFilters = {}) {
  return apiClient.get(`/job-scoring/candidate/${candidateId}${buildQuery(filters)}`, PaginatedScoredJobsSchema)
}

export function startJobScoring(
  candidateId: number,
  params?: {
    titleKeyword?: string
    limit?: number
    publishedFrom?: string
    publishedTo?: string
  }
) {
  return apiClient.post(`/job-scoring/score-newest-jobs/${candidateId}`, params ?? {}, StartScoringResponseSchema)
}

export function getJobScoringRunSnapshot(runId: string) {
  return apiClient.get(`/job-scoring/scoring-run/${runId}/snapshot`, JobScoringRunSnapshotSchema)
}
