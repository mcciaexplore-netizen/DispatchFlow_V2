import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NavBar } from './NavBar'
import { OperatorModal } from '../session/OperatorModal'
import { PinGate } from '../session/PinGate'
import { AppLock } from '../session/AppLock'
import { useSessionStore, restoreOperatorSession, isAdminSessionExpired, isAppInactive } from '../../store/sessionStore'
import { runSyncWorker, startSyncInterval } from '../../lib/syncWorker'
import { checkBackupSchedule, checkRetentionDue } from '../../lib/backup'
import { getSessionConfig } from '../../lib/config'
import { registerOnlineListener } from '../../ocr/networkQueue'
import { runOcr } from '../../ocr/ocr'

export function AppShell() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const {
    currentOperator, setOperator,
    isAdminUnlocked, setAdminUnlocked,
    isAppLocked, setAppLocked,
    touchActivity,
  } = useSessionStore()

  const [showOperatorModal, setShowOperatorModal] = useState(false)
  const [showPinGate,       setShowPinGate]       = useState(false)
  const isSettingsRoute = location.pathname.startsWith('/settings')

  // ── App init ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Restore operator session for today
    const saved = restoreOperatorSession()
    if (saved) {
      setOperator(saved)
    } else {
      setShowOperatorModal(true)
    }

    // Run background services
    runSyncWorker().catch(console.error)
    startSyncInterval()
    checkBackupSchedule()
    checkRetentionDue().catch(console.error)

    // Drain offline OCR queue when connectivity returns
    registerOnlineListener(async (imageBlob, schemaFields) => {
      await runOcr(imageBlob, schemaFields)
    })

    // Touch activity on init
    touchActivity()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inactivity lock ───────────────────────────────────────────────────
  useEffect(() => {
    const config = getSessionConfig()
    if (!config.appLockTimeout) return

    const checkInactivity = () => {
      if (isAppInactive(config.appLockTimeout)) {
        setAppLocked(true)
      }
    }

    const interval = setInterval(checkInactivity, 60 * 1000) // check every minute
    return () => clearInterval(interval)
  }, [setAppLocked])

  // ── Admin session timeout ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAdminUnlocked) return
    const config = getSessionConfig()
    const interval = setInterval(() => {
      if (isAdminSessionExpired(config.adminSessionTimeout)) {
        setAdminUnlocked(false)
      }
    }, 30 * 1000) // check every 30 seconds
    return () => clearInterval(interval)
  }, [isAdminUnlocked, setAdminUnlocked])

  // ── Touch activity on user interaction ───────────────────────────────
  const handleActivity = useCallback(() => {
    touchActivity()
  }, [touchActivity])

  useEffect(() => {
    window.addEventListener('click', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    return () => {
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
    }
  }, [handleActivity])

  // ── Settings PIN gate ────────────────────────────────────────────────
  useEffect(() => {
    if (isSettingsRoute && !isAdminUnlocked) {
      setShowPinGate(true)
    }
  }, [isSettingsRoute, isAdminUnlocked])

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {/* App Lock overlay */}
      {isAppLocked && <AppLock />}

      {/* Operator session modal */}
      <OperatorModal
        open={showOperatorModal && !isAppLocked}
        onClose={() => setShowOperatorModal(false)}
      />

      {/* Admin PIN gate */}
      {showPinGate && (
        <PinGate
          onSuccess={() => setShowPinGate(false)}
          onCancel={() => { setShowPinGate(false); navigate('/') }}
        />
      )}

      {/* Main layout */}
      <NavBar />
      <main className="flex-1 py-2">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-3 border-t border-border no-print">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center">
          <span className="text-xs text-muted font-mono">DispatchFlow</span>
          <span className="text-xs text-muted">{currentOperator && `Operator: ${currentOperator}`}</span>
        </div>
      </footer>
    </div>
  )
}
