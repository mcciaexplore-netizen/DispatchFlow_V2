// Module 12 — Backup, export, import, and retention sweep

import { exportDB } from 'dexie-export-import'
import { db } from '../db'
import { LS } from '../constants/storage'
import type { BackupConfig } from '../types'

function getBackupConfig(): BackupConfig {
  try { return JSON.parse(localStorage.getItem(LS.BACKUP_CONFIG) ?? '{}') }
  catch { return { retentionMonths: 6, backupDayOfWeek: 1 } }
}

// ── Export all DB to timestamped JSON download ────────────────────────────
export async function exportBackup(): Promise<void> {
  const blob     = await exportDB(db, { prettyJson: false })
  const filename = `dispatchflow_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href         = url
  a.download     = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // Mark backup complete
  localStorage.setItem(LS.LAST_BACKUP_DATE, new Date().toISOString().slice(0, 10))
  localStorage.removeItem(LS.PENDING_BACKUP)
}

// ── Import from JSON backup file (merge, not overwrite) ──────────────────
export async function importBackup(file: File): Promise<{ imported: number; skipped: number }> {
  // Read and parse the backup file
  const text = await file.text()
  let backup: Record<string, unknown>

  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error('Invalid backup file — not valid JSON')
  }

  // Validate it looks like a Dexie export
  const tables = (backup.data as { tableName: string; rows: Record<string, unknown>[] }[] | undefined)
  if (!tables || !Array.isArray(tables)) {
    throw new Error('Invalid backup format — missing data tables')
  }

  // Collect existing slipNumbers for deduplication
  const existingDispatchSlips = new Set(
    (await db.dispatch.toArray()).map(r => r.slipNumber)
  )
  const existingInvoiceSlips = new Set(
    (await db.invoice.toArray()).map(r => r.slipNumber)
  )

  let imported = 0
  let skipped = 0

  for (const table of tables) {
    if (table.tableName === 'dispatch') {
      for (const row of (table.rows ?? [])) {
        const record = row as unknown as import('../types').DispatchRecord
        if (existingDispatchSlips.has(record.slipNumber)) {
          skipped++
          continue
        }
        // Remove the auto-increment id so Dexie assigns a new one
        const { id: _id, ...rest } = record as Record<string, unknown>
        await db.dispatch.add(rest as unknown as import('../types').DispatchRecord)
        imported++
      }
    } else if (table.tableName === 'invoice') {
      for (const row of (table.rows ?? [])) {
        const record = row as unknown as import('../types').InvoiceRecord
        if (existingInvoiceSlips.has(record.slipNumber)) {
          skipped++
          continue
        }
        const { id: _id, ...rest } = record as Record<string, unknown>
        await db.invoice.add(rest as unknown as import('../types').InvoiceRecord)
        imported++
      }
    }
    // syncQueue and syncLog tables are intentionally not imported
  }

  return { imported, skipped }
}

// ── Retention sweep — delete records older than N months ──────────────────
export async function runRetentionSweep(): Promise<number> {
  const config        = getBackupConfig()
  const retentionMs   = config.retentionMonths * 30 * 24 * 60 * 60 * 1000
  const cutoff        = new Date(Date.now() - retentionMs).toISOString()

  const oldDispatch = await db.dispatch.where('createdAt').below(cutoff).count()
  const oldInvoice  = await db.invoice.where('createdAt').below(cutoff).count()

  await db.dispatch.where('createdAt').below(cutoff).delete()
  await db.invoice.where('createdAt').below(cutoff).delete()

  return oldDispatch + oldInvoice
}

// ── Weekly backup schedule check (run on every app load) ──────────────────
export function checkBackupSchedule(): void {
  const config       = getBackupConfig()
  const lastBackup   = localStorage.getItem(LS.LAST_BACKUP_DATE)
  const today        = new Date().toISOString().slice(0, 10)
  const todayDow     = new Date().getDay() // 0=Sun…6=Sat

  if (lastBackup === today) return // already prompted today

  // Check if it's the scheduled day OR if backup is more than 7 days overdue
  const daysSinceLast = lastBackup
    ? (Date.now() - new Date(lastBackup).getTime()) / 86400000
    : 999

  if (todayDow === config.backupDayOfWeek || daysSinceLast >= 7) {
    localStorage.setItem(LS.PENDING_BACKUP, 'true')
  }
}

export function dismissBackupBanner(): void {
  localStorage.removeItem(LS.PENDING_BACKUP)
}

export function isPendingBackup(): boolean {
  return localStorage.getItem(LS.PENDING_BACKUP) === 'true'
}

// ── Retention check (non-destructive — sets flag only) ───────────────────
export async function checkRetentionDue(): Promise<void> {
  const config    = getBackupConfig()
  const retentionMs = config.retentionMonths * 30 * 24 * 60 * 60 * 1000
  const cutoff    = new Date(Date.now() - retentionMs).toISOString()

  const oldDispatch = await db.dispatch.where('createdAt').below(cutoff).count()
  const oldInvoice  = await db.invoice.where('createdAt').below(cutoff).count()
  const total = oldDispatch + oldInvoice

  if (total > 0) {
    localStorage.setItem(LS.RETENTION_DUE, String(total))
  } else {
    localStorage.removeItem(LS.RETENTION_DUE)
  }
}

export function getRetentionDueCount(): number {
  const val = localStorage.getItem(LS.RETENTION_DUE)
  return val ? parseInt(val, 10) || 0 : 0
}

export function dismissRetentionBanner(): void {
  localStorage.removeItem(LS.RETENTION_DUE)
}
