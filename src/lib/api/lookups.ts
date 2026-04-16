import { apiClient } from './client'
import { LookupListSchema } from '@/lib/schemas'

export const getLookup = (path: string) => apiClient.get(path, LookupListSchema)

export const getCompanies = () => getLookup('/company')
export const getLocations = () => getLookup('/location')
export const getSectors = () => getLookup('/sector')
export const getSpecialities = () => getLookup('/speciality')
export const getExperienceLevels = () => getLookup('/experience-level')
export const getContractTypes = () => getLookup('/contract-type')
export const getApplyTypes = () => getLookup('/apply-type')
