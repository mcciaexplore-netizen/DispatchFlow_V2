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
      <div className="flex flex-col gap-0.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted font-body">
            {label}
            {rest.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded border bg-surface px-3 py-2 text-text font-body text-base',
            'border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[44px] transition-colors duration-80',
            'placeholder:text-border',
            ocrFilled ? 'ocr-filled border-l-[3px] border-l-accent' : '',
            error ? 'border-danger focus:border-danger focus:ring-danger/30' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
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
      <div className="flex flex-col gap-0.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted font-body">
            {label}
            {rest.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={[
            'w-full rounded border bg-surface px-3 py-2 text-text font-body text-base resize-y',
            'border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            'disabled:opacity-50 transition-colors duration-80',
            ocrFilled ? 'ocr-filled border-l-[3px] border-l-accent' : '',
            error ? 'border-danger' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
      </div>
    )
  }
)
TextArea.displayName = 'TextArea'
