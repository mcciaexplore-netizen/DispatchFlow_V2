import axios from 'axios'
import { useState, useMemo, useRef } from 'react'
import { ScanZone } from '../components/scanner/ScanZone'
import { DynamicForm } from '../components/forms/DynamicForm'
import { SlipPreview } from '../components/preview/SlipPreview'
import { Card, SectionHeader, Divider } from '../components/ui/Card'
import { getSchema } from '../lib/schema'
import { getCompany } from '../lib/config'
import { api } from '../lib/api'
import type { OcrResult, SystemFields } from '../types'

interface SavedDispatchState extends SystemFields {
  payload: Record<string, string>
}

export function CreateDispatch() {
  const fields = useMemo(() => getSchema('dispatch'), [])
  const company = useMemo(() => getCompany(), [])

  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [saved, setSaved] = useState<SavedDispatchState | null>(null)
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const savingRef = useRef(false)

  const locked = false;

  const handleSave = async (payload: Record<string, string>) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)

    setValidationErrors([])
    try {
      const response = await api.post('/dispatches/', {
        transporter_id: null,
        status: 'created',
        raw_ocr_json: payload,
      })
      
      setSaved({
        slipNumber: `DSP-${response.data.id}`,
        payload: response.data.raw_ocr_json || {},
        createdAt: response.data.created_at,
        createdBy: `User ${response.data.tenant_id}`,
        schemaVersion: response.data.created_at,
      })
    } catch (error: unknown) {
      console.error('Failed to save dispatch:', error)
      if (axios.isAxiosError(error) && error.response?.status === 422 && error.response?.data?.detail?.errors) {
        setValidationErrors(error.response.data.detail.errors)
      } else {
        alert('Failed to save dispatch')
      }
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  if (saved) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5">
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="New Dispatch Slip"
          subtitle="Fill manually or scan an existing slip image"
        />
        <button
          type="button"
          onClick={() => {
            setOcrResult({
              status: 'success',
              data: {
                party_name: 'Tata Motors Component Div',
                buyer_name: 'Tata Motors Component Div',
                destination: 'Pune MIDC, Bhosari',
                item_description: 'Precision CNC Machined Shafts 45mm',
                part_name_no: 'SHAFT-CNC-45X',
                part_number: 'SHAFT-CNC-45X',
                quantity: '500',
                gross_weight: '350',
                net_weight: '320',
                roll_count: '10',
                vehicle_no: 'MH-12-RN-4821',
                driver_name: 'Suresh Patil',
                dispatch_date: new Date().toLocaleDateString('en-IN'),
                remarks: 'Demo scan test - All parameters OK',
              },
              missingRequired: [],
              modelUsed: 'Demo Preset',
              rawResponse: 'Sample Data',
            });
          }}
          className="text-xs px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded font-medium transition-colors flex items-center gap-1"
        >
          <span>📝</span> Fill Demo Data
        </button>
      </div>

      <Card>
        <h3 className="text-base font-heading text-text mb-3">Scan document</h3>
        <ScanZone fields={fields} onResult={setOcrResult} />
      </Card>

      <Divider />

      <Card>
        <h3 className="text-base font-heading text-text mb-4">Dispatch details</h3>
        
        {validationErrors.length > 0 && (
          <div className="mb-4 p-4 rounded bg-danger/10 border border-danger/20 text-danger text-sm">
            <h4 className="font-bold mb-1">Validation Errors</h4>
            <ul className="list-disc pl-5">
              {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <DynamicForm
          fields={fields}
          ocrResult={ocrResult}
          initialValues={{}}
          onSave={handleSave}
          saving={saving}
          locked={locked}
        />
      </Card>
    </div>
  )
}
