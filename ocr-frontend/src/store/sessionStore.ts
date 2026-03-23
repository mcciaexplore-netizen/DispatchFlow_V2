// Module 4 — Zustand store for session state

import { create } from 'zustand'
import { LS } from '../constants/storage'

interface SessionState {
  // Operator session
  currentOperator: string
  setOperator: (name: string) => void

  // Admin PIN session
  isAdminUnlocked: boolean
  adminUnlockedAt: number | null
  setAdminUnlocked: (unlocked: boolean) => void

  // App lock
  isAppLocked: boolean
  setAppLocked: (locked: boolean) => void

  // Refresh last activity
  touchActivity: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentOperator: '',
  setOperator: (name: string) => {
    set({ currentOperator: name })
    localStorage.setItem(LS.LAST_OPERATOR_SESSION, JSON.stringify({
      name,
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    }))
  },

  isAdminUnlocked: false,
  adminUnlockedAt: null,
  setAdminUnlocked: (unlocked: boolean) => {
    const now = Date.now()
    set({ isAdminUnlocked: unlocked, adminUnlockedAt: unlocked ? now : null })
    if (unlocked) {
      localStorage.setItem(LS.ADMIN_SESSION_START, String(now))
    } else {
      localStorage.removeItem(LS.ADMIN_SESSION_START)
    }
  },

  isAppLocked: false,
  setAppLocked: (locked: boolean) => set({ isAppLocked: locked }),

  touchActivity: () => {
    localStorage.setItem(LS.LAST_ACTIVITY, String(Date.now()))
  },
}))

// ── Restore operator from localStorage on boot ─────────────────────────
export function restoreOperatorSession(): string | null {
  try {
    const raw = localStorage.getItem(LS.LAST_OPERATOR_SESSION)
    if (!raw) return null
    const { name, date } = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    return date === today ? name : null
  } catch {
    return null
  }
}

// ── Session timeout checks ────────────────────────────────────────────
export function isAdminSessionExpired(timeoutMinutes: number): boolean {
  const start = localStorage.getItem(LS.ADMIN_SESSION_START)
  if (!start) return true
  const elapsed = (Date.now() - parseInt(start)) / 60000
  return elapsed >= timeoutMinutes
}

export function isAppInactive(lockMinutes: number): boolean {
  const last = localStorage.getItem(LS.LAST_ACTIVITY)
  if (!last) return false
  const elapsed = (Date.now() - parseInt(last)) / 60000
  return elapsed >= lockMinutes
}
