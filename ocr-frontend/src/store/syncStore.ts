import { create } from 'zustand'
import type { GlobalSyncStatus } from '../types'

interface SyncStoreState {
  status: GlobalSyncStatus
  pendingCount: number
  lastSyncedAt: string | null
  setSyncState: (status: GlobalSyncStatus, pendingCount: number, lastSyncedAt?: string | null) => void
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  status: 'no-config',
  pendingCount: 0,
  lastSyncedAt: null,
  setSyncState: (status, pendingCount, lastSyncedAt = null) =>
    set({ status, pendingCount, lastSyncedAt }),
}))
