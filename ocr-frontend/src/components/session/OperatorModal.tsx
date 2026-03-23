import { useState, useEffect } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { Button } from '../ui/Button'


interface Props {
  open: boolean
  onClose: () => void
}

function getPreviousOperators(): string[] {
  try {
    const raw = localStorage.getItem('df_operatorHistory')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveOperatorToHistory(name: string) {
  const history = getPreviousOperators().filter(n => n !== name)
  history.unshift(name)
  localStorage.setItem('df_operatorHistory', JSON.stringify(history.slice(0, 10)))
}

export function OperatorModal({ open, onClose }: Props) {
  const setOperator   = useSessionStore(s => s.setOperator)
  const [name, setName] = useState('')
  const [previous, setPrevious] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setPrevious(getPreviousOperators())
      setName('')
    }
  }, [open])

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    saveOperatorToHistory(trimmed)
    setOperator(trimmed)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(28,26,23,0.6)' }}>
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-xl font-heading text-text mb-1">Who's operating?</h2>
        <p className="text-sm text-muted mb-4">Enter your name or operator code for this session.</p>

        {previous.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {previous.map(p => (
              <button
                key={p}
                onClick={() => setName(p)}
                className={[
                  'px-3 py-1.5 rounded border text-sm font-body transition-colors min-h-touch',
                  name === p
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-bg text-muted hover:border-accent hover:text-text',
                ].join(' ')}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <input
          autoFocus
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text font-body text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 min-h-touch"
          placeholder="Operator name or code"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        />

        <Button variant="primary" size="md" className="w-full mt-4" onClick={handleSubmit} disabled={!name.trim()}>
          Start session
        </Button>
      </div>
    </div>
  )
}
