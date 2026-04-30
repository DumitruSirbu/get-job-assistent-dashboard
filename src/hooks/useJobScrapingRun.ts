import { useEffect, useMemo, useReducer } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import {
  JOB_SCRAPING_NAMESPACE,
  JobScrapingClientEvent,
  JobScrapingServerEvent,
} from '@dumitru_sirbu92/get-job-assistant-sdk'
import type {
  IJobScrapingStartedPayload,
  IJobScrapingLocationCompletedPayload,
  IJobScrapingLocationFailedPayload,
  IJobScrapingFinishedPayload,
  IJobScrapingSnapshotPayload,
} from '@dumitru_sirbu92/get-job-assistant-sdk'
import { BASE_URL } from '@/lib/api/client'
import { getJobScrapingRun } from '@/lib/api/jobs'
import type { JobScrapingRunSnapshot } from '@/lib/schemas'


export type RunPhase = 'loading' | 'running' | 'finished' | 'missing' | 'connection-error'
export type LocationStatus = 'pending' | 'completed' | 'failed'
export type LocationState = { status: LocationStatus; foundJobs?: number; error?: string }
export type FinalStatus = 'success' | 'fail' | 'partial'

type InternalState = {
  phase: RunPhase
  runId: string
  totalLocations: number
  snapshotSuccessful: number
  snapshotFailed: number
  snapshotTotalFoundJobs: number
  locations: Record<string, LocationState>
  finalStatus?: FinalStatus
  startedAt?: string
  finishedAt?: string
  connectionError?: string
}

type Action =
  | { type: 'seed'; locations: string[]; totalLocations: number }
  | { type: 'hydrate-snapshot'; payload: JobScrapingRunSnapshot }
  | { type: 'started'; payload: IJobScrapingStartedPayload }
  | { type: 'location-completed'; payload: IJobScrapingLocationCompletedPayload }
  | { type: 'location-failed'; payload: IJobScrapingLocationFailedPayload }
  | { type: 'finished'; payload: IJobScrapingFinishedPayload }
  | { type: 'missing' }
  | { type: 'connection-error'; message: string }

function seedLocations(names: string[]): Record<string, LocationState> {
  return Object.fromEntries(names.map(n => [n, { status: 'pending' as const }]))
}

function hydrateLocations(
  names: string[],
  states?: Record<string, { status: LocationStatus; foundJobs?: number; error?: string }>,
): Record<string, LocationState> {
  const seeded = seedLocations(names)
  if (!states) return seeded
  for (const [name, ls] of Object.entries(states)) {
    if (ls.status !== 'pending') {
      seeded[name] = { status: ls.status, foundJobs: ls.foundJobs, error: ls.error }
    }
  }
  return seeded
}

function mergePreservingTerminal(
  incoming: Record<string, LocationState>,
  existing: Record<string, LocationState>,
): Record<string, LocationState> {
  const merged = { ...incoming }
  for (const [name, state] of Object.entries(existing)) {
    if (state.status !== 'pending') merged[name] = state
  }
  return merged
}

function init(runId: string): InternalState {
  return {
    phase: 'loading',
    runId,
    totalLocations: 0,
    snapshotSuccessful: 0,
    snapshotFailed: 0,
    snapshotTotalFoundJobs: 0,
    locations: {},
  }
}

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'seed': {
      const seeded = seedLocations(action.locations)
      return {
        ...state,
        totalLocations: state.totalLocations || action.totalLocations,
        locations: mergePreservingTerminal(seeded, state.locations),
      }
    }
    case 'hydrate-snapshot': {
      const s = action.payload
      const finalStatus: FinalStatus | undefined = s.status === 'running' ? undefined : s.status as FinalStatus
      return {
        ...state,
        phase: s.status === 'running' ? 'running' : 'finished',
        totalLocations: s.totalLocations,
        snapshotSuccessful: Math.max(state.snapshotSuccessful, s.completedLocations),
        snapshotFailed: Math.max(state.snapshotFailed, s.failedLocations),
        snapshotTotalFoundJobs: Math.max(state.snapshotTotalFoundJobs, s.totalFoundJobs),
        locations: mergePreservingTerminal(hydrateLocations(s.locations, s.locationStates), state.locations),
        finalStatus: finalStatus ?? state.finalStatus,
        startedAt: state.startedAt ?? s.startedAt,
        finishedAt: state.finishedAt ?? s.finishedAt,
      }
    }
    case 'started': {
      const p = action.payload
      return {
        ...state,
        phase: 'running',
        totalLocations: p.totalLocations,
        locations: mergePreservingTerminal(seedLocations(p.locations), state.locations),
        startedAt: state.startedAt ?? new Date().toISOString(),
      }
    }
    case 'location-completed': {
      const p = action.payload
      return {
        ...state,
        phase: state.phase === 'finished' ? state.phase : 'running',
        totalLocations: p.totalLocations || state.totalLocations,
        locations: { ...state.locations, [p.location]: { status: 'completed', foundJobs: p.foundJobs } },
      }
    }
    case 'location-failed': {
      const p = action.payload
      return {
        ...state,
        phase: state.phase === 'finished' ? state.phase : 'running',
        totalLocations: p.totalLocations || state.totalLocations,
        locations: { ...state.locations, [p.location]: { status: 'failed', error: p.error } },
      }
    }
    case 'finished': {
      const p = action.payload
      return {
        ...state,
        phase: 'finished',
        totalLocations: p.totalLocations,
        snapshotSuccessful: Math.max(state.snapshotSuccessful, p.successfulLocations),
        snapshotFailed: Math.max(state.snapshotFailed, p.failedLocations),
        snapshotTotalFoundJobs: Math.max(state.snapshotTotalFoundJobs, p.totalFoundJobs),
        finalStatus: p.status as FinalStatus,
        finishedAt: state.finishedAt ?? new Date().toISOString(),
      }
    }
    case 'missing':
      return state.phase === 'loading' ? { ...state, phase: 'missing' } : state
    case 'connection-error':
      return { ...state, phase: 'connection-error', connectionError: action.message }
    default:
      return state
  }
}

