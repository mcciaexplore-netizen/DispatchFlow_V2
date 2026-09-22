import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  ocrFilled?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, ocrFilled, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-muted font-body">
            {label}
            {rest.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-text font-body text-sm',
            'border-border/90 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg',
            'min-h-[42px] transition-all duration-150',
            'placeholder:text-muted/50 shadow-2xs',
            ocrFilled ? 'ocr-filled border-l-[4px] border-l-accent ring-2 ring-accent/20' : '',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-danger font-medium mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  ocrFilled?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, ocrFilled, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-muted font-body">
            {label}
            {rest.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={[
            'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-text font-body text-sm resize-y',
            'border-border/90 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 transition-all duration-150 shadow-2xs',
            ocrFilled ? 'ocr-filled border-l-[4px] border-l-accent ring-2 ring-accent/20' : '',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-danger font-medium mt-0.5">{error}</p>}
      </div>
    )
  }
)
TextArea.displayName = 'TextArea'

