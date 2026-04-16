import { http, HttpResponse } from 'msw'
import jobs from './fixtures/jobs.json'
import candidateData from './fixtures/candidate.json'
import scores from './fixtures/scores.json'
import lookups from './fixtures/lookups.json'
import { applicationsStore } from './applicationsStore'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
  }
}

export const handlers = [
  // ── User auth ─────────────────────────────────────────────────────────────
  http.post(`${BASE}/user/login`, () =>
    HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
  ),

  http.post(`${BASE}/user/register`, async ({ request }) => {
    const body = await request.json() as {
      email?: string
      firstName?: string
      lastName?: string
      password?: string
    }
    if (!body.email || !body.firstName || !body.lastName || !body.password) {
      return HttpResponse.json(
        { message: 'Validation failed: email, firstName, lastName, and password are required' },
        { status: 400 },
      )
    }
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    })
  }),

  http.post(`${BASE}/user/refresh`, () =>
    HttpResponse.json({ accessToken: 'mock-access-token-refreshed' }),
  ),

  // ── Lookups ───────────────────────────────────────────────────────────────
  http.get(`${BASE}/company`, () => HttpResponse.json({ items: lookups.companies })),
  http.get(`${BASE}/location`, () => HttpResponse.json({ items: lookups.locations })),
  http.get(`${BASE}/sector`, () => HttpResponse.json({ items: lookups.sectors })),
  http.get(`${BASE}/speciality`, () => HttpResponse.json({ items: lookups.specialities })),
  http.get(`${BASE}/experience-level`, () => HttpResponse.json({ items: lookups.experienceLevels })),
  http.get(`${BASE}/contract-type`, () => HttpResponse.json({ items: lookups.contractTypes })),
  http.get(`${BASE}/apply-type`, () => HttpResponse.json({ items: lookups.applyTypes })),

  // ── Jobs ──────────────────────────────────────────────────────────────────
  http.get(`${BASE}/job-description`, ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const publishedFrom = url.searchParams.get('publishedFrom')
    const publishedTo = url.searchParams.get('publishedTo')
    const companyIds = url.searchParams.getAll('companyId').map(Number)
    const locationIds = url.searchParams.getAll('locationId').map(Number)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')

    let filtered = [...jobs]

    if (search) {
      filtered = filtered.filter(
        j =>
          j.title.toLowerCase().includes(search) ||
          (j.description ?? '').toLowerCase().includes(search),
      )
    }
    if (publishedFrom) {
      filtered = filtered.filter(j => j.publishedAt >= publishedFrom)
    }
    if (publishedTo) {
      filtered = filtered.filter(j => j.publishedAt <= publishedTo)
    }
    if (companyIds.length > 0) {
      filtered = filtered.filter(j => companyIds.includes(j.company.companyId))
    }
    if (locationIds.length > 0) {
      filtered = filtered.filter(j => j.location && locationIds.includes(j.location.locationId))
    }

    const sort = url.searchParams.get('sort') ?? 'publishedAt:desc'
    if (sort === 'publishedAt:asc') {
      filtered.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
    } else {
      filtered.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    }

    return HttpResponse.json(paginate(filtered, page, limit))
  }),

  http.get(`${BASE}/job-description/:id`, ({ params }) => {
    const job = jobs.find(j => j.jobDescriptionId === Number(params['id']))
    if (!job) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(job)
  }),

  // ── Candidates ────────────────────────────────────────────────────────────
  http.get(`${BASE}/candidate-profile`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')

    const listItem = {
      candidateProfileId: candidateData.candidateProfileId,
      fullName: candidateData.fullName,
      headline: candidateData.headline,
      yearsExperience: candidateData.yearsExperience,
      location: candidateData.location,
      experienceLevel: candidateData.experienceLevel,
      skillsCount: candidateData.skillsJson.length,
      version: candidateData.version,
      updatedAt: candidateData.updatedAt,
    }
    return HttpResponse.json(paginate([listItem], page, limit))
  }),

  http.get(`${BASE}/candidate-profile/:id`, ({ params }) => {
    if (Number(params['id']) !== candidateData.candidateProfileId) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(candidateData)
  }),

  // ── Scores ────────────────────────────────────────────────────────────────
  http.get(`${BASE}/job-scoring/candidate/:candidateId`, ({ request, params }) => {
    if (Number(params['candidateId']) !== candidateData.candidateProfileId) {
      return HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 })
    }

    const url = new URL(request.url)
    const minScore = Number(url.searchParams.get('minScore') ?? '0')
    const locationMatchParam = url.searchParams.get('locationMatch')
    const search = url.searchParams.get('search')?.toLowerCase()
    const sort = url.searchParams.get('sort') ?? 'score:desc'
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')

    let filtered = [...scores]
    if (minScore > 0) filtered = filtered.filter(s => s.score >= minScore)
    if (locationMatchParam !== null) {
      const wantMatch = locationMatchParam === 'true'
      filtered = filtered.filter(s => s.reasons?.locationMatch === wantMatch)
    }
    if (search) {
      filtered = filtered.filter(s => s.job.title.toLowerCase().includes(search))
    }
    if (sort === 'score:asc') filtered.sort((a, b) => a.score - b.score)
    else if (sort === 'publishedAt:desc') {
      filtered.sort((a, b) => b.job.publishedAt.localeCompare(a.job.publishedAt))
    } else {
      filtered.sort((a, b) => b.score - a.score)
    }

    return HttpResponse.json(paginate(filtered, page, limit))
  }),

  // ── Applications ──────────────────────────────────────────────────────────
  http.get(`${BASE}/candidate-profile/:candidateProfileId/applications`, ({ params }) => {
    const items = applicationsStore.getForCandidate(Number(params['candidateProfileId']))
    return HttpResponse.json({ items })
  }),

  http.get(`${BASE}/candidate-profile/:candidateProfileId/applications/:applicationId`, ({ params }) => {
    const app = applicationsStore.getOne(
      Number(params['candidateProfileId']),
      String(params['applicationId']),
    )
    if (!app) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(app)
  }),

  http.post(`${BASE}/candidate-profile/:candidateProfileId/applications`, async ({ request, params }) => {
    const candidateProfileId = Number(params['candidateProfileId'])
    const body = await request.json() as { jobDescriptionId: number; statusName?: string; appliedAt?: string }
    const result = applicationsStore.add(candidateProfileId, body.jobDescriptionId, {
      statusName: body.statusName,
      appliedAt: body.appliedAt,
    })
    if ('conflict' in result) {
      return HttpResponse.json(
        { message: 'Application already exists for this candidate and job' },
        { status: 409 },
      )
    }
    return HttpResponse.json(result, { status: 201 })
  }),

  http.patch(`${BASE}/candidate-profile/:candidateProfileId/applications/:applicationId`, async ({ request, params }) => {
    const body = await request.json() as { statusName?: string; appliedAt?: string }
    const updated = applicationsStore.update(
      Number(params['candidateProfileId']),
      String(params['applicationId']),
      body,
    )
    if (!updated) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete(`${BASE}/candidate-profile/:candidateProfileId/applications/:applicationId`, ({ params }) => {
    const removed = applicationsStore.remove(
      Number(params['candidateProfileId']),
      String(params['applicationId']),
    )
    if (!removed) return new HttpResponse(null, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),
]
