import { apiClient } from './client'
import { ApplicationsResponseSchema, ApplicationSchema } from '@/lib/schemas'

const base = (candidateProfileId: number) =>
  `/candidate-profile/${candidateProfileId}/applications`

export function getApplicationsForCandidate(candidateProfileId: number) {
  return apiClient.get(base(candidateProfileId), ApplicationsResponseSchema)
}

export function createApplication(
  candidateProfileId: number,
  jobDescriptionId: number,
  opts?: { statusName?: string; appliedAt?: string },
) {
  return apiClient.post(base(candidateProfileId), { jobDescriptionId, ...opts }, ApplicationSchema)
}

export function updateApplication(
  candidateProfileId: number,
  applicationId: number,
  body: { statusName?: string; appliedAt?: string },
) {
  return apiClient.patch(`${base(candidateProfileId)}/${applicationId}`, body, ApplicationSchema)
}

export function deleteApplication(candidateProfileId: number, applicationId: number) {
  return apiClient.delete(`${base(candidateProfileId)}/${applicationId}`)
}
