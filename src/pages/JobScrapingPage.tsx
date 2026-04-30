import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useJobScrapingRun,
  type FinalStatus,
  type LocationState,
  type RunPhase,
} from '@/hooks/useJobScrapingRun'

type RedirectState = { totalLocations?: number; locations?: string[] } | null

const FINAL_STATUS_VARIANT: Record<FinalStatus, 'success' | 'warning' | 'destructive'> = {
  success: 'success',
  partial: 'warning',
  fail: 'destructive',
}

const FINAL_STATUS_LABEL: Record<FinalStatus, string> = {
  success: 'Completed',
  partial: 'Partial',
  fail: 'Failed',
}

export default function JobScrapingPage() {
  const { runId } = useParams<{ runId: string }>()
  const location = useLocation()
  const [remountKey, setRemountKey] = useState(0)

  if (!runId) {
    return (
      <div className="p-8">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Run not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">No run id was supplied in the URL.</p>
            <Button asChild variant="outline">
              <Link to="/jobs">Back to jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <JobScrapingRunView
      key={remountKey}
      runId={runId}
      initial={(location.state as RedirectState) ?? undefined}
      onRetry={() => setRemountKey(k => k + 1)}
    />
  )
}

export function JobScrapingRunView({
  runId,
  initial,
  onRetry,
  className,
}: {
  runId: string
  initial?: { totalLocations?: number; locations?: string[] }
  onRetry: () => void
  className?: string
}) {
  const run = useJobScrapingRun(runId, initial)

  if (run.phase === 'missing') {
    return (
      <div className="p-8">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Run state unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This run has expired or never existed. Start a new scrape from the Jobs page.
            </p>
            <Button asChild>
              <Link to="/jobs">Back to jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (run.phase === 'connection-error') {
    return (
      <div className="p-8">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Connection error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              {run.connectionError ?? 'Lost connection to the live progress stream.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
              <Button asChild variant="outline">
                <Link to="/jobs">Back to jobs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const locationEntries = Object.entries(run.locations)
  const progress = run.totalLocations > 0
    ? Math.min(100, Math.round((run.completedLocations / run.totalLocations) * 100))
    : 0

  return (
    <div className={cn('p-8 space-y-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Scraping run</h1>
          <p className="mt-1 text-xs font-mono text-gray-500 break-all">{run.runId}</p>
        </div>
        <PhaseBadge phase={run.phase} finalStatus={run.finalStatus} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>
                {run.completedLocations} of {run.totalLocations || '?'} locations
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  run.phase === 'finished' && run.finalStatus === 'fail' ? 'bg-red-500' :
                  run.phase === 'finished' && run.finalStatus === 'partial' ? 'bg-yellow-500' :
                  'bg-blue-600',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Completed" value={run.completedLocations} />
            <Stat label="Successful" value={run.successfulLocations} accent="success" />
            <Stat label="Failed" value={run.failedLocations} accent={run.failedLocations > 0 ? 'destructive' : undefined} />
            <Stat label="Jobs found" value={run.totalFoundJobs} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Locations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {locationEntries.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">Waiting for locations…</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {locationEntries.map(([name, state]) => (
                <LocationRow key={name} name={name} state={state} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {run.phase === 'finished' && (
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/jobs">View jobs</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/jobs">Run again</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function PhaseBadge({ phase, finalStatus }: { phase: RunPhase; finalStatus?: FinalStatus }) {
  if (phase === 'finished' && finalStatus) {
    return <Badge variant={FINAL_STATUS_VARIANT[finalStatus]}>{FINAL_STATUS_LABEL[finalStatus]}</Badge>
  }
  if (phase === 'running') {
    return (
      <Badge variant="default" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    )
  }
  return <Badge variant="secondary">Loading</Badge>
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'success' | 'destructive'
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-2xl font-semibold',
          accent === 'success' && 'text-green-700',
          accent === 'destructive' && 'text-red-700',
          !accent && 'text-gray-900',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function LocationRow({ name, state }: { name: string; state: LocationState }) {
  return (
    <li className="flex items-center justify-between gap-3 px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <StatusIcon status={state.status} />
        <span className="truncate text-sm text-gray-900">{name}</span>
      </div>
      <div className="flex-shrink-0 text-right text-sm">
        {state.status === 'completed' && (
          <span className="text-green-700">{state.foundJobs ?? 0} jobs</span>
        )}
        {state.status === 'failed' && state.error && (
          <span className="text-red-700 line-clamp-1 max-w-xs" title={state.error}>
            {state.error}
          </span>
        )}
        {state.status === 'pending' && <span className="text-gray-400">Pending</span>}
      </div>
    </li>
  )
}

function StatusIcon({ status }: { status: LocationState['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
  if (status === 'failed') return <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
  return <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-500" />
}
