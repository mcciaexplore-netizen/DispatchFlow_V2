import Dexie, { type Table } from 'dexie'
import type { DispatchRecord, InvoiceRecord, SyncQueueEntry, SyncLogEntry, SchemaArchiveEntry } from '../types'

class DispatchFlowDB extends Dexie {
  dispatch!: Table<DispatchRecord, number>
  invoice!: Table<InvoiceRecord, number>
  syncQueue!: Table<SyncQueueEntry, number>
  syncLog!: Table<SyncLogEntry, number>
  schemaArchive!: Table<SchemaArchiveEntry, number>

  constructor() {
    super('DispatchFlowDB')

    this.version(1).stores({
      dispatch: '++id, slipNumber, createdAt, createdBy, schemaVersion, recordType',
      invoice: '++id, slipNumber, createdAt, createdBy, schemaVersion, recordType',
      syncQueue: '++id, recordId, recordType, status, retryCount',
      syncLog: '++id, timestamp, outcome',
    })

    this.version(2).stores({
      dispatch: '++id, slipNumber, createdAt, createdBy, schemaVersion, recordType',
      invoice: '++id, slipNumber, createdAt, createdBy, schemaVersion, recordType',
      syncQueue: '++id, recordId, recordType, status, retryCount',
      syncLog: '++id, timestamp, outcome',
      schemaArchive: '++id, version, kind',
    })
  }
}

export const db = new DispatchFlowDB()

// ── Helper: trim sync log to last 20 entries ─────────────────────────────
export async function trimSyncLog() {
  const count = await db.syncLog.count()
  if (count > 20) {
    const oldest = await db.syncLog.orderBy('id').limit(count - 20).primaryKeys()
    await db.syncLog.bulkDelete(oldest)
  }
}
