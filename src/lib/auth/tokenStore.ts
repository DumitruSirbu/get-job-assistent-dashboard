// Access token is kept only in memory (cleared on page close).
// Refresh token is kept in localStorage so it survives new tabs and browser restarts.

const REFRESH_KEY = 'gja_refresh_token'

let _accessToken: string | null = null

export const tokenStore = {
  getAccess: () => _accessToken,
  setAccess: (token: string) => { _accessToken = token },
  clearAccess: () => { _accessToken = null },

  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  clearRefresh: () => localStorage.removeItem(REFRESH_KEY),

  setTokens: (accessToken: string, refreshToken: string) => {
    _accessToken = accessToken
    localStorage.setItem(REFRESH_KEY, refreshToken)
  },

  clear: () => {
    _accessToken = null
    localStorage.removeItem(REFRESH_KEY)
  },

  isAuthenticated: () => _accessToken !== null || localStorage.getItem(REFRESH_KEY) !== null,
}
