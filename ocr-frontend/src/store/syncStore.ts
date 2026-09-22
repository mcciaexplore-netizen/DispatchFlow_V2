import { create } from 'zustand'

export type SyncStatus = 'synced' | 'pending' | 'failing' | 'no-config'

interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: number | null
  setStatus: (status: SyncStatus) => void
  setPendingCount: (count: number) => void
  setLastSyncedAt: (timestamp: number | null) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'synced',
  pendingCount: 0,
  lastSyncedAt: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}))
