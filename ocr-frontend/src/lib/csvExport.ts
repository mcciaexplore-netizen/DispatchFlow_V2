import type { SchemaField } from '../types'

function escapeCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function exportToCsv(records: Record<string, string>[], fields: SchemaField[], filename: string) {
  // Headers: system fields + schema fields
  const systemHeaders = ['Slip/Invoice No', 'Created At', 'Created By', 'Schema Version']
  const fieldHeaders  = fields.map(f => f.label)
  const headers       = [...systemHeaders, ...fieldHeaders]

  const rows = records.map(r => {
    const systemCells = [
      r.slipNumber ?? '',
      r.createdAt  ? new Date(r.createdAt).toLocaleString('en-IN') : '',
      r.createdBy  ?? '',
      r.schemaVersion ?? '',
    ]
    const fieldCells = fields.map(f => r[f.key] ?? '')
    return [...systemCells, ...fieldCells].map(escapeCell).join(',')
  })

  const csv  = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
