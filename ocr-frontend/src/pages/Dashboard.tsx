import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { DispatchRecord, InvoiceRecord } from '../types'
import { useSyncStore } from '../store/syncStore'
import { exportBackup, dismissBackupBanner, isPendingBackup, getRetentionDueCount, dismissRetentionBanner, runRetentionSweep } from '../lib/backup'
import { Button } from '../components/ui/Button'
import { getCompany, hasAppsScript } from '../lib/config'

export function Dashboard() {
  const navigate    = useNavigate()
  const { status, pendingCount } = useSyncStore()
  const company     = useMemo(() => getCompany(), [])

  const [pendingBackup, setPendingBackup] = useState(isPendingBackup())
  const [exporting,     setExporting]     = useState(false)
  const [retentionDue,  setRetentionDue]  = useState(getRetentionDueCount())
  const [sweeping,      setSweeping]      = useState(false)

  const recentDispatch = useLiveQuery(() => db.dispatch.orderBy('createdAt').reverse().limit(5).toArray(), [])
  const recentInvoice  = useLiveQuery(() => db.invoice.orderBy('createdAt').reverse().limit(5).toArray(), [])
  const dispatchCount  = useLiveQuery(() => db.dispatch.count(), [])
  const invoiceCount   = useLiveQuery(() => db.invoice.count(), [])

  const handleDownloadBackup = async () => {
    setExporting(true)
    await exportBackup()
    setExporting(false)
    dismissBackupBanner()
    setPendingBackup(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5">
      {/* Header with MCCIA branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center p-2 flex-shrink-0">
            {company.logoBase64 ? (
              <img src={company.logoBase64} alt="logo" className="h-full w-full object-contain" />
            ) : (
              <img src="/mccia-logo.svg" alt="MCCIA logo" className="h-full w-full object-contain" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text">
                {company.name || 'MCCIA Enterprise Hub'}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Active
              </span>
            </div>
            {company.gst ? (
              <p className="text-xs font-mono text-muted mt-0.5">GSTIN: {company.gst}</p>
            ) : (
              <p className="text-xs text-muted mt-0.5 font-body">Mahratta Chamber of Commerce, Industries and Agriculture — MSME Portal</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="secondary" size="sm" onClick={() => navigate('/settings')} className="gap-1.5 text-xs">
            ⚙ Settings
          </Button>
        </div>
      </div>

      {/* Warning banners */}
      {!hasAppsScript() && (
        <div className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/30 rounded-xl shadow-2xs">
          <span className="text-warning text-lg flex-shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warning">Cloud sync not configured</p>
            <p className="text-xs text-warning/90 mt-0.5">Records are stored locally on this device. <Link to="/settings" className="underline font-medium">Configure Google Sheets cloud sync →</Link></p>
          </div>
        </div>
      )}

      {pendingBackup && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-primary/8 border border-primary/30 rounded-xl shadow-2xs">
          <span className="text-primary text-xl flex-shrink-0">💾</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">Scheduled Backup Ready</p>
            <p className="text-xs text-muted mt-0.5">Download a secure local archive of all your dispatch and invoice records.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="primary" size="sm" onClick={handleDownloadBackup} loading={exporting}>Download JSON</Button>
            <Button variant="ghost"   size="sm" onClick={() => { dismissBackupBanner(); setPendingBackup(false) }}>Later</Button>
          </div>
        </div>
      )}

      {/* Retention due banner */}
      {retentionDue > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl shadow-2xs">
          <span className="text-amber-600 text-xl flex-shrink-0">🗄</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">{retentionDue} record(s) past retention policy</p>
            <p className="text-xs text-muted mt-0.5">These records are older than your configured retention window. Export and clean them to optimize local storage.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="danger" size="sm" loading={sweeping} onClick={async () => {
              setSweeping(true)
              await exportBackup()
              const deleted = await runRetentionSweep()
              dismissRetentionBanner()
              setRetentionDue(0)
              setSweeping(false)
              alert(`Backup downloaded. ${deleted} old record(s) removed.`)
            }}>Archive & Clean</Button>
            <Button variant="ghost" size="sm" onClick={() => { dismissRetentionBanner(); setRetentionDue(0) }}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Sync status banner */}
      {status === 'failing' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-danger animate-ping flex-shrink-0" />
          <p className="text-sm text-danger font-medium flex-1">Sync is failing — {pendingCount} record(s) pending retry. <Link to="/settings" className="underline">View sync log →</Link></p>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate('/create')}
          className="group flex items-center gap-4 p-5 bg-gradient-to-r from-surface to-primary/5 border border-border/90 rounded-2xl hover:border-primary/50 transition-all card-lift text-left shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-2xl flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-bold text-text text-lg group-hover:text-primary transition-colors">
              New Dispatch Slip
            </div>
            <div className="text-xs text-muted mt-0.5">Scan physical tags or generate slips with local OCR</div>
          </div>
          <span className="text-muted group-hover:text-primary group-hover:translate-x-1 transition-all text-lg">→</span>
        </button>

        <button onClick={() => navigate('/invoices')}
          className="group flex items-center gap-4 p-5 bg-gradient-to-r from-surface to-accent/5 border border-border/90 rounded-2xl hover:border-accent/50 transition-all card-lift text-left shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center text-2xl flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
            🧾
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-bold text-text text-lg group-hover:text-accent transition-colors">
              New GST Invoice
            </div>
            <div className="text-xs text-muted mt-0.5">Extract line items, tax breakdowns & audit trail</div>
          </div>
          <span className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all text-lg">→</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Dispatch Slips', value: dispatchCount ?? '—', link: '/history', icon: '📋', color: 'text-primary' },
          { label: 'GST Invoices', value: invoiceCount ?? '—', link: '/invoices/history', icon: '🧾', color: 'text-accent' },
          { label: 'Cloud Sync', value: status === 'synced' ? 'Synced' : status === 'pending' ? `${pendingCount} Queued` : status === 'failing' ? 'Failing' : 'Offline', link: '/settings', icon: '☁', color: status === 'synced' ? 'text-success' : 'text-warning' },
        ].map(stat => (
          <Link key={stat.label} to={stat.link}
            className="flex flex-col gap-1 p-4 bg-surface border border-border/80 rounded-2xl hover:border-primary/40 transition-all card-lift shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-semibold uppercase tracking-wider">{stat.label}</span>
              <span className="text-base">{stat.icon}</span>
            </div>
            <span className={`text-2xl sm:text-3xl font-heading font-extrabold ${stat.color}`}>{stat.value}</span>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-primary text-base">📋</span>
              <h3 className="text-sm font-heading font-bold text-text uppercase tracking-wider">Recent Dispatches</h3>
            </div>
            <Link to="/history" className="text-xs text-primary font-bold hover:underline">View all →</Link>
          </div>
          {!recentDispatch?.length ? (
            <p className="text-xs text-muted py-6 text-center">No dispatch slips recorded yet.</p>
          ) : (
            <div className="flex flex-col row-stagger divide-y divide-border/60">
              {recentDispatch.map((r: DispatchRecord) => (
                <Link key={r.id} to={`/history/${r.slipNumber}`}
                  className="flex justify-between items-center py-2.5 hover:text-primary transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-text group-hover:text-primary">{r.slipNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">Dispatch</span>
                  </div>
                  <span className="text-xs text-muted font-mono">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-accent text-base">🧾</span>
              <h3 className="text-sm font-heading font-bold text-text uppercase tracking-wider">Recent Invoices</h3>
            </div>
            <Link to="/invoices/history" className="text-xs text-accent font-bold hover:underline">View all →</Link>
          </div>
          {!recentInvoice?.length ? (
            <p className="text-xs text-muted py-6 text-center">No invoices recorded yet.</p>
          ) : (
            <div className="flex flex-col row-stagger divide-y divide-border/60">
              {recentInvoice.map((r: InvoiceRecord) => (
                <Link key={r.id} to={`/invoices/history/${r.slipNumber}`}
                  className="flex justify-between items-center py-2.5 hover:text-accent transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-text group-hover:text-accent">{r.slipNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">Invoice</span>
                  </div>
                  <span className="text-xs text-muted font-mono">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
