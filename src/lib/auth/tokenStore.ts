// Access token is kept only in memory (cleared on page close).
// Refresh token is kept in sessionStorage (survives reloads within the tab).

const REFRESH_KEY = 'gja_refresh_token'

let _accessToken: string | null = null

export const tokenStore = {
  getAccess: () => _accessToken,
  setAccess: (token: string) => { _accessToken = token },
  clearAccess: () => { _accessToken = null },

  getRefresh: () => sessionStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string) => sessionStorage.setItem(REFRESH_KEY, token),
  clearRefresh: () => sessionStorage.removeItem(REFRESH_KEY),

  setTokens: (accessToken: string, refreshToken: string) => {
    _accessToken = accessToken
    sessionStorage.setItem(REFRESH_KEY, refreshToken)
  },

  clear: () => {
    _accessToken = null
    sessionStorage.removeItem(REFRESH_KEY)
  },

  isAuthenticated: () => _accessToken !== null || sessionStorage.getItem(REFRESH_KEY) !== null,
}
