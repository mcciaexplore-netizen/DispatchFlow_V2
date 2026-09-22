import { create } from 'zustand'

interface SessionState {
  jwtToken: string | null
  email: string | null
  role: string | null
  tenantId: number | null
  currentOperator: string | null
  setSession: (token: string, email: string, role: string, tenantId: number) => void
  setCurrentOperator: (op: string | null) => void
  logout: () => void
  isAppLocked: boolean
  setAppLocked: (locked: boolean) => void
  touchActivity: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  jwtToken: localStorage.getItem('dispatchflow_jwt') || null,
  email: localStorage.getItem('dispatchflow_email') || null,
  role: localStorage.getItem('dispatchflow_role') || null,
  tenantId: localStorage.getItem('dispatchflow_tenant') ? parseInt(localStorage.getItem('dispatchflow_tenant') as string) : null,
  currentOperator: localStorage.getItem('dispatchflow_operator') || null,
  
  setSession: (token: string, email: string, role: string, tenantId: number) => {
    localStorage.setItem('dispatchflow_jwt', token)
    localStorage.setItem('dispatchflow_email', email)
    localStorage.setItem('dispatchflow_role', role)
    localStorage.setItem('dispatchflow_tenant', String(tenantId))
    set({ jwtToken: token, email, role, tenantId })
  },

  setCurrentOperator: (op: string | null) => {
    if (op) localStorage.setItem('dispatchflow_operator', op)
    else localStorage.removeItem('dispatchflow_operator')
    set({ currentOperator: op })
  },
  
  logout: () => {
    localStorage.removeItem('dispatchflow_jwt')
    localStorage.removeItem('dispatchflow_email')
    localStorage.removeItem('dispatchflow_role')
    localStorage.removeItem('dispatchflow_tenant')
    set({ jwtToken: null, email: null, role: null, tenantId: null })
  },

  isAppLocked: false,
  setAppLocked: (locked: boolean) => set({ isAppLocked: locked }),

  touchActivity: () => {
    localStorage.setItem('dispatchflow_last_activity', String(Date.now()))
  },
}))

export function isAppInactive(lockMinutes: number): boolean {
  const last = localStorage.getItem('dispatchflow_last_activity')
  if (!last) return false
  const elapsed = (Date.now() - parseInt(last)) / 60000
  return elapsed >= lockMinutes
}
