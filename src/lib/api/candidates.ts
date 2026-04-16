import { apiClient } from './client'
import { PaginatedCandidatesSchema, CandidateDetailSchema } from '@/lib/schemas'

export function listCandidates(page = 1, limit = 20) {
  return apiClient.get(`/candidate-profile?page=${page}&limit=${limit}`, PaginatedCandidatesSchema)
}

export function getCandidate(id: number) {
  return apiClient.get(`/candidate-profile/${id}`, CandidateDetailSchema)
}
