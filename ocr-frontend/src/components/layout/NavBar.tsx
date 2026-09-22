import { NavLink } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import { SyncIndicator } from '../ui/SyncIndicator'
import { getCompany } from '../../lib/config'
import { LS } from '../../constants/storage'

const navItems = [
  { to: '/',                  label: 'Dashboard' },
  { to: '/create',            label: 'New Dispatch' },
  { to: '/history',           label: 'Dispatch History' },
  { to: '/invoices',          label: 'New Invoice' },
  { to: '/invoices/history',  label: 'Invoice History' },
  { to: '/refdocs',           label: 'Reference Doc' },
]

export function NavBar() {
  const { currentOperator } = useSessionStore()
  const company    = getCompany()

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between h-14">
          {/* Logo/name */}
          <NavLink to="/" className="flex items-center gap-3 no-underline group">
            {company.logoBase64 ? (
              <img src={company.logoBase64} alt="Company Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
            ) : (
              <img src="/mccia-logo.svg" alt="MCCIA Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
            )}
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-base text-primary leading-tight tracking-tight">
                {company.name || 'MCCIA DispatchFlow'}
              </span>
              <span className="text-[10px] text-muted font-semibold tracking-wide">
                MSME Smart OCR Hub
              </span>
            </div>
          </NavLink>

          {/* Right side */}
          <div className="flex items-center gap-2.5">
            <SyncIndicator />

            {/* Demo badge & quick loader */}
            <button
              onClick={async () => {
                const { populateDemoData } = await import('../../lib/demoData')
                await populateDemoData()
                window.location.reload()
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 rounded-full text-xs font-bold transition-all shadow-2xs"
              title="Load sample MCCIA dispatches & invoices"
            >
              <span>⚡</span> Load Demo Data
            </button>

            {/* Operator session */}
            {currentOperator && (
              <div className="flex items-center gap-1.5 text-xs text-muted bg-bg px-2.5 py-1 rounded-full border border-border">
                <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-bold">
                  {currentOperator[0]?.toUpperCase()}
                </span>
                <span className="hidden sm:inline font-medium text-text">{currentOperator}</span>
              </div>
            )}

            {/* Switch operator */}
            <button
              onClick={() => {
                localStorage.removeItem(LS.LAST_OPERATOR_SESSION)
                window.location.reload()
              }}
              className="text-xs text-muted hover:text-text px-2 py-1 rounded border border-transparent hover:border-border transition-all min-h-touch flex items-center"
              title="Switch operator"
            >
              ⇄ Switch
            </button>

            {/* Settings */}
            <NavLink to="/settings" className={({ isActive }) =>
              `text-xs px-2.5 py-1 rounded-md transition-all min-h-touch flex items-center gap-1 ${
                isActive
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-muted hover:text-text hover:bg-bg'
              }`
            }>
              ⚙ Settings
            </NavLink>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex gap-1 overflow-x-auto -mb-px pt-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'px-3.5 py-2 text-sm font-body font-medium whitespace-nowrap border-b-2 transition-all',
                isActive
                  ? 'border-primary text-primary font-bold bg-primary/5 rounded-t-md'
                  : 'border-transparent text-muted hover:text-text hover:border-border/80',
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
