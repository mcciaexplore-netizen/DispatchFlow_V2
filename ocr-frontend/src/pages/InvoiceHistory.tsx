import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getSchema } from '../lib/schema'
import { exportToCsv } from '../lib/csvExport'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Card'

import type { InvoiceRecord } from '../types'

function matchesFilter(r: InvoiceRecord, search: string, operator: string, dateFrom: string, dateTo: string) {
  if (operator && r.createdBy !== operator) return false
  if (dateFrom && r.createdAt < new Date(dateFrom).toISOString()) return false
  if (dateTo   && r.createdAt > new Date(dateTo + 'T23:59:59').toISOString()) return false
  if (search) {
    const q = search.toLowerCase()
    return Object.values(r.payload ?? {}).some(v => v.toLowerCase().includes(q)) || r.slipNumber.toLowerCase().includes(q)
  }
  return true
}

export function InvoiceHistory() {
  const navigate = useNavigate()
  const fields   = useMemo(() => getSchema('invoice'), [])

  const [search,   setSearch]   = useState('')
  const [operator, setOperator] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const allRecords = useLiveQuery(() => db.invoice.orderBy('createdAt').reverse().toArray(), [])
  const [visibleCount, setVisibleCount] = useState(50)

  const operators  = useMemo(() => [...new Set((allRecords ?? []).map((r: InvoiceRecord) => r.createdBy))].filter(Boolean), [allRecords])
  const filtered   = useMemo(() => (allRecords ?? []).filter((r: InvoiceRecord) => matchesFilter(r, search, operator, dateFrom, dateTo)), [allRecords, search, operator, dateFrom, dateTo])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const handleExport = () => {
    const data = filtered.map((r: InvoiceRecord) => ({ ...r.payload, slipNumber: r.slipNumber, createdAt: r.createdAt, createdBy: r.createdBy, schemaVersion: r.schemaVersion }))
    exportToCsv(data, fields, `invoice_export_${new Date().toISOString().slice(0,10)}.csv`)
  }

  const previewFields = fields.slice(0, 2)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 sm:p-6 rounded-3xl border border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-text">GST Invoice History</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {filtered.length} of {allRecords?.length ?? 0} total audited invoices recorded
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button variant="secondary" size="md" onClick={handleExport} disabled={!filtered?.length} className="rounded-xl shadow-2xs font-semibold">
            ↓ Export CSV
          </Button>
          <Button variant="accent" size="md" onClick={() => navigate('/invoices')} className="rounded-xl shadow-xs font-bold">
            + New Invoice
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl border border-border/80 p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-base select-none">🔍</span>
          <input
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm font-body text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 min-h-[42px] placeholder:text-muted/40 transition-all shadow-2xs"
            placeholder="Search by invoice number, buyer party name, GSTIN, or item keyword…"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(50) }}
          />
        </div>

        {/* Operator + Date range row */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Operator */}
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted pl-0.5">Operator Filter</label>
            <select
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm font-body text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 min-h-[40px] transition-all shadow-2xs"
              value={operator}
              onChange={e => { setOperator(e.target.value); setVisibleCount(50) }}
            >
              <option value="">All operators</option>
              {operators.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-end rounded-xl border border-border bg-surface overflow-hidden divide-x divide-border shadow-2xs">
            <div className="flex flex-col gap-1 px-3 py-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">From Date</label>
              <input
                type="date"
                className="bg-transparent text-xs sm:text-sm font-body text-text focus:outline-none"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setVisibleCount(50) }}
              />
            </div>
            <div className="flex flex-col gap-1 px-3 py-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">To Date</label>
              <input
                type="date"
                className="bg-transparent text-xs sm:text-sm font-body text-text focus:outline-none"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setVisibleCount(50) }}
              />
            </div>
          </div>

          {/* Clear button */}
          {(search || operator || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setOperator(''); setDateFrom(''); setDateTo(''); setVisibleCount(50) }}
              className="px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/10 border border-danger/30 rounded-xl bg-surface transition-all min-h-[40px] whitespace-nowrap"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Invoices List */}
      {!allRecords ? (
        <div className="text-center py-16 text-muted font-medium">Loading invoices…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No invoices found"
          description={search || operator || dateFrom || dateTo ? 'No matching invoices match the selected criteria. Try adjusting the search filters.' : 'Create your first GST invoice record.'}
          action={<Button variant="accent" onClick={() => navigate('/invoices')}>+ New Invoice</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3 row-stagger">
          {visible.map((record: InvoiceRecord) => (
            <Link
              key={record.id}
              to={`/invoices/history/${record.slipNumber}`}
              className="group flex items-center justify-between p-4 sm:p-5 border border-border/80 rounded-2xl glass-card hover:border-accent/50 transition-all card-lift-accent"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-text group-hover:text-accent transition-colors">{record.slipNumber}</span>
                  <Badge variant="accent" dot>Tax Invoice</Badge>
                  {record.editedWithin && <Badge variant="warning">edited</Badge>}
                </div>
                <div className="text-xs text-muted truncate mt-0.5">
                  {previewFields.map(f => record.payload[f.key] ? `${f.label}: ${record.payload[f.key]}` : null).filter(Boolean).join(' · ') || 'No payload details'}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                {record.payload?.grand_total || record.payload?.total_amount ? (
                  <span className="text-sm font-mono font-extrabold text-accent bg-accent/5 px-2.5 py-1 rounded-lg border border-accent/20">
                    ₹{Number(record.payload?.grand_total || record.payload?.total_amount).toLocaleString('en-IN')}
                  </span>
                ) : null}
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-mono font-semibold text-text bg-bg px-2.5 py-1 rounded-lg border border-border">
                    {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-[11px] text-muted">{record.createdBy}</span>
                </div>
                <button
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    exportToCsv(
                      [{ ...record.payload, slipNumber: record.slipNumber, createdAt: record.createdAt, createdBy: record.createdBy, schemaVersion: record.schemaVersion }],
                      fields,
                      `${record.slipNumber}_${record.createdAt.slice(0, 10)}.csv`
                    )
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-muted hover:text-accent border border-border hover:border-accent/40 rounded-lg bg-surface transition-all shadow-2xs"
                  title="Download CSV"
                >
                  ↓ CSV
                </button>
                <span className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all text-lg">
                  ›
                </span>
              </div>
            </Link>
          ))}
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount(c => c + 50)}
              className="mx-auto mt-4 px-6 py-2.5 text-xs font-bold text-accent hover:text-white hover:bg-accent border border-accent/30 rounded-xl bg-surface transition-all shadow-2xs"
            >
              Load more invoices ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

