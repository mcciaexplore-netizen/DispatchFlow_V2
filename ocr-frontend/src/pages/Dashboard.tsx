import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { DispatchRecord, InvoiceRecord } from '../types'
import { useSyncStore } from '../store/syncStore'
import { exportBackup, dismissBackupBanner, isPendingBackup, getRetentionDueCount, dismissRetentionBanner, runRetentionSweep } from '../lib/backup'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { getCompany, hasAppsScript } from '../lib/config'

export function Dashboard() {
  const navigate    = useNavigate()
  const { status, pendingCount } = useSyncStore()
  const company     = useMemo(getCompany, [])

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
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading text-text">{company.name || 'Dashboard'}</h1>
          {company.gst && <p className="text-xs font-mono text-muted mt-0.5">{company.gst}</p>}
        </div>
        {company.logoBase64 && (
          <img src={company.logoBase64} alt="logo" className="h-10 w-auto object-contain" />
        )}
      </div>

      {/* Warning banners */}
      {!hasAppsScript() && (
        <div className="flex items-start gap-3 px-4 py-3 bg-warning/8 border border-warning/30 rounded-lg">
          <span className="text-warning text-lg flex-shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning">Cloud sync not configured</p>
            <p className="text-xs text-warning/80 mt-0.5">Data is stored only on this device. <Link to="/settings" className="underline">Configure sync →</Link></p>
          </div>
        </div>
      )}

      {pendingBackup && (
        <div className="flex items-start gap-3 px-4 py-3 bg-accent/8 border border-accent/30 rounded-lg">
          <span className="text-accent text-lg flex-shrink-0">💾</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-accent">Weekly backup ready</p>
            <p className="text-xs text-muted mt-0.5">Download a local backup of all your records.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="primary" size="sm" onClick={handleDownloadBackup} loading={exporting}>Download</Button>
            <Button variant="ghost"   size="sm" onClick={() => { dismissBackupBanner(); setPendingBackup(false) }}>Later</Button>
          </div>
        </div>
      )}

      {/* Retention due banner */}
      {retentionDue > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border border-border rounded-lg">
          <span className="text-primary text-lg flex-shrink-0">🗄</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text">{retentionDue} old record(s) past retention period</p>
            <p className="text-xs text-muted mt-0.5">These records are older than the configured retention window. You can archive and remove them to free up device storage.</p>
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
            }}>Archive & Delete</Button>
            <Button variant="ghost" size="sm" onClick={() => { dismissRetentionBanner(); setRetentionDue(0) }}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Sync status banner */}
      {status === 'failing' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-danger/8 border border-danger/30 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse flex-shrink-0" />
          <p className="text-sm text-danger flex-1">Sync is failing — {pendingCount} record(s) not uploaded. <Link to="/settings" className="underline">View sync log →</Link></p>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => navigate('/create')}
          className="flex items-center gap-4 px-5 py-4 bg-surface border border-border rounded-lg hover:border-accent/50 hover:bg-bg transition-colors card-lift text-left">
          <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center text-accent text-xl flex-shrink-0">⚡</div>
          <div>
            <div className="font-heading text-text text-base">New Dispatch Slip</div>
            <div className="text-xs text-muted mt-0.5">Scan a tag or fill manually</div>
          </div>
        </button>
        <button onClick={() => navigate('/invoices')}
          className="flex items-center gap-4 px-5 py-4 bg-surface border border-border rounded-lg hover:border-accent/50 hover:bg-bg transition-colors card-lift text-left">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary text-xl flex-shrink-0">🧾</div>
          <div>
            <div className="font-heading text-text text-base">New Invoice</div>
            <div className="text-xs text-muted mt-0.5">Scan or enter invoice details</div>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Dispatch slips', value: dispatchCount ?? '—', link: '/history' },
          { label: 'Invoices', value: invoiceCount ?? '—', link: '/invoices/history' },
          { label: 'Sync status', value: status === 'synced' ? '✓ Synced' : status === 'pending' ? `${pendingCount} pending` : status === 'failing' ? 'Failing' : 'Off', link: '/settings' },
        ].map(stat => (
          <Link key={stat.label} to={stat.link}
            className="flex flex-col gap-1 px-4 py-3 bg-surface border border-border rounded-lg hover:border-accent/30 transition-colors">
            <span className="text-2xl font-heading text-text">{stat.value}</span>
            <span className="text-xs text-muted">{stat.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-heading text-muted uppercase tracking-wide">Recent dispatches</h3>
            <Link to="/history" className="text-xs text-accent">View all</Link>
          </div>
          {!recentDispatch?.length ? (
            <p className="text-xs text-muted py-2">No dispatch slips yet.</p>
          ) : (
            <div className="flex flex-col row-stagger">
              {recentDispatch.map((r: DispatchRecord) => (
                <Link key={r.id} to={`/history/${r.slipNumber}`}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:text-accent transition-colors">
                  <span className="font-mono text-xs text-text">{r.slipNumber}</span>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-heading text-muted uppercase tracking-wide">Recent invoices</h3>
            <Link to="/invoices/history" className="text-xs text-accent">View all</Link>
          </div>
          {!recentInvoice?.length ? (
            <p className="text-xs text-muted py-2">No invoices yet.</p>
          ) : (
            <div className="flex flex-col row-stagger">
              {recentInvoice.map((r: InvoiceRecord) => (
                <Link key={r.id} to={`/invoices/history/${r.slipNumber}`}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:text-accent transition-colors">
                  <span className="font-mono text-xs text-text">{r.slipNumber}</span>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
