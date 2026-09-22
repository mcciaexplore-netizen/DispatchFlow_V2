import { useMemo, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { getSchema } from '../lib/schema'
import { SlipPreview } from '../components/preview/SlipPreview'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SectionHeader, Card, Divider } from '../components/ui/Card'
import { getCompany } from '../lib/config'
import type { SystemFields } from '../types'

interface DispatchDetailRecord extends SystemFields {
  id: number
  payload: Record<string, string>
  status: string
}

export function DispatchDetail() {
  const { slipId }  = useParams<{ slipId: string }>()
  const navigate    = useNavigate()
  const company     = useMemo(() => getCompany(), [])
  const currentFields = useMemo(() => getSchema('dispatch'), [])

  const [record, setRecord] = useState<DispatchDetailRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const dispatchId = slipId ? parseInt(slipId.replace('DSP-', '')) : null

  useEffect(() => {
    if (dispatchId) {
      api.get(`/dispatches/${dispatchId}`)
        .then(res => {
          const r = res.data;
          setRecord({
            id: r.id,
            slipNumber: `DSP-${r.id}`,
            createdAt: r.created_at,
            createdBy: `User ${r.tenant_id}`,
            schemaVersion: r.created_at,
            payload: r.raw_ocr_json || {},
            status: r.status,
          })
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [dispatchId])

  const handleStatusChange = async (newStatus: string) => {
    if (!dispatchId || updating) return
    setUpdating(true)
    try {
      const res = await api.put(`/dispatches/${dispatchId}/status`, { status: newStatus })
      setRecord(prev => (prev ? { ...prev, status: res.data.status } : null))
    } catch (err) {
      console.error(err)
      alert("Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading…</div>

  if (!record) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted">Record not found.</p>
      <Link to="/history" className="text-accent underline text-sm mt-2 inline-block">← Back to history</Link>
    </div>
  )

  const recordFields = currentFields

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5">
      <SectionHeader
        title={record.slipNumber}
        subtitle={`Created ${new Date(record.createdAt).toLocaleString('en-IN')} by ${record.createdBy}`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
              ← History
            </Button>
          </div>
        }
      />

      {/* State Machine Transitions */}
      <Card padding="sm">
        <h3 className="text-sm font-heading text-text mb-2 uppercase tracking-wide">Status Workflow</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={record.status === 'created' ? 'accent' : 'default'}>Created</Badge>
          <span className="text-muted">→</span>
          <Badge variant={record.status === 'verified' ? 'accent' : 'default'}>Verified</Badge>
          <span className="text-muted">→</span>
          <Badge variant={record.status === 'loaded' ? 'accent' : 'default'}>Loaded</Badge>
          <span className="text-muted">→</span>
          <Badge variant={record.status === 'shipped' ? 'accent' : 'default'}>Shipped</Badge>
          <span className="text-muted">→</span>
          <Badge variant={record.status === 'delivered' ? 'success' : 'default'}>Delivered</Badge>
        </div>
        
        <div className="mt-4 flex gap-2 flex-wrap">
          {record.status === 'created' && (
             <Button variant="primary" size="sm" onClick={() => handleStatusChange('verified')} disabled={updating}>Mark as Verified</Button>
          )}
          {record.status === 'verified' && (
             <Button variant="primary" size="sm" onClick={() => handleStatusChange('loaded')} disabled={updating}>Mark as Loaded</Button>
          )}
          {record.status === 'loaded' && (
             <Button variant="primary" size="sm" onClick={() => handleStatusChange('shipped')} disabled={updating}>Mark as Shipped</Button>
          )}
          {record.status === 'shipped' && (
             <Button variant="primary" size="sm" onClick={() => handleStatusChange('delivered')} disabled={updating}>Mark as Delivered</Button>
          )}
          {record.status !== 'cancelled' && record.status !== 'delivered' && (
             <Button variant="secondary" size="sm" onClick={() => handleStatusChange('cancelled')} disabled={updating}>Cancel</Button>
          )}
        </div>
      </Card>

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

      {/* Print preview */}
      <SlipPreview slipId={record.slipNumber} fields={recordFields} payload={record.payload} system={record} company={company} kind="dispatch" />
    </div>
  )
}
