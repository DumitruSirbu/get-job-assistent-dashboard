import { useEffect, useMemo, useReducer } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import {
  JOB_SCORING_NAMESPACE,
  JobScoringClientEvent,
  JobScoringRunStatusEnum,
  JobScoringServerEvent,
} from '@dumitru_sirbu92/get-job-assistant-sdk'
import type {
  IJobScoringStartedPayload,
  IJobScoringItemCompletedPayload,
  IJobScoringItemFailedPayload,
  IJobScoringFinishedPayload,
  IJobScoringSnapshotPayload,
} from '@dumitru_sirbu92/get-job-assistant-sdk'
import { BASE_URL } from '@/lib/api/client'
import { getJobScoringRunSnapshot } from '@/lib/api/scores'

export type RunPhase = 'loading' | 'running' | 'finished' | 'missing' | 'connection-error'
export type ScoringItemStatus = 'pending' | 'completed' | 'failed'
export type ScoringItem = { jobDescriptionId: number; status: ScoringItemStatus; score?: number; error?: string }
export type FinalStatus = Exclude<JobScoringRunStatusEnum, JobScoringRunStatusEnum.RUNNING>

type InternalState = {
  phase: RunPhase
  runId: string
  totalJobs: number
  snapshotCompletedItems: number
  snapshotFailedItems: number
  items: ScoringItem[]
  finalStatus?: FinalStatus
  startedAt?: string
  finishedAt?: string
  connectionError?: string
}

type Action =
  | { type: 'hydrate-snapshot'; payload: IJobScoringSnapshotPayload }
  | { type: 'started'; payload: IJobScoringStartedPayload }
  | { type: 'item-completed'; payload: IJobScoringItemCompletedPayload }
  | { type: 'item-failed'; payload: IJobScoringItemFailedPayload }
  | { type: 'finished'; payload: IJobScoringFinishedPayload }
  | { type: 'missing' }
  | { type: 'connection-error'; message: string }

function upsertItem(items: ScoringItem[], next: ScoringItem): ScoringItem[] {
  const idx = items.findIndex(i => i.jobDescriptionId === next.jobDescriptionId)
  return idx >= 0 ? items.map((item, i) => (i === idx ? next : item)) : [...items, next]
}

function init(runId: string): InternalState {
  return {
    phase: 'loading',
    runId,
    totalJobs: 0,
    snapshotCompletedItems: 0,
    snapshotFailedItems: 0,
    items: [],
  }
}

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'hydrate-snapshot': {
      const s = action.payload
      const isFinal = s.status !== JobScoringRunStatusEnum.RUNNING
      let items = state.items
      for (const snapshotItem of s.items) {
        items = upsertItem(items, {
          jobDescriptionId: snapshotItem.jobDescriptionId,
          status: snapshotItem.status as ScoringItemStatus,
          score: snapshotItem.score,
          error: snapshotItem.error,
        })
      }
      return {
        ...state,
        phase: isFinal ? 'finished' : 'running',
        totalJobs: s.totalJobs,
        snapshotCompletedItems: Math.max(state.snapshotCompletedItems, s.completedItems),
        snapshotFailedItems: Math.max(state.snapshotFailedItems, s.failedItems),
        items,
        finalStatus: isFinal ? (s.status as FinalStatus) : state.finalStatus,
        startedAt: state.startedAt ?? s.startedAt,
        finishedAt: state.finishedAt ?? s.finishedAt,
      }
    }
    case 'started':
      return {
        ...state,
        phase: 'running',
        totalJobs: action.payload.totalJobs,
        startedAt: state.startedAt ?? new Date().toISOString(),
      }
    case 'item-completed': {
      const p = action.payload
      return {
        ...state,
        phase: state.phase === 'finished' ? state.phase : 'running',
        totalJobs: p.totalJobs || state.totalJobs,
        items: upsertItem(state.items, { jobDescriptionId: p.jobDescriptionId, status: 'completed', score: p.score }),
      }
    }
    case 'item-failed': {
      const p = action.payload
      return {
        ...state,
        phase: state.phase === 'finished' ? state.phase : 'running',
        totalJobs: p.totalJobs || state.totalJobs,
        items: upsertItem(state.items, { jobDescriptionId: p.jobDescriptionId, status: 'failed', error: p.error }),
      }
    }
    case 'finished': {
      const p = action.payload
      return {
        ...state,
        phase: 'finished',
        totalJobs: p.totalJobs,
        snapshotCompletedItems: Math.max(state.snapshotCompletedItems, p.completedItems),
        snapshotFailedItems: Math.max(state.snapshotFailedItems, p.failedItems),
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

export type JobScoringRunView = {
  phase: RunPhase
  runId: string
  totalJobs: number
  completedItems: number
  failedItems: number
  items: ScoringItem[]
  finalStatus?: FinalStatus
  startedAt?: string
  finishedAt?: string
  connectionError?: string
}

export function useJobScoringRun(runId: string, candidateId?: number | null): JobScoringRunView {
  const [state, dispatch] = useReducer(reducer, runId, init)
  const queryClient = useQueryClient()

  const snapshotQuery = useQuery({
    queryKey: ['job-scoring-run', runId],
    queryFn: () => getJobScoringRunSnapshot(runId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (snapshotQuery.data) {
      dispatch({ type: 'hydrate-snapshot', payload: snapshotQuery.data as unknown as IJobScoringSnapshotPayload })
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
    const socket: Socket = io(`${BASE_URL}${JOB_SCORING_NAMESPACE}`, {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      socket.emit(JobScoringClientEvent.SUBSCRIBE, { runId }, (ack?: { ok: boolean }) => {
        if (!ack?.ok) {
          dispatch({ type: 'connection-error', message: 'Subscription rejected by server' })
        }
      })
    })

    socket.on('connect_error', (err: Error) => {
      dispatch({ type: 'connection-error', message: err.message || 'WebSocket connection error' })
    })

    socket.on(JobScoringServerEvent.STARTED, (payload: IJobScoringStartedPayload) => {
      dispatch({ type: 'started', payload })
    })
    socket.on(JobScoringServerEvent.ITEM_COMPLETED, (payload: IJobScoringItemCompletedPayload) => {
      dispatch({ type: 'item-completed', payload })
    })
    socket.on(JobScoringServerEvent.ITEM_FAILED, (payload: IJobScoringItemFailedPayload) => {
      dispatch({ type: 'item-failed', payload })
    })
    socket.on(JobScoringServerEvent.FINISHED, (payload: IJobScoringFinishedPayload) => {
      dispatch({ type: 'finished', payload })
      if (candidateId != null) {
        queryClient.invalidateQueries({ queryKey: ['scored-jobs', candidateId] })
      }
    })
    socket.on(JobScoringServerEvent.SNAPSHOT, (payload: IJobScoringSnapshotPayload) => {
      dispatch({ type: 'hydrate-snapshot', payload })
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [runId, candidateId, queryClient])

  return useMemo<JobScoringRunView>(() => {
    const liveCompleted = state.items.filter(i => i.status === 'completed').length
    const liveFailed = state.items.filter(i => i.status === 'failed').length
    return {
      phase: state.phase,
      runId: state.runId,
      totalJobs: state.totalJobs,
      completedItems: Math.max(liveCompleted, state.snapshotCompletedItems),
      failedItems: Math.max(liveFailed, state.snapshotFailedItems),
      items: state.items,
      finalStatus: state.finalStatus,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      connectionError: state.connectionError,
    }
  }, [state])
}
