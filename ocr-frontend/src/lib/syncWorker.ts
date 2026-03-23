// Module 10 — Sync Queue Worker
// Processes the Dexie syncQueue, writes records to Google Sheets via Apps Script proxy.

import { db, trimSyncLog } from '../db'
import { LS } from '../constants/storage'
import { useSyncStore } from '../store/syncStore'
import type { SyncQueueEntry } from '../types'

const MAX_RETRIES = 5
let intervalId: ReturnType<typeof setInterval> | null = null

// ── Post one record to Apps Script ────────────────────────────────────────
async function postToAppsScript(url: string, entry: SyncQueueEntry): Promise<void> {
  const body = JSON.stringify({
    recordType: entry.recordType,
    payload: entry.payload,
  })

  // Use text/plain Content-Type to avoid CORS preflight (simple request).
  // Apps Script Web Apps deployed as "Anyone" handle this correctly.
  // We use redirect: 'follow' to handle the 302 redirect that Apps Script returns.
  const res = await fetch(url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'text/plain' },
    redirect: 'follow',
  })

  // After following the redirect, we should get a readable response.
  // If the response is opaque (unexpected), treat as unverified — do NOT delete from queue.
  if (res.type === 'opaque') {
    throw new Error('Opaque response — cannot verify write succeeded. Record kept in queue.')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  // Verify the Apps Script returned "ok" (our script returns "ok" on success)
  const responseText = await res.text().catch(() => '')
  if (responseText.startsWith('error:')) {
    throw new Error(`Apps Script error: ${responseText}`)
  }
}

// ── Refresh global sync status in Zustand ─────────────────────────────────
async function refreshSyncStatus() {
  const appsScriptUrl = getConfig()
  const { setSyncState } = useSyncStore.getState()

  if (!appsScriptUrl) {
    setSyncState('no-config', 0)
    return
  }

  const pending = await db.syncQueue.where('status').equals('pending').count()
  const failed  = await db.syncQueue.where('status').equals('failed').count()

  if (failed > 0) {
    setSyncState('failing', pending + failed)
  } else if (pending > 0) {
    setSyncState('pending', pending)
  } else {
    setSyncState('synced', 0, new Date().toISOString())
  }
}

function getConfig(): string | null {
  try {
    const raw = localStorage.getItem(LS.API_CONFIG)
    if (!raw) return null
    return JSON.parse(raw)?.appsScriptUrl || null
  } catch { return null }
}

// ── Process entire queue ───────────────────────────────────────────────────
export async function runSyncWorker(): Promise<void> {
  const appsScriptUrl = getConfig()
  if (!appsScriptUrl) {
    await refreshSyncStatus()
    return
  }

  const pending = await db.syncQueue
    .where('status').equals('pending')
    .limit(20)
    .toArray()

  let successCount = 0
  let errorMessage = ''

  for (const entry of pending) {
    try {
      await postToAppsScript(appsScriptUrl, entry)
      await db.syncQueue.delete(entry.id!)
      successCount++
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      const newRetryCount = (entry.retryCount ?? 0) + 1
      await db.syncQueue.update(entry.id!, {
        retryCount: newRetryCount,
        lastAttempted: new Date().toISOString(),
        status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
      })
    }
  }

  // Write to sync log
  if (pending.length > 0) {
    await db.syncLog.add({
      timestamp: new Date().toISOString(),
      recordCount: pending.length,
      outcome: errorMessage ? 'failure' : 'success',
      error: errorMessage || undefined,
    })
    await trimSyncLog()
  }

  await refreshSyncStatus()
}

// ── Enqueue a new record ───────────────────────────────────────────────────
export async function enqueueRecord(entry: Omit<SyncQueueEntry, 'id' | 'retryCount' | 'lastAttempted' | 'status'>) {
  await db.syncQueue.add({
    ...entry,
    retryCount: 0,
    lastAttempted: null,
    status: 'pending',
  })
  // Trigger immediate sync attempt
  runSyncWorker().catch(console.error)
}

// ── Start background 5-minute interval ────────────────────────────────────
export function startSyncInterval() {
  if (intervalId) return
  intervalId = setInterval(() => {
    runSyncWorker().catch(console.error)
  }, 5 * 60 * 1000) // 5 minutes
}

export function stopSyncInterval() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

// ── Force sync (used by Settings page) ────────────────────────────────────
export async function forceSyncNow(): Promise<void> {
  // Reset failed records back to pending for retry
  await db.syncQueue.where('status').equals('failed').modify({ status: 'pending', retryCount: 0 })
  await runSyncWorker()
}
