import { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listJobs, type JobFilters } from '@/lib/api/jobs'
import JobFiltersPanel from '@/components/jobs/JobFilters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Building2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { JobListItem } from '@/lib/schemas'

const PAGE_SIZE = 20

function filtersFromParams(params: URLSearchParams): JobFilters {
  return {
    search: params.get('search') ?? undefined,
    publishedFrom: params.get('publishedFrom') ?? undefined,
    publishedTo: params.get('publishedTo') ?? undefined,
    companyId: params.getAll('companyId').map(Number).filter(Boolean),
    locationId: params.getAll('locationId').map(Number).filter(Boolean),
    sort: (params.get('sort') as JobFilters['sort']) ?? 'publishedAt:desc',
    page: Number(params.get('page') ?? '1'),
    limit: PAGE_SIZE,
  }
}

function filtersToParams(f: JobFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.search) p.set('search', f.search)
  if (f.publishedFrom) p.set('publishedFrom', f.publishedFrom)
  if (f.publishedTo) p.set('publishedTo', f.publishedTo)
  f.companyId?.forEach(id => p.append('companyId', String(id)))
  f.locationId?.forEach(id => p.append('locationId', String(id)))
  if (f.sort && f.sort !== 'publishedAt:desc') p.set('sort', f.sort)
  if (f.page && f.page > 1) p.set('page', String(f.page))
  return p
}

export default function JobsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = filtersFromParams(searchParams)

  function setFilters(f: JobFilters) {
    setSearchParams(filtersToParams(f))
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => listJobs(filters),
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data ? `${data.total} job${data.total !== 1 ? 's' : ''} found` : 'Loading…'}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <JobFiltersPanel filters={filters} onChange={setFilters} />
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400">Loading jobs…</div>
      )}

      {isError && (
        <div className="text-center py-12 text-red-500">Failed to load jobs.</div>
      )}

      {data && (
        <>
          <div className="space-y-3">
            {data.items.length === 0 && (
              <div className="text-center py-12 text-gray-400">No jobs match your filters.</div>
            )}
            {data.items.map(job => (
              <JobRow key={job.jobDescriptionId} job={job} onClick={() => navigate(`/jobs/${job.jobDescriptionId}`)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Page {filters.page ?? 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page ?? 1) >= totalPages}
                  onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const JobRow = memo(function JobRow({ job, onClick }: { job: JobListItem; onClick: () => void }) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900 truncate">{job.title}</h2>
            <Badge variant={job.applyType.applyTypeName === 'EASY_APPLY' ? 'success' : 'outline'}>
              {job.applyType.applyTypeName === 'EASY_APPLY' ? 'Easy Apply' : 'External'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1 capitalize">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {job.company.companyName}
            </span>
            {job.location && (
              <span className="flex items-center gap-1 capitalize">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {job.location.countryName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {format(new Date(job.publishedAt), 'MMM d, yyyy')}
            </span>
            {job.salary && <span className="text-green-600 font-medium">{job.salary}</span>}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">{job.experienceLevel.experienceLevelName}</Badge>
            <Badge variant="secondary">{job.contractType.contractTypeName}</Badge>
            <Badge variant="outline">{job.sector.sectorName}</Badge>
          </div>
        </div>

        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 text-gray-400 hover:text-blue-600 p-1"
          title="Open job URL"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {job.applicationsCount && (
        <p className="mt-2 text-xs text-gray-400">{job.applicationsCount}</p>
      )}
    </div>
  )
})
