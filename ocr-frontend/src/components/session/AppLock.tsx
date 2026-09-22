import { useState } from 'react'
import { verifyPin } from '../../lib/pinAuth'
import { useSessionStore } from '../../store/sessionStore'
import { Button } from '../ui/Button'

export function AppLock() {
  const { setAppLocked, touchActivity } = useSessionStore()
  const [pin, setPin]     = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    setLoading(true)
    setError('')
    const ok = await verifyPin(pin)
    setLoading(false)
    if (ok) {
      touchActivity()
      setAppLocked(false)
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4 w-full max-w-xs px-6">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading text-text">Session locked</h1>
        <p className="text-sm text-muted text-center">Inactive for too long. Enter PIN to resume.</p>

        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoFocus
          className="w-full rounded border border-border bg-surface px-3 py-3 text-text font-mono text-2xl text-center tracking-widest focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 min-h-touch mt-2"
          placeholder="• • • •"
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleUnlock() }}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button variant="primary" size="lg" className="w-full" onClick={handleUnlock} loading={loading} disabled={!pin}>
          Unlock
        </Button>
      </div>
    </div>
  )
}
