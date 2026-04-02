import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getSchema } from '../lib/schema'
import { exportToCsv } from '../lib/csvExport'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

import { SectionHeader, EmptyState } from '../components/ui/Card'
import type { DispatchRecord } from '../types'

function matchesFilter(record: DispatchRecord, search: string, operator: string, dateFrom: string, dateTo: string): boolean {
  if (operator && record.createdBy !== operator) return false
  if (dateFrom && record.createdAt < new Date(dateFrom).toISOString()) return false
  if (dateTo   && record.createdAt > new Date(dateTo + 'T23:59:59').toISOString()) return false
  if (search) {
    const q = search.toLowerCase()
    const inPayload = Object.values(record.payload ?? {}).some(v => v.toLowerCase().includes(q))
    const inSlip    = record.slipNumber.toLowerCase().includes(q)
    return inPayload || inSlip
  }
  return true
}

export function DispatchHistory() {
  const navigate = useNavigate()
  const fields   = useMemo(() => getSchema('dispatch'), [])

  const [search,   setSearch]   = useState('')
  const [operator, setOperator] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const allRecords = useLiveQuery(() =>
    db.dispatch.orderBy('createdAt').reverse().toArray(), []
  )

  const operators = useMemo(() => {
    if (!allRecords) return []
    return [...new Set(allRecords.map((r: DispatchRecord) => r.createdBy))].filter(Boolean)
  }, [allRecords])

  const [visibleCount, setVisibleCount] = useState(50)

  const filtered = useMemo(() => {
    if (!allRecords) return []
    return allRecords.filter((r: DispatchRecord) => matchesFilter(r, search, operator, dateFrom, dateTo))
  }, [allRecords, search, operator, dateFrom, dateTo])

  // Reset visible count when filters change
  useMemo(() => setVisibleCount(50), [search, operator, dateFrom, dateTo])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const handleExport = () => {
    const data = filtered.map((r: DispatchRecord) => ({
      ...r.payload,
      slipNumber: r.slipNumber,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      schemaVersion: r.schemaVersion,
    }))
    exportToCsv(data, fields, `dispatch_export_${new Date().toISOString().slice(0,10)}.csv`)
  }

  // First 2 visible field labels for preview in list
  const previewFields = fields.slice(0, 2)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">
      <SectionHeader
        title="Dispatch History"
        subtitle={`${filtered.length} of ${allRecords?.length ?? 0} records${visibleCount < filtered.length ? ` (showing ${visibleCount})` : ''}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={!filtered?.length}>
              ↓ CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/create')}>
              + New slip
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-3 flex flex-col gap-2">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm select-none">🔍</span>
          <input
            className="w-full rounded border border-border bg-bg pl-9 pr-3 py-2 text-sm font-body text-text focus:outline-none focus:border-accent min-h-touch"
            placeholder="Search by slip no or any field value…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Operator + Date range row */}
        <div className="flex flex-wrap gap-2 items-end">
          {/* Operator */}
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted pl-0.5">Operator</label>
            <select
              className="rounded border border-border bg-bg px-3 py-2 text-sm font-body text-text focus:outline-none focus:border-accent min-h-touch"
              value={operator}
              onChange={e => setOperator(e.target.value)}
            >
              <option value="">All operators</option>
              {operators.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-end gap-0 rounded border border-border bg-bg overflow-hidden divide-x divide-border">
            <div className="flex flex-col gap-1 px-3 py-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">From</label>
              <input
                type="date"
                className="bg-transparent text-sm font-body text-text focus:outline-none w-[130px]"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 px-3 py-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">To</label>
              <input
                type="date"
                className="bg-transparent text-sm font-body text-text focus:outline-none w-[130px]"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Clear button — only when filters are active */}
          {(search || operator || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setOperator(''); setDateFrom(''); setDateTo('') }}
              className="px-3 py-2 text-xs text-muted hover:text-danger border border-border rounded bg-bg hover:border-danger/40 transition-colors min-h-touch whitespace-nowrap"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Records */}
      {!allRecords ? (
        <div className="text-center py-12 text-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No dispatch slips found"
          description={search || operator || dateFrom || dateTo ? 'Try adjusting the filters.' : 'Create your first dispatch slip.'}
          action={<Button variant="primary" onClick={() => navigate('/create')}>+ New dispatch slip</Button>}
        />
      ) : (
        <div className="flex flex-col row-stagger">
          {visible.map((record: DispatchRecord) => (
            <Link
              key={record.id}
              to={`/history/${record.slipNumber}`}
              className="flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-surface hover:border-accent/50 hover:bg-bg transition-colors card-lift"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-text">{record.slipNumber}</span>
                  {record.editedWithin && <Badge variant="accent">edited</Badge>}
                </div>
                <div className="text-xs text-muted truncate">
                  {previewFields.map(f => record.payload[f.key] ? `${f.label}: ${record.payload[f.key]}` : null).filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-4">
                <span className="text-xs text-muted">{new Date(record.createdAt).toLocaleDateString('en-IN')}</span>
                <span className="text-xs text-muted">{record.createdBy}</span>
              </div>
            </Link>
          ))}
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount(c => c + 50)}
              className="mx-auto mt-3 px-6 py-2 text-sm text-accent hover:text-text border border-border rounded-lg bg-surface hover:bg-bg transition-colors"
            >
              Load more ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
