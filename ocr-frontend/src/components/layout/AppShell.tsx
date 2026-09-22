import { useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'
import { AppLock } from '../session/AppLock'
import { useSessionStore, isAppInactive } from '../../store/sessionStore'
import { getSessionConfig } from '../../lib/config'
import { Login } from '../../pages/Login'

export function AppShell() {
  const {
    jwtToken, email,
    isAppLocked, setAppLocked,
    touchActivity,
  } = useSessionStore()

  useEffect(() => {
    touchActivity()
  }, [touchActivity])

  useEffect(() => {
    const config = getSessionConfig()
    if (!config.appLockTimeout) return

    const checkInactivity = () => {
      if (isAppInactive(config.appLockTimeout)) {
        setAppLocked(true)
      }
    }

    const interval = setInterval(checkInactivity, 60 * 1000)
    return () => clearInterval(interval)
  }, [setAppLocked])

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

  if (!jwtToken) {
    return <div className="min-h-screen bg-bg"><Login /></div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {isAppLocked && <AppLock />}
      <NavBar />
      <main className="flex-1 py-2">
        <Outlet />
      </main>
      <footer className="py-3 border-t border-border no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          <span className="text-xs text-muted font-mono">DispatchFlow</span>
          <span className="text-xs text-muted">{email ? `Logged in as: ${email}` : ''}</span>
        </div>
      </footer>
    </div>
  )
}
