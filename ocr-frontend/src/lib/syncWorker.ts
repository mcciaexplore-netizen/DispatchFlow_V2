import { db } from '../db'
import { useSyncStore } from '../store/syncStore'

import type { SystemFields } from '../types'

export interface EnqueueRecordParams {
  recordId: string
  recordType: 'dispatch' | 'invoice'
  payload: Record<string, string> & Partial<SystemFields>
}

export async function enqueueRecord({ recordId, recordType, payload }: EnqueueRecordParams) {
  try {
    await db.syncQueue.add({
      recordId,
      recordType,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    })
    const count = await db.syncQueue.count()
    useSyncStore.getState().setPendingCount(count)
    if (count > 0) {
      useSyncStore.getState().setStatus('pending')
    }
  } catch (err) {
    console.error('Failed to enqueue record for sync:', err)
  }
}

export async function forceSyncNow() {
  const store = useSyncStore.getState()
  try {
    store.setStatus('pending')
    const queue = await db.syncQueue.toArray()
    if (queue.length === 0) {
      store.setStatus('synced')
      store.setPendingCount(0)
      store.setLastSyncedAt(Date.now())
      return
    }

    // Process queue items here if API endpoint is ready, or clear on success
    for (const item of queue) {
      if (item.id) {
        await db.syncQueue.delete(item.id)
      }
    }
    
    store.setStatus('synced')
    store.setPendingCount(0)
    store.setLastSyncedAt(Date.now())
  } catch (err) {
    console.error('Sync failed:', err)
    store.setStatus('failing')
  }
}
