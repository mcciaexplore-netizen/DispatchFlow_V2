import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEMPLATES, type TemplateId } from '../constants/schemaTemplates'
import { SchemaEditor } from '../components/schema/SchemaEditor'
import { saveSchema } from '../lib/schema'
import { savePin } from '../lib/pinAuth'
import { LS } from '../constants/storage'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { getApiConfig } from '../lib/config'
import type { SchemaField, CompanyConfig, ApiConfig, SessionConfig, BackupConfig } from '../types'

const TOTAL_STEPS = 4

// ── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1
        const done    = step < current
        const active  = step === current
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-medium transition-colors',
              done   ? 'bg-success text-white' :
              active ? 'bg-accent text-white' :
                       'bg-border text-muted',
            ].join(' ')}>
              {done ? '✓' : step}
            </div>
            {step < TOTAL_STEPS && (
              <div className={`h-0.5 flex-1 mx-1 transition-colors ${done ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Company Identity ───────────────────────────────────────────────
function Step1({ onNext }: { onNext: (company: CompanyConfig, pin: string) => void }) {
  const [name, setName]     = useState('')
  const [gst, setGst]       = useState('')
  const [address, setAddress] = useState('')
  const [logo, setLogo]     = useState<string | undefined>()
  const [pin, setPin]       = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim())      e.name    = 'Company name is required'
    if (!gst.trim())       e.gst     = 'GST number is required'
    if (gst.trim().length !== 15) e.gst = 'GST number must be 15 characters'
    if (pin.length < 4)    e.pin     = 'PIN must be at least 4 digits'
    if (pin !== pinConfirm) e.pinConfirm = 'PINs do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-heading text-text">Company identity</h2>
        <p className="text-sm text-muted mt-1">This information appears on all dispatch slips and invoices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Company Name" required value={name} onChange={e => setName(e.target.value)} error={errors.name} placeholder="Acme Industries Pvt Ltd" />
        <Input label="GST Number" required value={gst} onChange={e => setGst(e.target.value.toUpperCase())} error={errors.gst} placeholder="27AABCU9603R1ZM" className="font-mono" />
      </div>

      <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Plot 12, MIDC Industrial Area, Pune 411018" />

      <div>
        <label className="block text-sm font-medium text-muted mb-1">Company Logo <span className="text-muted font-normal">(optional)</span></label>
        <div className="flex items-center gap-3">
          {logo && <img src={logo} alt="logo" className="h-12 w-12 object-contain rounded border border-border" />}
          <label className="cursor-pointer px-3 py-2 rounded border border-border bg-bg text-sm text-muted hover:border-accent hover:text-text transition-colors min-h-touch flex items-center">
            {logo ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-base font-heading text-text mb-1">Set admin PIN</h3>
        <p className="text-sm text-muted mb-3">Used to access Settings and modify the app configuration.</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="PIN (4–8 digits)" type="password" inputMode="numeric" maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} error={errors.pin} placeholder="••••" className="font-mono tracking-widest text-center" />
          <Input label="Confirm PIN" type="password" inputMode="numeric" maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))} error={errors.pinConfirm} placeholder="••••" className="font-mono tracking-widest text-center" />
        </div>
      </div>

      <Button variant="primary" size="lg" className="self-end" onClick={() => { if (validate()) onNext({ name, gst, address, logoBase64: logo }, pin) }}>
        Continue →
      </Button>
    </div>
  )
}

// ── Step 2: Template Selection ────────────────────────────────────────────
function Step2({ onNext, onBack }: { onNext: (templateId: TemplateId | null) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<TemplateId | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-heading text-text">Choose a field template</h2>
        <p className="text-sm text-muted mt-1">Pre-fills common fields for your industry. You can customise everything in the next step.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={[
              'flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-all card-lift',
              selected === t.id
                ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
                : 'border-border bg-surface hover:border-accent/50',
            ].join(' ')}
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="font-heading text-base text-text">{t.name}</span>
            <span className="text-xs text-muted">{t.dispatch.length} dispatch fields</span>
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">
        Don't see your industry?{' '}
        <button className="text-accent underline" onClick={() => onNext(null)}>Start with blank fields</button>
      </p>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button variant="primary" size="lg" onClick={() => onNext(selected)} disabled={!selected}>
          Continue →
        </Button>
      </div>
    </div>
  )
}

// ── Step 3: Schema Review ─────────────────────────────────────────────────
function Step3({ initialDispatch, initialInvoice, onNext, onBack }: {
  initialDispatch: SchemaField[]
  initialInvoice: SchemaField[]
  onNext: (dispatch: SchemaField[], invoice: SchemaField[]) => void
  onBack: () => void
}) {
  const [tab, setTab] = useState<'dispatch' | 'invoice'>('dispatch')
  const [dispatchFields, setDispatchFields] = useState<SchemaField[]>(initialDispatch)
  const [invoiceFields,  setInvoiceFields]  = useState<SchemaField[]>(initialInvoice)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-heading text-text">Review & edit fields</h2>
        <p className="text-sm text-muted mt-1">Add, remove, or reorder fields. The OCR hint tells the AI what to look for in the image.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-bg rounded-lg border border-border w-fit">
        {(['dispatch', 'invoice'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 rounded text-sm font-body font-medium transition-colors min-h-touch',
              tab === t ? 'bg-accent text-white' : 'text-muted hover:text-text',
            ].join(' ')}
          >
            {t === 'dispatch' ? 'Dispatch Fields' : 'Invoice Fields'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <SchemaEditor
          fields={tab === 'dispatch' ? dispatchFields : invoiceFields}
          onChange={tab === 'dispatch' ? setDispatchFields : setInvoiceFields}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button variant="primary" size="lg" onClick={() => onNext(dispatchFields, invoiceFields)}>
          Continue →
        </Button>
      </div>
    </div>
  )
}

// ── Step 4: Cloud Sync ────────────────────────────────────────────────────
function Step4({ onNext, onBack }: {
  onNext: (api: Partial<ApiConfig>) => void
  onBack: () => void
}) {
  const [appsScriptUrl, setAppsScriptUrl]   = useState('')
  const [sheetsApiKey,   setSheetsApiKey]   = useState('')
  const [spreadsheetId,  setSpreadsheetId]  = useState('')
  const [geminiApiKey,   setGeminiApiKey]   = useState('')
  const [dispatchSheet,  setDispatchSheet]  = useState('Dispatch')
  const [invoiceSheet,   setInvoiceSheet]   = useState('Invoices')
  const [testStatus, setTestStatus]  = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const testConnection = async () => {
    if (!appsScriptUrl) return
    setTestStatus('testing')
    setTestMessage('')
    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ recordType: '_test', payload: { test: true } }),
        redirect: 'follow',
      })
      if (res.ok || res.type === 'opaqueredirect') {
        setTestStatus('ok')
        setTestMessage('Connection successful!')
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (e) {
      setTestStatus('fail')
      setTestMessage(`Connection failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-heading text-text">Cloud sync setup</h2>
        <p className="text-sm text-muted mt-1">Optional but strongly recommended. Without this, data is stored only on this device.</p>
      </div>

      <Card padding="sm" className="border-warning/40 bg-warning/5">
        <p className="text-sm text-warning font-medium">⚠ Without cloud sync, data loss is possible if this browser is cleared.</p>
      </Card>

      <div className="flex flex-col gap-4">
        <Input
          label="Gemini API Key"
          value={geminiApiKey}
          onChange={e => setGeminiApiKey(e.target.value)}
          placeholder="AIza..."
          hint="Get free key from aistudio.google.com — restrict to your domain in Google Cloud Console"
        />

        <div>
          <Input
            label="Apps Script Web App URL"
            value={appsScriptUrl}
            onChange={e => { setAppsScriptUrl(e.target.value); setTestStatus('idle') }}
            placeholder="https://script.google.com/macros/s/..."
            hint="Deploy the provided script as a Web App (Anyone access)"
          />
          {appsScriptUrl && (
            <div className="mt-2 flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={testConnection} loading={testStatus === 'testing'}>
                Test connection
              </Button>
              {testStatus === 'ok'   && <span className="text-sm text-success font-medium">✓ {testMessage}</span>}
              {testStatus === 'fail' && <span className="text-sm text-danger">{testMessage}</span>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Google Sheets API Key (read)" value={sheetsApiKey} onChange={e => setSheetsApiKey(e.target.value)} placeholder="AIza..." />
          <Input label="Spreadsheet ID" value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" className="font-mono text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Dispatch Sheet Tab Name" value={dispatchSheet} onChange={e => setDispatchSheet(e.target.value)} placeholder="Dispatch" />
          <Input label="Invoice Sheet Tab Name"  value={invoiceSheet}  onChange={e => setInvoiceSheet(e.target.value)}  placeholder="Invoices" />
        </div>
      </div>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer hover:text-text">Setup instructions (click to expand)</summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Open <strong>script.google.com</strong> → New project</li>
          <li>Paste the provided Apps Script code (available in Settings after setup)</li>
          <li>Deploy → New deployment → Web app → "Anyone" can access → Copy URL</li>
          <li>Create a Google Sheet, copy the ID from the URL (between /d/ and /edit)</li>
          <li>Enable Sheets API in Google Cloud Console → Create API key → Restrict to HTTP referrer (your domain)</li>
        </ol>
      </details>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onNext({})}>Skip for now</Button>
          <Button variant="primary" size="lg" onClick={() => onNext({ geminiApiKey, appsScriptUrl, sheetsApiKey, spreadsheetId, dispatchSheetName: dispatchSheet, invoiceSheetName: invoiceSheet })}>
            Finish setup →
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Wizard ───────────────────────────────────────────────────────────
export function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep]   = useState(1)

  // Accumulated state
  const [, setCompany]   = useState<CompanyConfig | null>(null)
  const [dispatchFields, setDispatchFields] = useState<SchemaField[]>([])
  const [invoiceFields,  setInvoiceFields]  = useState<SchemaField[]>([])

  const handleStep1 = async (co: CompanyConfig, pin: string) => {
    setCompany(co)
    await savePin(pin)
    localStorage.setItem(LS.COMPANY, JSON.stringify(co))
    setStep(2)
  }

  const handleStep2 = (templateId: TemplateId | null) => {
    if (templateId) {
      const tmpl = TEMPLATES.find(t => t.id === templateId)!
      setDispatchFields(tmpl.dispatch)
      setInvoiceFields(tmpl.invoice)
    }
    setStep(3)
  }

  const handleStep3 = (dispatch: SchemaField[], invoice: SchemaField[]) => {
    setDispatchFields(dispatch)
    setInvoiceFields(invoice)
    setStep(4)
  }

  const handleStep4 = async (api: Partial<ApiConfig>) => {
    // Save schemas
    saveSchema('dispatch', dispatchFields)
    saveSchema('invoice', invoiceFields)

    // Save API config
    const existing = getApiConfig()
    localStorage.setItem(LS.API_CONFIG, JSON.stringify({ ...existing, ...api }))

    // Save defaults
    const sessionConfig: SessionConfig = { adminSessionTimeout: 30, appLockTimeout: 30, gracePeriodMinutes: 30 }
    const backupConfig: BackupConfig    = { retentionMonths: 6, backupDayOfWeek: 1 }
    localStorage.setItem(LS.SESSION_CONFIG, JSON.stringify(sessionConfig))
    localStorage.setItem(LS.BACKUP_CONFIG,  JSON.stringify(backupConfig))

    // Mark setup complete
    localStorage.setItem(LS.SETUP_COMPLETE, 'true')

    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center pt-8 pb-16 px-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-lg">⚡</span>
            </div>
            <span className="text-xl font-heading text-primary tracking-tight">DispatchFlow</span>
          </div>
          <p className="text-sm text-muted">Let's set up your account. Takes about 2 minutes.</p>
        </div>

        <StepBar current={step} />

        <Card padding="lg">
          {step === 1 && <Step1 onNext={handleStep1} />}
          {step === 2 && <Step2 onNext={handleStep2} onBack={() => setStep(1)} />}
          {step === 3 && (
            <Step3
              initialDispatch={dispatchFields}
              initialInvoice={invoiceFields}
              onNext={handleStep3}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && <Step4 onNext={handleStep4} onBack={() => setStep(3)} />}
        </Card>
      </div>
    </div>
  )
}

