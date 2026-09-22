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
  const navigate = useNavigate()
  const { status, pendingCount } = useSyncStore()
  const company = useMemo(() => getCompany(), [])

  const [pendingBackup, setPendingBackup] = useState(isPendingBackup())
  const [exporting, setExporting] = useState(false)
  const [retentionDue, setRetentionDue] = useState(getRetentionDueCount())
  const [sweeping, setSweeping] = useState(false)

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Enterprise Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-card border border-white/80 p-6 sm:p-9 shadow-xl bg-gradient-to-r from-white/95 via-white/80 to-primary/5">
        <div className="absolute -top-12 -right-12 w-72 h-72 bg-gradient-to-br from-primary/20 to-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-1/3 w-56 h-56 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-primary/20 flex items-center justify-center p-3 shadow-lg flex-shrink-0 group hover:scale-105 transition-transform duration-300 glow-primary">
              {company.logoBase64 ? (
                <img src={company.logoBase64} alt="logo" className="h-full w-full object-contain" />
              ) : (
                <img src="/mccia-logo-transparent.png" alt="MCCIA logo" className="h-full w-full object-contain" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-text tracking-tight bg-gradient-to-r from-slate-900 via-primary to-slate-800 bg-clip-text text-transparent">
                  {company.name || 'MCCIA Enterprise Hub'}
                </h1>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operational
                </span>
              </div>
              {company.gst ? (
                <p className="text-xs font-mono text-muted mt-1.5 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-600 border border-border">GSTIN</span>
                  <span className="font-semibold text-text tracking-wide">{company.gst}</span>
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-muted mt-1.5 font-medium max-w-xl leading-relaxed">
                  Mahratta Chamber of Commerce, Industries and Agriculture — Autonomous MSME Automation Portal
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/settings')}
              className="rounded-xl shadow-xs hover:shadow-md border-border/80 font-bold"
            >
              <span>⚙</span>
              <span>Settings</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/create')}
              className="rounded-xl shadow-lg glow-primary font-bold"
            >
              <span>+ Quick Scan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Warning / Notification Banners */}
      {!hasAppsScript() && (
        <div className="flex items-start gap-3.5 px-5 py-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl shadow-xs">
          <span className="text-amber-500 text-xl flex-shrink-0">⚡</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-700">Cloud Sync Not Configured</p>
            <p className="text-xs text-amber-900/80 mt-0.5">
              All OCR dispatches and invoices are securely stored in your local browser storage. Connect your Google Sheets bridge to enable automatic multi-user syncing.
            </p>
          </div>
          <Link
            to="/settings"
            className="px-3.5 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors shadow-2xs whitespace-nowrap self-center"
          >
            Connect Cloud →
          </Link>
        </div>
      )}

      {pendingBackup && (
        <div className="flex items-start sm:items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/30 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
              💾
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Scheduled Local Backup Ready</p>
              <p className="text-xs text-muted mt-0.5">Generate and download an encrypted snapshot of all local dispatch and tax records.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="primary" size="sm" onClick={handleDownloadBackup} loading={exporting} className="rounded-xl">
              Download JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { dismissBackupBanner(); setPendingBackup(false) }} className="rounded-xl">
              Later
            </Button>
          </div>
        </div>
      )}

      {retentionDue > 0 && (
        <div className="flex items-start sm:items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/30 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-danger text-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
              🗄
            </div>
            <div>
              <p className="text-sm font-bold text-danger">{retentionDue} Record(s) Past Retention Window</p>
              <p className="text-xs text-muted mt-0.5">Export records older than your configured retention policy to maintain lightning-fast database performance.</p>
            </div>
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
            }} className="rounded-xl">
              Archive & Sweep
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { dismissRetentionBanner(); setRetentionDue(0) }} className="rounded-xl">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Action Launchpad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          onClick={() => navigate('/create')}
          className="group relative overflow-hidden p-6 sm:p-7 glass-card rounded-3xl border border-primary/20 hover:border-primary/60 transition-all card-lift text-left text-text"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform flex-shrink-0">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-xl text-text group-hover:text-primary transition-colors">
                  Create Dispatch Slip
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                  Fast Flow
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                Scan physical delivery challans or generate gate pass dispatches with automatic offline OCR parsing.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary">
                <span>Start New Dispatch</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/invoices')}
          className="group relative overflow-hidden p-6 sm:p-7 glass-card rounded-3xl border border-accent/20 hover:border-accent/60 transition-all card-lift-accent text-left text-text"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-hover text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform flex-shrink-0">
              🧾
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-xl text-text group-hover:text-accent transition-colors">
                  Process GST Invoice
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase">
                  AI Extraction
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                Extract multi-line items, calculate HSN tax breakdowns, and generate compliant audit-ready digital invoices.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-accent">
                <span>Start New Invoice</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: 'Dispatches Recorded',
            count: dispatchCount ?? 0,
            link: '/history',
            icon: '📋',
            subtitle: 'Delivery challans in ledger',
            badge: 'Ledger Active',
            color: 'text-primary',
            badgeColor: 'bg-primary/10 text-primary border-primary/20',
          },
          {
            title: 'Invoices Generated',
            count: invoiceCount ?? 0,
            link: '/invoices/history',
            icon: '🧾',
            subtitle: 'GST audited records',
            badge: 'Tax Compliant',
            color: 'text-accent',
            badgeColor: 'bg-accent/10 text-accent border-accent/20',
          },
          {
            title: 'Cloud Synchronization',
            count: status === 'synced' ? 'Healthy' : status === 'pending' ? `${pendingCount} Queued` : status === 'failing' ? 'Alert' : 'Offline',
            link: '/settings',
            icon: '☁',
            subtitle: status === 'synced' ? 'All records in sync' : `${pendingCount} pending upload`,
            badge: status === 'synced' ? '100% Synced' : 'Action Required',
            color: status === 'synced' ? 'text-success' : 'text-warning',
            badgeColor: status === 'synced' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20',
          },
        ].map(item => (
          <Link
            key={item.title}
            to={item.link}
            className="group flex flex-col justify-between p-5 rounded-2xl glass-card border border-border/80 hover:border-primary/40 transition-all card-lift"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform">
                  {item.icon}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted font-body">
                {item.title}
              </p>
              <p className={`text-3xl font-heading font-black mt-1 ${item.color}`}>
                {item.count}
              </p>
            </div>
            <p className="text-xs text-muted/80 mt-3 pt-3 border-t border-border/60">
              {item.subtitle}
            </p>
          </Link>
        ))}
      </div>

      {/* Activity Streams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Dispatches */}
        <div className="glass-card rounded-3xl border border-border/80 p-6 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                📋
              </div>
              <div>
                <h2 className="text-base font-heading font-bold text-text">Recent Dispatches</h2>
                <p className="text-xs text-muted">Latest deliveries and gate passes</p>
              </div>
            </div>
            <Link
              to="/history"
              className="text-xs text-primary font-bold hover:text-primary-hover flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
            >
              <span>View All</span>
              <span>→</span>
            </Link>
          </div>

          {!recentDispatch?.length ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2 opacity-30">📋</span>
              <p className="text-sm font-semibold text-text">No Dispatches Created</p>
              <p className="text-xs text-muted mt-0.5">Start your first slip to build your dispatch audit trail.</p>
              <Button size="sm" variant="secondary" onClick={() => navigate('/create')} className="mt-4 rounded-xl">
                + New Dispatch Slip
              </Button>
            </div>
          ) : (
            <div className="flex flex-col row-stagger divide-y divide-border/60">
              {recentDispatch.map((r: DispatchRecord) => (
                <Link
                  key={r.id}
                  to={`/history/${r.slipNumber}`}
                  className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-surface/80 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-text group-hover:text-primary transition-colors truncate">
                        {r.slipNumber}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {r.payload?.party_name || r.payload?.buyer_name || 'Generic Consignment'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted font-mono bg-bg px-2 py-0.5 rounded border border-border">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all text-sm">
                      ›
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="glass-card rounded-3xl border border-border/80 p-6 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-sm font-bold">
                🧾
              </div>
              <div>
                <h2 className="text-base font-heading font-bold text-text">Recent Invoices</h2>
                <p className="text-xs text-muted">Latest verified GST tax invoices</p>
              </div>
            </div>
            <Link
              to="/invoices/history"
              className="text-xs text-accent font-bold hover:text-accent-hover flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-accent/5"
            >
              <span>View All</span>
              <span>→</span>
            </Link>
          </div>

          {!recentInvoice?.length ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2 opacity-30">🧾</span>
              <p className="text-sm font-semibold text-text">No Invoices Stored</p>
              <p className="text-xs text-muted mt-0.5">Scan or generate tax invoices to organize your accounts.</p>
              <Button size="sm" variant="secondary" onClick={() => navigate('/invoices')} className="mt-4 rounded-xl">
                + New GST Invoice
              </Button>
            </div>
          ) : (
            <div className="flex flex-col row-stagger divide-y divide-border/60">
              {recentInvoice.map((r: InvoiceRecord) => (
                <Link
                  key={r.id}
                  to={`/invoices/history/${r.slipNumber}`}
                  className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-surface/80 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-text group-hover:text-accent transition-colors truncate">
                        {r.slipNumber}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {r.payload?.buyer_name || r.payload?.party_name || 'Standard Invoice'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r.payload?.grand_total && (
                      <span className="text-xs font-mono font-bold text-text">
                        ₹{Number(r.payload.grand_total).toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-xs text-muted font-mono bg-bg px-2 py-0.5 rounded border border-border">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all text-sm">
                      ›
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

