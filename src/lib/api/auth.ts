import { apiClient } from './client'
import { TokenResponseSchema } from '@/lib/schemas'
import { tokenStore } from '@/lib/auth/tokenStore'
import { z } from 'zod'

export async function login(email: string, password: string) {
  // Auth endpoints are public — call fetch directly (no auth header needed)
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
  const res = await fetch(`${BASE_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Login failed: ${body}`)
  }
  const data = TokenResponseSchema.parse(await res.json())
  tokenStore.setTokens(data.accessToken, data.refreshToken)
  return data
}

export function logout() {
  tokenStore.clear()
}

export async function register(email: string, firstName: string, lastName: string, password: string) {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
  const res = await fetch(`${BASE_URL}/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, firstName, lastName, password }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Registration failed: ${body}`)
  }
  const data = TokenResponseSchema.parse(await res.json())
  tokenStore.setTokens(data.accessToken, data.refreshToken)
  return data
}

// Dummy schema for void-returning calls
const VoidSchema = z.undefined()
export { VoidSchema, apiClient }
