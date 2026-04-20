import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const settingsNav = [
  { to: '/settings/regions', label: 'Regions' },
]

export default function SettingsLayout() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="flex gap-1 border-b border-gray-200 pb-0 mb-6">
        {settingsNav.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
