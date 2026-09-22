import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-hover shadow-xs hover:shadow-md active:scale-[0.98] font-bold border border-primary/20 glow-primary',
  secondary: 'bg-surface border border-border text-text hover:bg-bg hover:border-border-hover active:scale-[0.98] font-semibold shadow-2xs',
  accent:    'bg-accent text-white hover:bg-accent-hover shadow-xs hover:shadow-md active:scale-[0.98] font-bold border border-accent/20 glow-accent',
  ghost:     'bg-transparent text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border active:scale-[0.98] font-semibold',
  danger:    'bg-danger text-white hover:bg-danger/90 shadow-xs hover:shadow-md active:scale-[0.98] font-bold border border-danger/20',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px] rounded-lg',
  md: 'px-4 py-2 text-sm min-h-[42px] rounded-xl',
  lg: 'px-6 py-3 text-base min-h-[50px] rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, children, className = '', ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer',
        'select-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

