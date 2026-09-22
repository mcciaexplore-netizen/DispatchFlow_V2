import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getSchema } from '../lib/schema'
import { exportToCsv } from '../lib/csvExport'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Card'




interface DispatchHistoryItem {
  id: number
  slipNumber: string
  createdAt: string
  createdBy: string
  payload: Record<string, string>
  editedWithin: boolean
  status: string
}

function matchesFilter(record: DispatchHistoryItem, search: string, operator: string, dateFrom: string, dateTo: string): boolean {
  if (operator && record.createdBy !== operator) return false
  if (dateFrom && record.createdAt < new Date(dateFrom).toISOString()) return false
  if (dateTo   && record.createdAt > new Date(dateTo + 'T23:59:59').toISOString()) return false
  if (search) {
    const q = search.toLowerCase()
    const inPayload = Object.values(record.payload ?? {}).some(v => String(v).toLowerCase().includes(q))
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

  const [allRecords, setAllRecords] = useState<DispatchHistoryItem[] | null>(null)

  useEffect(() => {
    api.get('/dispatches/')
      .then(res => {
        const records: DispatchHistoryItem[] = res.data.map((r: { id: number; created_at: string; tenant_id: number; raw_ocr_json: Record<string, string>; status: string }) => ({
          id: r.id,
          slipNumber: `DSP-${r.id}`,
          createdAt: r.created_at,
          createdBy: `User ${r.tenant_id}`, // In absence of created_by in dispatch model for now
          payload: r.raw_ocr_json || {},
          editedWithin: false,
          status: r.status,
        }))
        setAllRecords(records)
      })
      .catch(err => {
        console.error("Failed to fetch dispatches", err)
        setAllRecords([])
      })
  }, [])

  const operators = useMemo(() => {
    if (!allRecords) return []
    return [...new Set(allRecords.map(r => r.createdBy))].filter(Boolean)
  }, [allRecords])

  const [visibleCount, setVisibleCount] = useState(50)

  const filtered = useMemo(() => {
    if (!allRecords) return []
    return allRecords.filter(r => matchesFilter(r, search, operator, dateFrom, dateTo))
  }, [allRecords, search, operator, dateFrom, dateTo])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const handleExport = () => {
    const data = filtered.map(r => ({
      ...r.payload,
      slipNumber: r.slipNumber,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
    }))
    exportToCsv(data, fields, `dispatch_export_${new Date().toISOString().slice(0,10)}.csv`)
  }

  const previewFields = fields.slice(0, 2)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 sm:p-6 rounded-3xl border border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-text">Dispatch History</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {filtered.length} of {allRecords?.length ?? 0} total records recorded in enterprise database
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button variant="secondary" size="md" onClick={handleExport} disabled={!filtered?.length} className="rounded-xl shadow-2xs font-semibold">
            ↓ Export CSV
          </Button>
          <Button variant="primary" size="md" onClick={() => navigate('/create')} className="rounded-xl shadow-xs font-bold">
            + New Dispatch
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl border border-border/80 p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-base select-none">🔍</span>
          <input
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm font-body text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[42px] placeholder:text-muted/40 transition-all shadow-2xs"
            placeholder="Search by slip ID, consignment party, destination, or vehicle number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(50) }}
          />
        </div>

        {/* Operator + Date range row */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Operator Filter */}
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted pl-0.5">Operator Filter</label>
            <select
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm font-body text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[40px] transition-all shadow-2xs"
              value={operator}
              onChange={e => { setOperator(e.target.value); setVisibleCount(50) }}
            >
              <option value="">All operators</option>
              {operators.map(op => <option key={op as string} value={op as string}>{op as string}</option>)}
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

      {/* Records List */}
      {!allRecords ? (
        <div className="text-center py-16 text-muted font-medium">Loading ledger records…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No dispatch slips found"
          description={search || operator || dateFrom || dateTo ? 'No matching slips match the selected criteria. Try adjusting the filters.' : 'Create your first dispatch slip to start the audit ledger.'}
          action={<Button variant="primary" onClick={() => navigate('/create')}>+ New Dispatch Slip</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3 row-stagger">
          {visible.map((record: DispatchHistoryItem) => (
            <Link
              key={record.id}
              to={`/history/${record.slipNumber}`}
              className="group flex items-center justify-between p-4 sm:p-5 border border-border/80 rounded-2xl glass-card hover:border-primary/50 transition-all card-lift"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-text group-hover:text-primary transition-colors">{record.slipNumber}</span>
                  <Badge variant={record.status === 'delivered' ? 'success' : 'primary'} dot>
                    {record.status || 'Active'}
                  </Badge>
                  {record.editedWithin && <Badge variant="accent">edited</Badge>}
                </div>
                <div className="text-xs text-muted truncate mt-0.5">
                  {previewFields.map(f => record.payload[f.key] ? `${f.label}: ${record.payload[f.key]}` : null).filter(Boolean).join(' · ') || 'No item payload preview'}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-mono font-semibold text-text bg-bg px-2.5 py-1 rounded-lg border border-border">
                    {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-[11px] text-muted">{record.createdBy}</span>
                </div>
                <span className="text-muted group-hover:text-primary group-hover:translate-x-1 transition-all text-lg">
                  ›
                </span>
              </div>
            </Link>
          ))}
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount(c => c + 50)}
              className="mx-auto mt-4 px-6 py-2.5 text-xs font-bold text-primary hover:text-white hover:bg-primary border border-primary/30 rounded-xl bg-surface transition-all shadow-2xs"
            >
              Load more records ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
