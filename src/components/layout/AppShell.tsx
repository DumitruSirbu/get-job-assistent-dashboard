import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Briefcase, Users, Building2, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/api/auth'
import { tokenStore } from '@/lib/auth/tokenStore'
import { useEffect, useState } from 'react'
import { refreshTokens } from '@/lib/api/client'

const navItems = [
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AppShell() {
  const navigate = useNavigate()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    async function init() {
      if (!tokenStore.getAccess() && tokenStore.getRefresh()) {
        await refreshTokens()
      }

      if (!tokenStore.isAuthenticated()) {
        navigate('/login', { replace: true })
      }

      setAuthReady(true)
    }
    
    init()
  }, [navigate])

  if (!authReady) return null

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-slate-900 text-slate-100 shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 shrink-0">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm leading-tight">Job Assistant</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
