// ── Schema field definition ───────────────────────────────────────────────
export type FieldType = 'text' | 'number' | 'date'

export interface SchemaField {
  id: string        // unique within schema, auto-generated
  label: string     // display name shown in form & history
  key: string       // storage key used in record payload & OCR JSON
  description: string // plain-English hint injected into OCR prompt
  type: FieldType
  required: boolean
}

export type SchemaKind = 'dispatch' | 'invoice'

// ── System fields (locked, never shown in editor) ─────────────────────────
export interface SystemFields {
  slipNumber: string    // for dispatch; invoiceId for invoice
  createdAt: string     // ISO timestamp
  createdBy: string     // operator name at time of save
  schemaVersion: string // schemaVersion timestamp at time of save
  lastModifiedAt?: string
  lastModifiedBy?: string
}

// ── Saved record ──────────────────────────────────────────────────────────
export interface DispatchRecord extends SystemFields {
  id?: number           // Dexie auto-increment primary key
  payload: Record<string, string>
  recordType: 'dispatch'
  editedWithin?: boolean // true if edited inside grace window
}

export interface InvoiceRecord extends SystemFields {
  id?: number
  payload: Record<string, string>
  recordType: 'invoice'
  editedWithin?: boolean
}

export type AnyRecord = DispatchRecord | InvoiceRecord

// ── Schema archive entry ──────────────────────────────────────────────────
export interface SchemaArchiveEntry {
  id?: number
  version: string       // ISO timestamp (same as schemaVersion on records)
  kind: SchemaKind
  fields: SchemaField[]
}

// ── Sync queue entry ──────────────────────────────────────────────────────
export type SyncStatus = 'pending' | 'synced' | 'failed'

export interface SyncQueueEntry {
  id?: number
  recordId: string      // slipNumber or invoiceId
  recordType: 'dispatch' | 'invoice'
  payload: Record<string, string> & Partial<SystemFields>
  retryCount: number
  lastAttempted: string | null
  status: SyncStatus
}

// ── Sync attempt log entry ────────────────────────────────────────────────
export interface SyncLogEntry {
  id?: number
  timestamp: string
  recordCount: number
  outcome: 'success' | 'failure'
  error?: string
}

// ── OCR result ────────────────────────────────────────────────────────────
export type OcrStatus = 'idle' | 'scanning' | 'success' | 'partial' | 'failed'

export interface OcrLineItem {
  item_name: string
  quantity: string
  unit: string
  rate: string
  gst_percentage: string
  total_amount: string
}

export interface OcrResult {
  status: OcrStatus
  data: Record<string, string>
  missingRequired: string[]
  modelUsed: string
  rawResponse?: string
  items?: OcrLineItem[]
  grand_total?: string
  document_type?: string
}

// ── App config (localStorage) ─────────────────────────────────────────────
export interface CompanyConfig {
  name: string
  gst: string
  address: string
  logoBase64?: string
}

export interface ApiConfig {
  geminiApiKey: string
  appsScriptUrl: string
  sheetsApiKey: string
  spreadsheetId: string
  dispatchSheetName: string
  invoiceSheetName: string
}

export interface SessionConfig {
  adminSessionTimeout: 15 | 30 | 60   // minutes
  appLockTimeout: number               // minutes
  gracePeriodMinutes: 0 | 15 | 30 | 60 // 0 = never lock
}

export interface BackupConfig {
  retentionMonths: number   // default 6
  backupDayOfWeek: number   // 0=Sun … 6=Sat, default 1 (Mon)
}

// ── Global sync state (Zustand) ────────────────────────────────────────────
export type GlobalSyncStatus = 'synced' | 'pending' | 'failing' | 'no-config'

export interface SyncState {
  status: GlobalSyncStatus
  pendingCount: number
  lastSyncedAt: string | null
}
