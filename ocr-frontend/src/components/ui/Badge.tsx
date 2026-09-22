interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'primary'
  className?: string
  dot?: boolean
}

const variants = {
  default: 'bg-surface border border-border text-muted',
  primary: 'bg-primary/10 border border-primary/20 text-primary',
  success: 'bg-success/10 border border-success/25 text-emerald-700',
  warning: 'bg-warning/10 border border-warning/25 text-amber-700',
  danger:  'bg-danger/10 border border-danger/25 text-red-700',
  accent:  'bg-accent/10 border border-accent/25 text-emerald-700',
}

const dotColors = {
  default: 'bg-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  accent:  'bg-accent',
}

export function Badge({ children, variant = 'default', dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ${variants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

