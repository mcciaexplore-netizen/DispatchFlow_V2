import { NavLink } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import { SyncIndicator } from '../ui/SyncIndicator'
import { getCompany } from '../../lib/config'
import { LS } from '../../constants/storage'

const navItems = [
  { to: '/',                  label: 'Dashboard', icon: '📊' },
  { to: '/create',            label: 'New Dispatch', icon: '⚡' },
  { to: '/history',           label: 'Dispatch History', icon: '📋' },
  { to: '/invoices',          label: 'New Invoice', icon: '🧾' },
  { to: '/invoices/history',  label: 'Invoice History', icon: '📂' },
  { to: '/refdocs',           label: 'Reference Docs', icon: '📖' },
]

export function NavBar() {
  const { currentOperator } = useSessionStore()
  const company = getCompany()


  return (
    <header className="sticky top-0 z-40 glass-nav no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <NavLink to="/" className="flex items-center gap-3.5 no-underline group">
            <div className="relative p-1.5 rounded-xl bg-gradient-to-br from-white to-primary/5 border border-primary/20 shadow-xs group-hover:border-primary/50 group-hover:shadow-md transition-all">
              {company.logoBase64 ? (
                <img src={company.logoBase64} alt="Company Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
              ) : (
                <img src="/mccia-logo.svg" alt="MCCIA Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-base sm:text-lg bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent leading-tight tracking-tight">
                {company.name || 'MCCIA DispatchFlow'}
              </span>
              <span className="text-[10px] text-muted font-bold tracking-wider uppercase flex items-center gap-1">
                <span>Enterprise OCR Hub</span>
                <span className="inline-block w-1 h-1 rounded-full bg-accent animate-pulse" />
              </span>
            </div>
          </NavLink>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncIndicator />

            {/* Demo data quick loader */}
            <button
              onClick={async () => {
                const { populateDemoData } = await import('../../lib/demoData')
                await populateDemoData()
                window.location.reload()
              }}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95"
              title="Load sample MCCIA dispatches & invoices"
            >
              <span className="text-sm">⚡</span> Load Demo Data
            </button>

            {/* Operator session badge */}
            {currentOperator && (
              <div className="flex items-center gap-1.5 text-xs text-muted bg-surface/80 px-2.5 py-1 rounded-xl border border-border shadow-2xs">
                <span className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  {currentOperator[0]?.toUpperCase()}
                </span>
                <span className="hidden lg:inline font-semibold text-text">{currentOperator}</span>
              </div>
            )}

            {/* Switch user */}
            <button
              onClick={() => {
                localStorage.removeItem(LS.LAST_OPERATOR_SESSION)
                window.location.reload()
              }}
              className="text-xs text-muted hover:text-text px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface transition-all min-h-touch flex items-center gap-1"
              title="Switch operator"
            >
              <span>⇄</span>
              <span className="hidden sm:inline">Switch</span>
            </button>

            {/* Settings Link */}
            <NavLink 
              to="/settings" 
              className={({ isActive }) =>
                `text-xs px-3 py-1.5 rounded-xl transition-all min-h-touch flex items-center gap-1.5 font-semibold ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border'
                }`
              }
            >
              <span>⚙</span>
              <span className="hidden sm:inline">Settings</span>
            </NavLink>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-1.5 overflow-x-auto -mb-px pb-1 pt-0.5 scrollbar-none">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'px-3.5 py-2 text-xs sm:text-sm font-body font-semibold whitespace-nowrap rounded-xl transition-all flex items-center gap-1.5',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs font-bold'
                  : 'text-muted hover:text-text hover:bg-surface border border-transparent',
              ].join(' ')}
            >
              <span className="text-xs">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

