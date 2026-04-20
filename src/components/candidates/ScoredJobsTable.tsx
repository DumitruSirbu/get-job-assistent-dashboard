import { memo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listScoredJobsForCandidate, type ScoreFilters } from '@/lib/api/scores'
import { getApplicationsForCandidate, createApplication, deleteApplication, updateApplication } from '@/lib/api/applications'
import { getApplicationStatuses } from '@/lib/api/lookups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronDown, ChevronRight, ChevronLeft, Circle, ExternalLink,
  MapPin, Building2, Check, X, Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  applied:   'text-blue-600',
  interview: 'text-amber-600',
  offer:     'text-green-600',
  withdrawn: 'text-gray-400',
  rejected:  'text-red-500',
}

interface Props {
  candidateId: number
}

const PAGE_SIZE = 20

export default function ScoredJobsTable({ candidateId }: Props) {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<ScoreFilters>({ sort: 'score:desc', limit: PAGE_SIZE })
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showAppliedOnly, setShowAppliedOnly] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['scores', candidateId, filters],
    queryFn: () => listScoredJobsForCandidate(candidateId, filters),
    enabled: candidateId > 0,
  })

  const { data: applications } = useQuery({
    queryKey: ['applications', candidateId],
    queryFn: () => getApplicationsForCandidate(candidateId),
  })

  const { data: statusList } = useQuery({
    queryKey: ['application-statuses'],
    queryFn: getApplicationStatuses,
    staleTime: Infinity,
  })
  const statuses = statusList?.items ?? []

  const applyMutation = useMutation({
    mutationFn: (jobId: number) => createApplication(candidateId, jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications', candidateId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (applicationId: string) => deleteApplication(candidateId, applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications', candidateId] }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, statusName }: { applicationId: string; statusName: string }) =>
      updateApplication(candidateId, applicationId, { statusName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications', candidateId] }),
  })

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getApplication(jobId: number) {
    return applications?.items.find(a => a.jobDescriptionId === jobId)
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1
  const currentPage = filters.page ?? 1

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search title…"
          value={filters.search ?? ''}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined, page: 1 }))}
          className="w-48"
        />

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Min score</label>
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={filters.minScore ?? ''}
            onChange={e => setFilters(f => ({ ...f, minScore: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
            className="w-20"
          />
        </div>

        <Select
          value={filters.locationMatch === undefined ? 'all' : String(filters.locationMatch)}
          onValueChange={v => setFilters(f => ({
            ...f,
            locationMatch: v === 'all' ? undefined : v === 'true',
            page: 1,
          }))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Location match" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            <SelectItem value="true">Location match</SelectItem>
            <SelectItem value="false">Location mismatch</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sort ?? 'score:desc'}
          onValueChange={v => setFilters(f => ({ ...f, sort: v as ScoreFilters['sort'], page: 1 }))}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score:desc">Score: high → low</SelectItem>
            <SelectItem value="score:asc">Score: low → high</SelectItem>
            <SelectItem value="publishedAt:desc">Newest first</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setShowAppliedOnly(v => !v)}
          className={cn(
            'flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors',
            showAppliedOnly
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400',
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Applied only
        </button>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Scored from</label>
          <Input
            type="date"
            value={filters.scoredFrom ?? ''}
            onChange={e => setFilters(f => ({ ...f, scoredFrom: e.target.value || undefined, page: 1 }))}
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">to</label>
          <Input
            type="date"
            value={filters.scoredTo ?? ''}
            onChange={e => setFilters(f => ({ ...f, scoredTo: e.target.value || undefined, page: 1 }))}
            className="w-40"
          />
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-gray-400">Loading scores…</div>}
      {isError && (
        <div className="text-center py-8 text-red-500 text-sm">
          Failed to load scored jobs.{error instanceof Error ? ` ${error.message}` : ''}
        </div>
      )}

      {data && (
        <div className="text-sm text-gray-500 mb-1">
          {data.total} scored job{data.total !== 1 ? 's' : ''}
        </div>
      )}

      <div className="space-y-2">
        {data?.items
          .filter(item => item.job != null)
          .filter(item => !showAppliedOnly || getApplication(item.job!.jobDescriptionId) != null)
          .map(item => {
          const job = item.job!
          const isOpen = expanded.has(item.jobMatchScoreId)
          const application = getApplication(job.jobDescriptionId)

          return (
            <div key={item.jobMatchScoreId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(item.jobMatchScoreId)}
              >
                {/* Expand toggle */}
                <span className="text-gray-400 shrink-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>

                {/* Score */}
                <ScoreBadge score={item.score} />

                {/* Job info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{job.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1 capitalize">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {job.company.companyName}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1 capitalize">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {job.location.countryName}
                      </span>
                    )}
                    <span>{format(new Date(job.publishedAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {/* Match flags */}
                {item.reasons && (
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <MatchFlag ok={item.reasons.seniorityMatch} label="Seniority" />
                    <MatchFlag ok={item.reasons.locationMatch} label="Location" />
                    <span className="text-xs text-gray-400">
                      {item.reasons.matchedSkills.length} matched
                    </span>
                    {item.reasons.missingSkills.length > 0 && (
                      <span className="text-xs text-red-400">
                        {item.reasons.missingSkills.length} missing
                      </span>
                    )}
                  </div>
                )}

                {/* Status selector + actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 p-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {application ? (
                    <>
                      <Select
                        value={application.status}
                        onValueChange={statusName =>
                          updateStatusMutation.mutate({ applicationId: application.applicationId, statusName })
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            'h-7 text-xs px-2 w-28 border-gray-200 bg-white',
                            STATUS_STYLES[application.status] ?? 'text-gray-700',
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => (
                            <SelectItem key={s.applicationStatusId} value={s.statusName} className="text-xs capitalize">
                              {s.statusName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                        title="Remove application"
                        onClick={() => deleteMutation.mutate(application.applicationId)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-gray-400 hover:text-blue-600"
                      title="Mark as applied"
                      onClick={() => applyMutation.mutate(job.jobDescriptionId)}
                      disabled={applyMutation.isPending}
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && item.reasons && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                  <p className="text-sm text-gray-700 italic">"{item.reasons.summary}"</p>

                  <div className="grid grid-cols-2 gap-4">
                    {item.reasons.matchedSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">
                          Matched skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.reasons.matchedSkills.map(s => (
                            <span key={s} className="text-xs bg-green-100 text-green-800 rounded-full px-2.5 py-0.5 border border-green-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.reasons.missingSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">
                          Missing skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.reasons.missingSkills.map(s => (
                            <span key={s} className="text-xs bg-red-100 text-red-700 rounded-full px-2.5 py-0.5 border border-red-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500">
                    {item.scorer && (
                      <span>Scored by: {item.scorer.provider}/{item.scorer.model}</span>
                    )}
                    <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setFilters(f => ({ ...f, page: currentPage - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setFilters(f => ({ ...f, page: currentPage + 1 }))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const ScoreBadge = memo(function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-100 text-green-800 border-green-200' :
    score >= 50 ? 'bg-amber-100 text-amber-800 border-amber-200' :
    'bg-red-100 text-red-700 border-red-200'

  return (
    <div className={cn('shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border', color)}>
      {score}
    </div>
  )
})

const MatchFlag = memo(function MatchFlag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? 'match' : 'mismatch'}`}
      className={cn('flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 border', ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200')}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  )
})
