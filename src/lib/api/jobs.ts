import { apiClient } from './client'
import {
  PaginatedJobsSchema,
  JobDetailSchema,
  ProcessNewJobsResponseSchema,
  JobScrapingRunSnapshotSchema,
} from '@/lib/schemas'
import type { GetNewJobsParamsDto } from '@dumitru_sirbu92/get-job-assistant-sdk'

export interface JobFilters {
  search?: string
  publishedFrom?: string
  publishedTo?: string
  companyId?: number[]
  locationId?: number[]
  sectorId?: number[]
  specialityId?: number[]
  experienceLevelId?: number[]
  contractTypeId?: number[]
  applyTypeId?: number[]
  sort?: 'publishedAt:desc' | 'publishedAt:asc'
  page?: number
  limit?: number
}

function buildQuery(filters: JobFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.publishedFrom) params.set('publishedFrom', filters.publishedFrom)
  if (filters.publishedTo) params.set('publishedTo', filters.publishedTo)
  filters.companyId?.forEach(id => params.append('companyId', String(id)))
  filters.locationId?.forEach(id => params.append('locationId', String(id)))
  filters.sectorId?.forEach(id => params.append('sectorId', String(id)))
  filters.specialityId?.forEach(id => params.append('specialityId', String(id)))
  filters.experienceLevelId?.forEach(id => params.append('experienceLevelId', String(id)))
  filters.contractTypeId?.forEach(id => params.append('contractTypeId', String(id)))
  filters.applyTypeId?.forEach(id => params.append('applyTypeId', String(id)))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function listJobs(filters: JobFilters = {}) {
  return apiClient.get(`/job-description${buildQuery(filters)}`, PaginatedJobsSchema)
}

export function getJob(id: number) {
  return apiClient.get(`/job-description/${id}`, JobDetailSchema)
}

export function processNewJobs(params: GetNewJobsParamsDto) {
  return apiClient.post('/job-description/process-new-jobs', params, ProcessNewJobsResponseSchema)
}

export function getJobScrapingRun(runId: string) {
  return apiClient.get(`/job-description/runs/${runId}`, JobScrapingRunSnapshotSchema)
}
