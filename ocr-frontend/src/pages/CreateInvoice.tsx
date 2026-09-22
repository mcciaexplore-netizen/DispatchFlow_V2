import { useState, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ScanZone } from '../components/scanner/ScanZone'
import { DynamicForm } from '../components/forms/DynamicForm'
import { SlipPreview } from '../components/preview/SlipPreview'
import { Card, Divider } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

import { getSchema, generateInvoiceId } from '../lib/schema'
import { enqueueRecord } from '../lib/syncWorker'
import { useSessionStore } from '../store/sessionStore'
import { LS } from '../constants/storage'
import { db } from '../db'
import { getCompany, getSessionConfig } from '../lib/config'
import type { OcrResult, InvoiceRecord, OcrLineItem } from '../types'
function isEditable(record: InvoiceRecord, graceMins: number) {
  if (graceMins === 0) return true
  return (Date.now() - new Date(record.createdAt).getTime()) / 60000 <= graceMins
}

export function CreateInvoice() {
  const { invoiceId } = useParams<{ invoiceId?: string }>()
  const currentOp     = useSessionStore(s => s.currentOperator)

  const fields        = useMemo(() => getSchema('invoice'), [])
  const company       = useMemo(() => getCompany(), [])
  const sessionConfig = useMemo(() => getSessionConfig(), [])

  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [saved, setSaved]         = useState<InvoiceRecord | null>(null)
  const [saving, setSaving]       = useState(false)
  const savingRef                 = useRef(false)

  const existingRecord = useLiveQuery(
    async () => invoiceId ? db.invoice.where('slipNumber').equals(invoiceId).first() : undefined,
    [invoiceId]
  )

  const isEditMode = !!existingRecord
  const locked     = isEditMode && !isEditable(existingRecord!, sessionConfig.gracePeriodMinutes)

  const handleSave = async (payload: Record<string, string>) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const now = new Date().toISOString()

    // Extract line items (if any) and build header-only payload for Dexie
    const lineItemsJson = payload['_line_items']
    const dbPayload = { ...payload }

    if (isEditMode && existingRecord) {
      await db.invoice.update(existingRecord.id!, { payload: dbPayload, lastModifiedAt: now, lastModifiedBy: currentOp || undefined, editedWithin: true })
      const updated = await db.invoice.get(existingRecord.id!)
      setSaved(updated!)
      await enqueueLineItems(existingRecord.slipNumber, dbPayload, lineItemsJson, {
        slipNumber: existingRecord.slipNumber, createdAt: existingRecord.createdAt, createdBy: existingRecord.createdBy,
      })
    } else {
      const ivId          = generateInvoiceId()
      const schemaVersion = localStorage.getItem(LS.INVOICE_SCHEMA_VER) ?? now
      const record: InvoiceRecord = { slipNumber: ivId, createdAt: now, createdBy: currentOp || 'Unknown', schemaVersion, lastModifiedAt: now, lastModifiedBy: currentOp || 'Unknown', payload: dbPayload, recordType: 'invoice' }
      await db.invoice.add(record)
      const savedR = await db.invoice.where('slipNumber').equals(ivId).first()
      setSaved(savedR!)
      await enqueueLineItems(ivId, dbPayload, lineItemsJson, {
        slipNumber: ivId, createdAt: now, createdBy: currentOp || undefined,
      })
    }
    setSaving(false)
    savingRef.current = false
  }

  /** Enqueue one row per line item (or a single row if no items) to Google Sheets */
  async function enqueueLineItems(
    recordId: string,
    payload: Record<string, string>,
    lineItemsJson: string | undefined,
    system: Record<string, string | undefined>,
  ) {
    // Strip _line_items from the sheet payload â€” it gets expanded into per-row fields
    const headerPayload = { ...payload }
    delete headerPayload['_line_items']

    let items: OcrLineItem[] = []
    if (lineItemsJson) {
      try { items = JSON.parse(lineItemsJson) } catch { /* ignore */ }
    }

    if (items.length > 1) {
      // One row per item: header fields + item fields
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
        await enqueueRecord({ recordId: `${recordId}_item${i + 1}`, recordType: 'invoice', payload: rowPayload })
      }
    } else {
      // Single item or no items â€” one row
      await enqueueRecord({ recordId, recordType: 'invoice', payload: { ...headerPayload, ...system as Record<string, string> } })
    }
  }

  if (saved) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 sm:p-6 rounded-3xl border border-border/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20 mb-1">
              ✓ GST Tax Invoice Saved
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-text">{saved.slipNumber}</h1>
          </div>
          <Button
            variant="accent"
            size="md"
            onClick={() => { setSaved(null); setOcrResult(null) }}
            className="rounded-xl font-bold shadow-xs"
          >
            + Create Another Invoice
          </Button>
        </div>
        <SlipPreview slipId={saved.slipNumber} fields={fields} payload={saved.payload} system={saved} company={company} kind="invoice" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 sm:p-6 rounded-3xl border border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-text">
              {isEditMode ? `Edit Invoice: ${existingRecord?.slipNumber}` : 'New GST Tax Invoice'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {isEditMode && locked 
              ? 'Edit grace period elapsed — record locked for audit integrity' 
              : 'Scan paper invoice or input line items to generate compliant e-way ready records'}
          </p>
        </div>
      </div>

      {!locked && (
        <Card padding="md" className="rounded-3xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/80">
            <span className="text-accent text-base">📷</span>
            <h3 className="text-sm font-heading font-bold text-text uppercase tracking-wider">Step 1: Document OCR Scan</h3>
          </div>
          <ScanZone fields={fields} onResult={setOcrResult} />
        </Card>
      )}

      <Divider />

      <Card padding="md" className="rounded-3xl">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/80">
          <span className="text-accent text-base">🧾</span>
          <h3 className="text-sm font-heading font-bold text-text uppercase tracking-wider">Step 2: Invoice Particulars & Tax Ledger</h3>
        </div>
        <DynamicForm fields={fields} ocrResult={ocrResult} initialValues={existingRecord?.payload ?? {}} onSave={handleSave} saving={saving} locked={locked} />
      </Card>
    </div>
  )
}