export type JobScrapingRunView = {
  phase: RunPhase
  runId: string
  totalLocations: number
  completedLocations: number
  successfulLocations: number
  failedLocations: number
  totalFoundJobs: number
  locations: Record<string, LocationState>
  finalStatus?: FinalStatus
  startedAt?: string
  finishedAt?: string
  connectionError?: string
}

export function useJobScrapingRun(
  runId: string,
  initial?: { totalLocations?: number; locations?: string[] },
): JobScrapingRunView {
  const [state, dispatch] = useReducer(reducer, runId, init)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initial?.locations && initial.locations.length > 0) {
      dispatch({
        type: 'seed',
        locations: initial.locations,
        totalLocations: initial.totalLocations ?? initial.locations.length,
      })
    }
    // intentionally run only once on mount — later renders pass a stale `initial`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const snapshotQuery = useQuery({
    queryKey: ['job-scraping-run', runId],
    queryFn: () => getJobScrapingRun(runId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (snapshotQuery.data) {
      dispatch({ type: 'hydrate-snapshot', payload: snapshotQuery.data })
    }
  }, [snapshotQuery.data])

  useEffect(() => {
    if (!snapshotQuery.error) return
    const msg = snapshotQuery.error instanceof Error ? snapshotQuery.error.message : String(snapshotQuery.error)
    if (msg.includes('API error 404')) {
      dispatch({ type: 'missing' })
    }
  }, [snapshotQuery.error])

  useEffect(() => {
    const socket: Socket = io(`${BASE_URL}${JOB_SCRAPING_NAMESPACE}`, {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      socket.emit(JobScrapingClientEvent.SUBSCRIBE, { runId }, (ack?: { ok: boolean }) => {
        if (!ack?.ok) {
          dispatch({ type: 'connection-error', message: 'Subscription rejected by server' })
        }
      })
    })

    socket.on('connect_error', (err: Error) => {
      dispatch({ type: 'connection-error', message: err.message || 'WebSocket connection error' })
    })

    socket.on(JobScrapingServerEvent.STARTED, (payload: IJobScrapingStartedPayload) => {
      dispatch({ type: 'started', payload })
    })
    socket.on(JobScrapingServerEvent.LOCATION_COMPLETED, (payload: IJobScrapingLocationCompletedPayload) => {
      dispatch({ type: 'location-completed', payload })
    })
    socket.on(JobScrapingServerEvent.LOCATION_FAILED, (payload: IJobScrapingLocationFailedPayload) => {
      dispatch({ type: 'location-failed', payload })
    })
    socket.on(JobScrapingServerEvent.FINISHED, (payload: IJobScrapingFinishedPayload) => {
      dispatch({ type: 'finished', payload })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    })
    socket.on(JobScrapingServerEvent.SNAPSHOT, (payload: IJobScrapingSnapshotPayload) => {
      dispatch({ type: 'hydrate-snapshot', payload: payload as unknown as JobScrapingRunSnapshot })
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [runId, queryClient])

  return useMemo<JobScrapingRunView>(() => {
    const values = Object.values(state.locations)
    const liveSuccessful = values.filter(l => l.status === 'completed').length
    const liveFailed = values.filter(l => l.status === 'failed').length
    const liveFound = values.reduce((sum, l) => sum + (l.foundJobs ?? 0), 0)
    const successfulLocations = Math.max(liveSuccessful, state.snapshotSuccessful)
    const failedLocations = Math.max(liveFailed, state.snapshotFailed)
    const totalFoundJobs = Math.max(liveFound, state.snapshotTotalFoundJobs)
    return {
      phase: state.phase,
      runId: state.runId,
      totalLocations: state.totalLocations,
      completedLocations: successfulLocations + failedLocations,
      successfulLocations,
      failedLocations,
      totalFoundJobs,
      locations: state.locations,
      finalStatus: state.finalStatus,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      connectionError: state.connectionError,
    }
  }, [state])
}
