import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { SchemaField, OcrResult, OcrLineItem } from '../../types'

// Keys that represent per-item fields (these get replaced by the items table)
const ITEM_LEVEL_KEYS = new Set([
  'item_description', 'item_name', 'hsn_sac_code',
  'quantity', 'unit', 'rate',
])

interface Props {
  fields: SchemaField[]
  ocrResult: OcrResult | null
  initialValues?: Record<string, string>
  onSave: (payload: Record<string, string>) => Promise<void>
  saving?: boolean
  locked?: boolean
}

export function DynamicForm({ fields, ocrResult, initialValues, onSave, saving, locked }: Props) {
  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<Record<string, string>>({
    defaultValues: initialValues ?? {},
  })

  const [ocrFilledKeys, setOcrFilledKeys] = useState<Set<string>>(new Set())
  const [warnModal, setWarnModal] = useState<{ open: boolean; missing: string[] }>({ open: false, missing: [] })
  const [lineItems, setLineItems] = useState<OcrLineItem[]>([])
  const [showItems, setShowItems] = useState(false)

  // Apply OCR results to form
  useEffect(() => {
    if (!ocrResult || ocrResult.status === 'failed') return
    const filled = new Set<string>()
    fields.forEach(f => {
      const val = ocrResult.data[f.key]
      if (val) {
        setValue(f.key, val, { shouldDirty: true })
        filled.add(f.key)
      }
    })
    const timer1 = setTimeout(() => {
      setOcrFilledKeys(filled)
      if (ocrResult.items && ocrResult.items.length > 1) {
        setLineItems(ocrResult.items)
        setShowItems(true)
      } else {
        setLineItems([])
        setShowItems(false)
      }
    }, 0)
    const timer2 = setTimeout(() => setOcrFilledKeys(new Set()), 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [ocrResult, fields, setValue])

  const hasMultipleItems = lineItems.length > 1

  // When saving, serialize line items into payload
  const handleSaveAttempt: SubmitHandler<Record<string, string>> = async (data) => {
    const missing = fields.filter(f => f.required && !data[f.key]?.trim())
    if (missing.length > 0) {
      setWarnModal({ open: true, missing: missing.map(f => f.label) })
      return
    }
    if (hasMultipleItems) {
      data['_line_items'] = JSON.stringify(lineItems)
    }
    await onSave(data)
  }

  const handleSaveAnyway = async () => {
    setWarnModal({ open: false, missing: [] })
    const data = getValues()
    if (hasMultipleItems) {
      data['_line_items'] = JSON.stringify(lineItems)
    }
    await onSave(data)
  }

  const updateLineItem = (index: number, key: keyof OcrLineItem, value: string) => {
    setLineItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }
      return updated
    })
  }

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      <form onSubmit={handleSubmit(handleSaveAttempt)} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(field => {
            // Hide per-item fields when we have a multi-item table
            if (hasMultipleItems && showItems && ITEM_LEVEL_KEYS.has(field.key)) {
              return null
            }

            const isOcrFilled = ocrFilledKeys.has(field.key)
            const error       = errors[field.key]?.message

            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted font-body">
                  {field.label}
                  {field.required && <span className="text-danger ml-1">*</span>}
                </label>
                <input
                  type={field.type === 'date' ? 'text' : field.type === 'number' ? 'number' : 'text'}
                  step={field.type === 'number' ? 'any' : undefined}
                  disabled={locked}
                  placeholder={field.type === 'date' ? 'DD/MM/YYYY' : `Enter ${field.label.toLowerCase()}`}
                  {...register(field.key, {
                    validate: () => true,
                  })}
                  className={[
                    'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-text font-body text-sm',
                    'border-border/90 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg min-h-[42px] transition-all shadow-2xs placeholder:text-muted/40',
                    isOcrFilled ? 'ocr-filled border-l-[4px] border-l-accent ring-2 ring-accent/20' : '',
                    error ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
                  ].join(' ')}
                />
                {error && <p className="text-xs text-danger font-medium">{error}</p>}
              </div>
            )
          })}
        </div>

        {/* Multi-item line items table */}
        {hasMultipleItems && showItems && (
          <div className="flex flex-col gap-3.5 border border-accent/30 bg-accent/5 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-accent/20">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  {lineItems.length}
                </span>
                <div>
                  <h4 className="text-sm font-heading font-extrabold text-text">
                    Multi-Line Items Detected
                  </h4>
                  <p className="text-xs text-muted">Auto-parsed individual items with quantity and unit rates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItems(false)}
                className="text-xs text-muted hover:text-text underline"
              >
                Switch to Single Item View
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {lineItems.map((item, idx) => (
                <div key={idx} className="bg-surface border border-border/90 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent uppercase tracking-wider">
                      Item #{idx + 1}
                    </span>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="text-xs text-danger hover:underline font-semibold"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">Item Description</label>
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={e => updateLineItem(idx, 'item_name', e.target.value)}
                      disabled={locked}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[38px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted">Qty</label>
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                        disabled={locked}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[38px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => updateLineItem(idx, 'unit', e.target.value)}
                        disabled={locked}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[38px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted">Rate (₹)</label>
                      <input
                        type="text"
                        value={item.rate}
                        onChange={e => updateLineItem(idx, 'rate', e.target.value)}
                        disabled={locked}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[38px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted">Total (₹)</label>
                      <input
                        type="text"
                        value={item.total_amount}
                        onChange={e => updateLineItem(idx, 'total_amount', e.target.value)}
                        disabled={locked}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[38px] font-semibold font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed items notice */}
        {hasMultipleItems && !showItems && (
          <button
            type="button"
            onClick={() => setShowItems(true)}
            className="text-xs font-bold text-accent hover:underline text-left px-3 py-2 bg-accent/10 rounded-xl border border-accent/20 flex items-center gap-2"
          >
            <span>📦</span> Show {lineItems.length} detected multi-line items
          </button>
        )}

        {locked ? (
          <div className="text-xs text-muted bg-surface border border-border rounded-xl px-4 py-3 font-semibold flex items-center gap-2">
            <span>🔒</span> Edit window closed — this record can no longer be modified.
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="submit" variant="primary" size="lg" loading={saving} className="shadow-md rounded-xl font-bold px-8">
              ✓ Save Record & Generate Slip
            </Button>
          </div>
        )}
      </form>

      <Modal
        open={warnModal.open}
        onClose={() => setWarnModal({ open: false, missing: [] })}
        title="Required fields missing"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWarnModal({ open: false, missing: [] })}>Go back and fill</Button>
            <Button variant="danger" onClick={handleSaveAnyway}>Save anyway</Button>
          </>
        }
      >
        <p className="text-sm text-text mb-2">The following required fields are empty:</p>
        <ul className="list-disc ml-5 text-sm text-danger space-y-0.5">
          {warnModal.missing.map(m => <li key={m}>{m}</li>)}
        </ul>
        <p className="text-sm text-muted mt-2">Saving with empty required fields may create incomplete records.</p>
      </Modal>
    </>
  )
}
