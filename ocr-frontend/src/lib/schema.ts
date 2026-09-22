// Module 3 — Schema storage, retrieval, and versioning utilities

import { LS } from '../constants/storage'
import { db } from '../db'
import type { SchemaField, SchemaKind } from '../types'

// ── Read ──────────────────────────────────────────────────────────────────
export function getSchema(kind: SchemaKind): SchemaField[] {
  const key = kind === 'dispatch' ? LS.DISPATCH_SCHEMA : LS.INVOICE_SCHEMA
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getSchemaVersion(kind: SchemaKind): string {
  const key = kind === 'dispatch' ? LS.DISPATCH_SCHEMA_VER : LS.INVOICE_SCHEMA_VER
  return localStorage.getItem(key) ?? ''
}

// ── Write ─────────────────────────────────────────────────────────────────
export function saveSchema(kind: SchemaKind, fields: SchemaField[]): string {
  const schemaKey = kind === 'dispatch' ? LS.DISPATCH_SCHEMA : LS.INVOICE_SCHEMA
  const verKey    = kind === 'dispatch' ? LS.DISPATCH_SCHEMA_VER : LS.INVOICE_SCHEMA_VER
  const version   = new Date().toISOString()

  localStorage.setItem(schemaKey, JSON.stringify(fields))
  localStorage.setItem(verKey, version)

  // Archive snapshot so historical records can render with their original schema
  db.schemaArchive.add({ version, kind, fields }).catch(() => {})

  return version
}

// ── Retrieve archived schema by version ──────────────────────────────────
export async function getArchivedSchema(kind: SchemaKind, version: string): Promise<SchemaField[] | null> {
  const entry = await db.schemaArchive.where({ kind, version }).first()
  return entry?.fields ?? null
}

// ── Validation ────────────────────────────────────────────────────────────
export function validateSchema(fields: SchemaField[]): string[] {
  const errors: string[] = []
  const keys = new Set<string>()
  fields.forEach((f, i) => {
    if (!f.label.trim()) errors.push(`Row ${i + 1}: Label is required`)
    if (!f.key.trim())   errors.push(`Row ${i + 1}: Key is required`)
    if (keys.has(f.key)) errors.push(`Duplicate key "${f.key}"`)
    keys.add(f.key)
  })
  return errors
}

// ── ID generation (crypto-secure to prevent collisions) ───────────────────
function cryptoHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateSlipNumber(): string {
  const now = new Date()
  const yy  = String(now.getFullYear()).slice(-2)
  const mm  = String(now.getMonth() + 1).padStart(2, '0')
  const dd  = String(now.getDate()).padStart(2, '0')
  const suffix = cryptoHex(3) // 16.7M possibilities
  return `DS-${yy}${mm}${dd}-${suffix}`
}

export function generateInvoiceId(): string {
  const now = new Date()
  const yy  = String(now.getFullYear()).slice(-2)
  const mm  = String(now.getMonth() + 1).padStart(2, '0')
  const suffix = cryptoHex(3)
  return `INV-${yy}${mm}-${suffix}`
}

// ── Label from key (schema-version-aware) ─────────────────────────────────
export function labelForKey(key: string, fields: SchemaField[]): string {
  return fields.find(f => f.key === key)?.label ?? key
}

// ── Key → label map ───────────────────────────────────────────────────────
export function keyToLabelMap(fields: SchemaField[]): Record<string, string> {
  const map: Record<string, string> = {}
  fields.forEach(f => { map[f.key] = f.label })
  return map
}
