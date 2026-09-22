interface CardProps {
  children: React.ReactNode
  className?: string
  lift?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = { none: 'p-0', sm: 'p-4', md: 'p-6', lg: 'p-8' }

export function Card({ children, className = '', lift = false, padding = 'md' }: CardProps) {
  return (
    <div className={[
      'glass-card rounded-2xl border border-border/80',
      paddings[padding],
      lift ? 'card-lift' : '',
      className,
    ].join(' ')}>
      {children}
    </div>
  )
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-text tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-border/80 ${className}`} />
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-4xl sm:text-5xl mb-3 opacity-30">{icon}</div>}
      <h3 className="text-base sm:text-lg font-heading font-bold text-text">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

