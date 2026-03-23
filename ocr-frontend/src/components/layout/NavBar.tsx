import { NavLink } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import { SyncIndicator } from '../ui/SyncIndicator'
import { getCompany } from '../../lib/config'

const navItems = [
  { to: '/',                  label: 'Dashboard' },
  { to: '/create',            label: 'New Dispatch' },
  { to: '/history',           label: 'Dispatch History' },
  { to: '/invoices',          label: 'New Invoice' },
  { to: '/invoices/history',  label: 'Invoice History' },
]

export function NavBar() {
  const { currentOperator } = useSessionStore()
  const company    = getCompany()

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border no-print">
      <div className="max-w-5xl mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between h-12">
          {/* Logo/name */}
          <NavLink to="/" className="flex items-center gap-2 no-underline">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-xs">⚡</span>
            </div>
            <span className="font-heading text-base text-primary tracking-tight">
              {company.name || 'DispatchFlow'}
            </span>
          </NavLink>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <SyncIndicator />

            {/* Operator session */}
            {currentOperator && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-5 h-5 rounded-full bg-border flex items-center justify-center text-[10px] font-mono">
                  {currentOperator[0]?.toUpperCase()}
                </span>
                <span className="hidden sm:inline">{currentOperator}</span>
              </div>
            )}

            {/* Switch operator */}
            <button
              onClick={() => {
                // Force operator modal on next load by clearing today's session
                localStorage.removeItem(LS.LAST_OPERATOR_SESSION)
                window.location.reload()
              }}
              className="text-xs text-muted hover:text-text transition-colors min-h-touch flex items-center px-1"
              title="Switch operator"
            >
              ⇄ Switch
            </button>

            {/* Settings */}
            <NavLink to="/settings" className={({ isActive }) =>
              `text-xs px-2 py-1 rounded transition-colors min-h-touch flex items-center ${isActive ? 'text-accent' : 'text-muted hover:text-text'}`
            }>
              ⚙ Settings
            </NavLink>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex gap-0 overflow-x-auto -mb-px">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'px-3 py-2.5 text-sm font-body whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-text hover:border-border',
              ].join(' ')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
