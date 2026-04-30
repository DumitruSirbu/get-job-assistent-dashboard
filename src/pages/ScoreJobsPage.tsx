import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, Info } from 'lucide-react'
import { listCandidates } from '@/lib/api/candidates'
import { startJobScoring } from '@/lib/api/scores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function ScoreJobsPage() {
  const navigate = useNavigate()
  const [candidateId, setCandidateId] = useState<number | null>(null)
  const [titleKeyword, setTitleKeyword] = useState('')
  const [limit, setLimit] = useState('')
  const [publishedFrom, setPublishedFrom] = useState('')
  const [publishedTo, setPublishedTo] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [noNewJobs, setNoNewJobs] = useState(false)

  const candidatesQuery = useQuery({
    queryKey: ['candidates-list'],
    queryFn: () => listCandidates(1, 100),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const payload: {
        titleKeyword?: string
        limit?: number
        publishedFrom?: string
        publishedTo?: string
      } = {}

      const trimmedKeyword = titleKeyword.trim()
      if (trimmedKeyword) payload.titleKeyword = trimmedKeyword
      if (limit) payload.limit = Number(limit)
      if (publishedFrom) payload.publishedFrom = publishedFrom
      if (publishedTo) payload.publishedTo = publishedTo

      return startJobScoring(candidateId!, payload)
    },
    onSuccess: data => {
      if (data.runId === '') {
        setNoNewJobs(true)
      } else {
        navigate(`/candidates/scoring/${data.runId}`, { state: { candidateId } })
      }
    },
    onMutate: () => {
      setNoNewJobs(false)
      setDateError(null)
    },
  })

  const canSubmit = candidateId !== null && !mutation.isPending
  const mutationErrorMessage = mutation.error instanceof Error ? mutation.error.message : 'Something went wrong.'
  const serverDateError = mutationErrorMessage.toLowerCase().includes('publishedfrom')
    && mutationErrorMessage.toLowerCase().includes('must not be after')

  function handleSubmit() {
    setDateError(null)
    if (publishedFrom && publishedTo && publishedFrom > publishedTo) {
      setDateError('Published from must be earlier than or equal to Published to.')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        <Link
          to="/candidates"
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          )}
        >
          Candidates
        </Link>
        <span
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px',
            'border-blue-600 text-blue-600',
          )}
        >
          Score Jobs
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Score Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">Score unscored jobs for a candidate using AI.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Start Scoring Run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Candidate</label>
            <Select
              value={candidateId != null ? String(candidateId) : ''}
              onValueChange={v => setCandidateId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={candidatesQuery.isLoading ? 'Loading…' : 'Select a candidate'} />
              </SelectTrigger>
              <SelectContent>
                {candidatesQuery.data?.items.map(c => (
                  <SelectItem key={c.candidateProfileId} value={String(c.candidateProfileId)}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Title keyword <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. React Developer"
              value={titleKeyword}
              onChange={e => setTitleKeyword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Limit <span className="font-normal text-gray-400">(optional, default 300, max 1000)</span>
            </label>
            <Input
              type="number"
              placeholder="300"
              min={1}
              max={1000}
              value={limit}
              onChange={e => setLimit(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Published from <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <Input
                type="date"
                value={publishedFrom}
                onChange={e => setPublishedFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Published to <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <Input
                type="date"
                value={publishedTo}
                onChange={e => setPublishedTo(e.target.value)}
              />
            </div>
          </div>

          {(dateError || (mutation.isError && serverDateError)) && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {dateError ?? mutationErrorMessage}
            </div>
          )}

          {noNewJobs && (
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <Info className="h-4 w-4 shrink-0" />
              No new jobs to score for this candidate.
            </div>
          )}

          {mutation.isError && !serverDateError && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {mutationErrorMessage}
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {mutation.isPending ? 'Starting…' : 'Start Scoring'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
