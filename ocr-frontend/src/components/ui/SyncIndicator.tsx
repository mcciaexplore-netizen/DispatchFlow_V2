import { Link } from 'react-router-dom'
import { useSyncStore } from '../../store/syncStore'

export function SyncIndicator() {
  const { status, pendingCount, lastSyncedAt } = useSyncStore()

  const configs = {
    synced:    { dot: 'bg-success', label: 'All synced',           color: 'text-success' },
    pending:   { dot: 'bg-warning animate-pulse', label: `${pendingCount} pending`, color: 'text-warning' },
    failing:   { dot: 'bg-danger animate-pulse',  label: 'Sync failing',   color: 'text-danger' },
    'no-config': { dot: 'bg-border', label: 'Cloud sync off', color: 'text-muted' },
  }

  const cfg = configs[status]

  return (
    <Link to="/settings" className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors" title={lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleString('en-IN')}` : ''}>
      <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={cfg.color}>{cfg.label}</span>
    </Link>
  )
}
