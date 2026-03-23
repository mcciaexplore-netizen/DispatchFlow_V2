import { useState, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ScanZone } from '../components/scanner/ScanZone'
import { DynamicForm } from '../components/forms/DynamicForm'
import { SlipPreview } from '../components/preview/SlipPreview'
import { Card, SectionHeader, Divider } from '../components/ui/Card'
import { getSchema, generateSlipNumber } from '../lib/schema'
import { enqueueRecord } from '../lib/syncWorker'
import { useSessionStore } from '../store/sessionStore'
import { LS } from '../constants/storage'
import { db } from '../db'
import { getCompany, getSessionConfig } from '../lib/config'
import type { OcrResult, DispatchRecord, OcrLineItem } from '../types'

function isEditable(record: DispatchRecord, graceMins: number): boolean {
  if (graceMins === 0) return true
  const diff = (Date.now() - new Date(record.createdAt).getTime()) / 60000
  return diff <= graceMins
}

export function CreateDispatch() {
  const { slipId }    = useParams<{ slipId?: string }>()
  const currentOp     = useSessionStore(s => s.currentOperator)

  const fields        = useMemo(() => getSchema('dispatch'), [])
  const company       = useMemo(getCompany, [])
  const sessionConfig = useMemo(getSessionConfig, [])

  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [saved, setSaved]         = useState<DispatchRecord | null>(null)
  const [saving, setSaving]       = useState(false)
  const savingRef                 = useRef(false)

  // Load existing record for edit
  const existingRecord = useLiveQuery(
    async () => slipId ? db.dispatch.where('slipNumber').equals(slipId).first() : undefined,
    [slipId]
  )

  const isEditMode = !!existingRecord
  const locked     = isEditMode && !isEditable(existingRecord!, sessionConfig.gracePeriodMinutes)

  const handleSave = async (payload: Record<string, string>) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const now = new Date().toISOString()

    const lineItemsJson = payload['_line_items']
    const dbPayload = { ...payload }

    if (isEditMode && existingRecord) {
      await db.dispatch.update(existingRecord.id!, {
        payload: dbPayload,
        lastModifiedAt: now,
        lastModifiedBy: currentOp,
        editedWithin: true,
      })
      const updated = await db.dispatch.get(existingRecord.id!)!
      setSaved(updated!)
      await enqueueLineItems(existingRecord.slipNumber, dbPayload, lineItemsJson, {
        slipNumber: existingRecord.slipNumber, createdAt: existingRecord.createdAt, createdBy: existingRecord.createdBy,
      })
    } else {
      const slipNumber    = generateSlipNumber()
      const schemaVersion = localStorage.getItem(LS.DISPATCH_SCHEMA_VER) ?? now
      const record: DispatchRecord = {
        slipNumber,
        createdAt: now,
        createdBy: currentOp || 'Unknown',
        schemaVersion,
        lastModifiedAt: now,
        lastModifiedBy: currentOp || 'Unknown',
        payload: dbPayload,
        recordType: 'dispatch',
      }
      await db.dispatch.add(record)
      const saved = await db.dispatch.where('slipNumber').equals(slipNumber).first()
      setSaved(saved!)
      await enqueueLineItems(slipNumber, dbPayload, lineItemsJson, {
        slipNumber, createdAt: now, createdBy: currentOp,
      })
    }

    setSaving(false)
    savingRef.current = false
  }

  async function enqueueLineItems(
    recordId: string,
    payload: Record<string, string>,
    lineItemsJson: string | undefined,
    system: Record<string, string | undefined>,
  ) {
    const headerPayload = { ...payload }
    delete headerPayload['_line_items']

    let items: OcrLineItem[] = []
    if (lineItemsJson) {
      try { items = JSON.parse(lineItemsJson) } catch { /* ignore */ }
    }

    if (items.length > 1) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const rowPayload: Record<string, string> = {
          ...headerPayload,
          ...system as Record<string, string>,
          item_number: String(i + 1),
          item_name: item.item_name ?? '',
          item_description: item.item_name ?? '',
          quantity: item.quantity ?? '',
          unit: item.unit ?? '',
          rate: item.rate ?? '',
          gst_percentage: item.gst_percentage ?? '',
          item_total: item.total_amount ?? '',
        }
        await enqueueRecord({ recordId: `${recordId}_item${i + 1}`, recordType: 'dispatch', payload: rowPayload })
      }
    } else {
      await enqueueRecord({ recordId, recordType: 'dispatch', payload: { ...headerPayload, ...system as Record<string, string> } })
    }
  }

  if (saved) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-success font-medium text-sm">✓ Record saved</div>
            <h1 className="text-2xl font-heading text-text">{saved.slipNumber}</h1>
          </div>
          <button onClick={() => { setSaved(null); setOcrResult(null) }} className="text-accent underline text-sm min-h-touch flex items-center">
            + New slip
          </button>
        </div>
        <SlipPreview slipId={saved.slipNumber} fields={fields} payload={saved.payload} system={saved} company={company} kind="dispatch" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      <SectionHeader
        title={isEditMode ? `Edit ${existingRecord?.slipNumber}` : 'New Dispatch Slip'}
        subtitle={isEditMode && locked ? 'Edit window closed' : 'Scan a dispatch tag or fill manually'}
      />

      {/* Scan zone */}
      {!locked && (
        <Card>
          <h3 className="text-base font-heading text-text mb-3">Scan document</h3>
          <ScanZone fields={fields} onResult={setOcrResult} />
        </Card>
      )}

      <Divider />

      {/* Form */}
      <Card>
        <h3 className="text-base font-heading text-text mb-4">Dispatch details</h3>
        <DynamicForm
          fields={fields}
          ocrResult={ocrResult}
          initialValues={existingRecord?.payload ?? {}}
          onSave={handleSave}
          saving={saving}
          locked={locked}
        />
      </Card>
    </div>
  )
}
