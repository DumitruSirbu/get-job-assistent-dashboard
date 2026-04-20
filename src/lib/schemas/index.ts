import { z } from 'zod'

// ---- Shared ----

export const PaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  })

// ---- Lookup types ----

export const CompanySchema = z.object({
  companyId: z.number(),
  companyName: z.string(),
})

export const LocationSchema = z.object({
  locationId: z.number(),
  countryName: z.string(),
})

export const SectorSchema = z.object({
  sectorId: z.number(),
  sectorName: z.string(),
})

export const SpecialitySchema = z.object({
  specialityId: z.number(),
  specialityName: z.string(),
})

export const ExperienceLevelSchema = z.object({
  experienceLevelId: z.number(),
  experienceLevelName: z.string(),
})

export const ContractTypeSchema = z.object({
  contractTypeId: z.number(),
  contractTypeName: z.string(),
})

export const ApplyTypeSchema = z.object({
  applyTypeId: z.number(),
  applyTypeName: z.string(),
})

export const LookupListSchema = z.object({
  items: z.array(z.object({ id: z.number(), name: z.string() })),
})

// ---- Application status ----

export const ApplicationStatusSchema = z.object({
  applicationStatusId: z.number(),
  statusName: z.string(),
})

export const ApplicationStatusListSchema = z.object({
  items: z.array(ApplicationStatusSchema),
})

// ---- Job ----

export const JobListItemSchema = z.object({
  jobDescriptionId: z.number(),
  title: z.string(),
  publishedAt: z.string(),
  jobUrl: z.string(),
  applyUrl: z.string(),
  salary: z.string().nullable(),
  applicationsCount: z.string().nullable(),
  postedTime: z.string().nullable(),
  company: CompanySchema,
  location: LocationSchema.nullable(),
  sector: SectorSchema,
  speciality: SpecialitySchema,
  experienceLevel: ExperienceLevelSchema,
  contractType: ContractTypeSchema,
  applyType: ApplyTypeSchema,
})

export const JobDetailSchema = JobListItemSchema.extend({
  description: z.string().nullable(),
  descriptionHtml: z.string().nullable(),
  benefits: z.string().nullable(),
  posterFullName: z.string().nullable(),
  posterProfileUrl: z.string().nullable(),
})

export const PaginatedJobsSchema = PaginatedSchema(JobListItemSchema)

// ---- Candidate ----

export const SkillSchema = z.object({
  name: z.string(),
  level: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
})

export const CandidateListItemSchema = z.object({
  candidateProfileId: z.number(),
  fullName: z.string(),
  headline: z.string().nullable(),
  yearsExperience: z.number().nullable(),
  location: LocationSchema.nullable(),
  experienceLevel: ExperienceLevelSchema.nullable(),
  skillsCount: z.number(),
  version: z.string(),
  updatedAt: z.string(),
})

export const CandidateDetailSchema = z.object({
  candidateProfileId: z.number(),
  fullName: z.string(),
  headline: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  openToRemote: z.boolean(),
  yearsExperience: z.number().nullable(),
  version: z.string(),
  cvRawText: z.string().nullable(),
  skillsJson: z.array(SkillSchema),
  location: LocationSchema.nullable(),
  experienceLevel: ExperienceLevelSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const PaginatedCandidatesSchema = PaginatedSchema(CandidateListItemSchema)

// ---- Companies ----

export const CompanyListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  isBlacklisted: z.boolean(),
})

export const PaginatedCompaniesSchema = PaginatedSchema(CompanyListItemSchema)

// ---- Scores ----

export const ScoreReasonsSchema = z.object({
  matchedSkills: z.array(z.string()).optional().default([]),
  missingSkills: z.array(z.string()).optional().default([]),
  seniorityMatch: z.boolean().optional().default(false),
  locationMatch: z.boolean().optional().default(false),
  summary: z.string().optional().default(''),
})

const ScorerModelSchema = z.object({
  scorerModelId: z.number().optional(),
  scorerType: z.string().optional(),
  scorerProvider: z.string().optional(),
  scorerModel: z.string().optional(),
})

export const ScoredJobSchema = z.object({
  jobMatchScoreId: z.number(),
  score: z.number(),
  // real API: reasonsJson / mock: reasons
  reasons: ScoreReasonsSchema.nullable().optional(),
  reasonsJson: ScoreReasonsSchema.nullable().optional(),
  // real API: scorerModel{scorerType,scorerProvider,scorerModel} / mock: scorer{type,provider,model,version}
  scorer: z.object({
    type: z.string().optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
  scorerModel: ScorerModelSchema.optional(),
  createdAt: z.string(),
  // real API: jobDescription / mock: job
  job: JobListItemSchema.optional(),
  jobDescription: JobListItemSchema.optional(),
}).transform(data => ({
  ...data,
  job: data.job ?? data.jobDescription,
  reasons: data.reasons ?? data.reasonsJson ?? null,
  scorer: data.scorer ?? (data.scorerModel
    ? { type: data.scorerModel.scorerType, provider: data.scorerModel.scorerProvider, model: data.scorerModel.scorerModel, version: undefined }
    : undefined),
}))

export const PaginatedScoredJobsSchema = PaginatedSchema(ScoredJobSchema)

// ---- Applications ----

export const ApplicationSchema = z.object({
  applicationId: z.number(),
  candidateProfileId: z.number(),
  jobDescriptionId: z.number(),
  appliedAt: z.string(),
  status: z.string(),
})

export const ApplicationsResponseSchema = z.object({
  items: z.array(ApplicationSchema),
})

export const ProcessNewJobsResponseSchema = z.object({ queued: z.number() })

// ---- Region ----

export const RegionSchema = z.object({
  jobRegionId: z.number(),
  name: z.string(),
  isSelectedByDefault: z.boolean().catch(false),
}).transform(({ jobRegionId, ...rest }) => ({ id: jobRegionId, ...rest }))
export const RegionListSchema = z.object({ items: z.array(RegionSchema) })
export type Region = z.infer<typeof RegionSchema>

// ---- Auth ----

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
})

// ---- Inferred types ----

export type Company = z.infer<typeof CompanySchema>
export type Location = z.infer<typeof LocationSchema>
export type Sector = z.infer<typeof SectorSchema>
export type Speciality = z.infer<typeof SpecialitySchema>
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>
export type ContractType = z.infer<typeof ContractTypeSchema>
export type ApplyType = z.infer<typeof ApplyTypeSchema>
export type LookupList = z.infer<typeof LookupListSchema>
export type JobListItem = z.infer<typeof JobListItemSchema>
export type JobDetail = z.infer<typeof JobDetailSchema>
export type PaginatedJobs = z.infer<typeof PaginatedJobsSchema>
export type Skill = z.infer<typeof SkillSchema>
export type CandidateListItem = z.infer<typeof CandidateListItemSchema>
export type CandidateDetail = z.infer<typeof CandidateDetailSchema>
export type PaginatedCandidates = z.infer<typeof PaginatedCandidatesSchema>
export type CompanyListItem = z.infer<typeof CompanyListItemSchema>
export type PaginatedCompanies = z.infer<typeof PaginatedCompaniesSchema>
export type ScoreReasons = z.infer<typeof ScoreReasonsSchema>
export type ScoredJob = z.infer<typeof ScoredJobSchema>
export type PaginatedScoredJobs = z.infer<typeof PaginatedScoredJobsSchema>
export type Application = z.infer<typeof ApplicationSchema>
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>
export type ApplicationStatusList = z.infer<typeof ApplicationStatusListSchema>
export type ProcessNewJobsResponse = z.infer<typeof ProcessNewJobsResponseSchema>
