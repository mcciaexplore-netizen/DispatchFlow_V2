// Module 11 — Google Sheets read service

import { LS } from '../constants/storage'
import type { ApiConfig } from '../types'

function getApiConfig(): Partial<ApiConfig> {
  try { return JSON.parse(localStorage.getItem(LS.API_CONFIG) ?? '{}') } catch { return {} }
}

// ── Read rows from a named sheet tab ─────────────────────────────────────
export async function readSheetRecords(sheetName: string): Promise<Record<string, string>[]> {
  const config = getApiConfig()
  const { sheetsApiKey, spreadsheetId } = config

  if (!sheetsApiKey || !spreadsheetId) {
    throw new Error('Sheets API key or Spreadsheet ID not configured')
  }

  const range = encodeURIComponent(`${sheetName}!A:ZZ`)
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${sheetsApiKey}`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json()
  const rows: string[][] = data.values ?? []
  if (rows.length < 2) return []

  const headers = rows[0]
  return rows.slice(1).map(row => {
    const record: Record<string, string> = {}
    headers.forEach((header, i) => {
      record[header] = row[i] ?? ''
    })
    return record
  })
}

export async function readDispatchFromSheets(): Promise<Record<string, string>[]> {
  const config    = getApiConfig()
  const sheetName = config.dispatchSheetName ?? 'Dispatch'
  return readSheetRecords(sheetName)
}

export async function readInvoicesFromSheets(): Promise<Record<string, string>[]> {
  const config    = getApiConfig()
  const sheetName = config.invoiceSheetName ?? 'Invoices'
  return readSheetRecords(sheetName)
}
