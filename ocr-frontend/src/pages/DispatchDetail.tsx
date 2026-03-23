import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getSchema, getArchivedSchema } from '../lib/schema'
import { SlipPreview } from '../components/preview/SlipPreview'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SectionHeader, Card, Divider } from '../components/ui/Card'
import { getCompany, getSessionConfig } from '../lib/config'
function isEditable(createdAt: string, graceMins: number): boolean {
  if (graceMins === 0) return true
  return (Date.now() - new Date(createdAt).getTime()) / 60000 <= graceMins
}

export function DispatchDetail() {
  const { slipId }  = useParams<{ slipId: string }>()
  const navigate    = useNavigate()
  const company     = useMemo(getCompany, [])
  const currentFields = useMemo(() => getSchema('dispatch'), [])

  const record = useLiveQuery(
    async () => slipId ? db.dispatch.where('slipNumber').equals(slipId).first() : undefined,
    [slipId]
  )

  // Try to load the schema that was active when this record was created
  const archivedFields = useLiveQuery(
    async () => record?.schemaVersion ? getArchivedSchema('dispatch', record.schemaVersion) : null,
    [record?.schemaVersion]
  )

  const sessionConfig = useMemo(getSessionConfig, [])

  if (!record) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted">{record === null ? 'Record not found.' : 'Loading…'}</p>
      <Link to="/history" className="text-accent underline text-sm mt-2 inline-block">← Back to history</Link>
    </div>
  )

  const canEdit = isEditable(record.createdAt, sessionConfig.gracePeriodMinutes)

  // Use archived schema if available, fall back to current
  const recordFields = archivedFields ?? currentFields

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      <SectionHeader
        title={record.slipNumber}
        subtitle={`Created ${new Date(record.createdAt).toLocaleString('en-IN')} by ${record.createdBy}`}
        action={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => navigate(`/create/${record.slipNumber}`)}>
                ✏ Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
              ← History
            </Button>
          </div>
        }
      />

      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Dispatch</Badge>
        {record.editedWithin && <Badge variant="accent">Edited</Badge>}
        {!canEdit && <Badge variant="default">🔒 Locked</Badge>}
      </div>

      {/* Field data */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recordFields.map(f => (
            <div key={f.key} className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
              <span className="text-xs uppercase tracking-wide text-muted font-mono">{f.label}</span>
              <span className="text-base text-text font-medium">{record.payload[f.key] || <span className="text-muted italic text-sm">—</span>}</span>
            </div>
          ))}
        </div>
      </Card>

      <Divider />

      {/* Audit trail */}
      <Card padding="sm">
        <h3 className="text-sm font-heading text-muted mb-2 uppercase tracking-wide">Audit trail</h3>
        <div className="flex flex-col gap-1 text-xs font-mono text-muted">
          <span>Created: {new Date(record.createdAt).toLocaleString('en-IN')} by {record.createdBy}</span>
          {record.lastModifiedAt && record.lastModifiedAt !== record.createdAt && (
            <span>Modified: {new Date(record.lastModifiedAt).toLocaleString('en-IN')} by {record.lastModifiedBy}</span>
          )}
          <span>Schema version: {record.schemaVersion ? new Date(record.schemaVersion).toLocaleString('en-IN') : '—'}</span>
        </div>
      </Card>

      {/* Print preview */}
      <SlipPreview slipId={record.slipNumber} fields={recordFields} payload={record.payload} system={record} company={company} kind="dispatch" />
    </div>
  )
}
