interface CardProps {
  children: React.ReactNode
  className?: string
  lift?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-6' }

export function Card({ children, className = '', lift = false, padding = 'md' }: CardProps) {
  return (
    <div className={[
      'bg-surface border border-border rounded-lg',
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
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-xl font-heading text-text">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-border ${className}`} />
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-4xl mb-3 opacity-40">{icon}</div>}
      <h3 className="text-lg font-heading text-muted">{title}</h3>
      {description && <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
