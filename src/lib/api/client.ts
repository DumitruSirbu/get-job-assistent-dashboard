import { z } from 'zod'
import { tokenStore } from '@/lib/auth/tokenStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

let _onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${BASE_URL}/user/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json() as { accessToken: string }
    tokenStore.setAccess(data.accessToken)
    return true
  } catch {
    return false
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  schema: z.ZodType<T>,
  retry = true,
): Promise<T> {
  const accessToken = tokenStore.getAccess()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401 && retry) {
    const ok = await refreshTokens()
    if (ok) return request(path, options, schema, false)
    tokenStore.clear()
    _onUnauthorized?.()
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${body}`)
  }

  if (res.status === 204) return undefined as T

  const json = await res.json()
  const result = schema.safeParse(json)
  if (!result.success) {
    console.error(
      '[API] Schema parse error for', path,
      result.error.issues.map(i => `${i.path.join('.')} — ${i.message}`),
    )
    throw new Error(`Schema validation failed for ${path}: ${result.error.message}`)
  }
  return result.data
}

export const apiClient = {
  get: <T>(path: string, schema: z.ZodType<T>) =>
    request(path, { method: 'GET' }, schema),

  post: <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }, schema),

  patch: <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }, schema),

  delete: (path: string) =>
    request(path, { method: 'DELETE' }, z.void()),
}
