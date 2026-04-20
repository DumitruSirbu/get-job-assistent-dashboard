import { apiClient } from './client'
import { LookupListSchema, ApplicationStatusListSchema, RegionListSchema, RegionSchema } from '@/lib/schemas'

export const getLookup = (path: string) => apiClient.get(path, LookupListSchema)

export const getJobRegions = () => apiClient.get('/job-region', RegionListSchema)
export const createRegion = (data: { name: string; isSelectedByDefault: boolean }) =>
  apiClient.post('/job-region', data, RegionSchema)
export const updateRegion = (id: number, data: { name: string; isSelectedByDefault: boolean }) =>
  apiClient.put(`/job-region/${id}`, data, RegionSchema)
export const deleteRegion = (id: number) =>
  apiClient.delete(`/job-region/${id}`)

export const getCompanies = () => getLookup('/company')
export const getLocations = () => getLookup('/location')
export const getSectors = () => getLookup('/sector')
export const getSpecialities = () => getLookup('/speciality')
export const getExperienceLevels = () => getLookup('/experience-level')
export const getContractTypes = () => getLookup('/contract-type')
export const getApplyTypes = () => getLookup('/apply-type')
export const getApplicationStatuses = () => apiClient.get('/application-status', ApplicationStatusListSchema)
