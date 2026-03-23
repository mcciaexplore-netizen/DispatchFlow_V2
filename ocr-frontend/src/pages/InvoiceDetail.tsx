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

export function InvoiceDetail() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const navigate      = useNavigate()
  const company       = useMemo(getCompany, [])
  const currentFields = useMemo(() => getSchema('invoice'), [])

  const record = useLiveQuery(
    async () => invoiceId ? db.invoice.where('slipNumber').equals(invoiceId).first() : undefined,
    [invoiceId]
  )

  const archivedFields = useLiveQuery(
    async () => record?.schemaVersion ? getArchivedSchema('invoice', record.schemaVersion) : null,
    [record?.schemaVersion]
  )

  const sessionConfig = useMemo(getSessionConfig, [])

  if (!record) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted">{record === null ? 'Invoice not found.' : 'Loading…'}</p>
      <Link to="/invoices/history" className="text-accent underline text-sm mt-2 inline-block">← Back to history</Link>
    </div>
  )

  const canEdit = isEditable(record.createdAt, sessionConfig.gracePeriodMinutes)
  const fields = archivedFields ?? currentFields

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      <SectionHeader
        title={record.slipNumber}
        subtitle={`Created ${new Date(record.createdAt).toLocaleString('en-IN')} by ${record.createdBy}`}
        action={
          <div className="flex gap-2">
            {canEdit && <Button variant="secondary" size="sm" onClick={() => navigate(`/invoices/${record.slipNumber}`)}>✏ Edit</Button>}
            <Button variant="ghost" size="sm" onClick={() => navigate('/invoices/history')}>← History</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Invoice</Badge>
        {record.editedWithin && <Badge variant="accent">Edited</Badge>}
        {!canEdit && <Badge variant="default">🔒 Locked</Badge>}
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.key} className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
              <span className="text-xs uppercase tracking-wide text-muted font-mono">{f.label}</span>
              <span className="text-base text-text font-medium">{record.payload[f.key] || <span className="text-muted italic text-sm">—</span>}</span>
            </div>
          ))}
        </div>
      </Card>

      <Divider />

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

      <SlipPreview slipId={record.slipNumber} fields={fields} payload={record.payload} system={record} company={company} kind="invoice" />
    </div>
  )
}
