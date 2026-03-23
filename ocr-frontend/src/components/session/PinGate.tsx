import { useState } from 'react'
import { verifyPin } from '../../lib/pinAuth'
import { useSessionStore } from '../../store/sessionStore'
import { Button } from '../ui/Button'

interface Props {
  onSuccess: () => void
  onCancel?: () => void
  title?: string
}

export function PinGate({ onSuccess, onCancel, title = 'Admin access required' }: Props) {
  const setAdminUnlocked = useSessionStore(s => s.setAdminUnlocked)
  const [pin, setPin]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return }
    setLoading(true)
    setError('')
    const ok = await verifyPin(pin)
    setLoading(false)
    if (ok) {
      setAdminUnlocked(true)
      onSuccess()
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(28,26,23,0.6)' }}>
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-xs p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-heading text-text">{title}</h2>
        </div>

        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoFocus
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text font-mono text-xl text-center tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 min-h-touch"
          placeholder="• • • •"
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
        />

        {error && <p className="text-xs text-danger mt-2 text-center">{error}</p>}

        <div className="flex gap-2 mt-4">
          {onCancel && (
            <Button variant="ghost" size="md" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button variant="primary" size="md" className="flex-1" onClick={handleVerify} loading={loading} disabled={!pin}>
            Unlock
          </Button>
        </div>
      </div>
    </div>
  )
}
