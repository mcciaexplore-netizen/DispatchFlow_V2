import { useState, useRef } from 'react'
import { TEMPLATES, type TemplateId } from '../constants/schemaTemplates'
import { SchemaEditor } from '../components/schema/SchemaEditor'
import { saveSchema } from '../lib/schema'
import { savePin } from '../lib/pinAuth'
import { LS } from '../constants/storage'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { getApiConfig } from '../lib/config'
import { importSettings } from '../lib/settingsExport'
import type { SchemaField, CompanyConfig, ApiConfig, SessionConfig, BackupConfig } from '../types'

const TOTAL_STEPS = 4

// ── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const stepTitles = ['Company Identity', 'Field Template', 'Review Fields', 'Cloud Sync']
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2 px-2">
        {stepTitles.map((title, i) => (
          <span
            key={title}
            className={`text-xs font-medium hidden sm:inline ${
              i + 1 === current
                ? 'text-primary font-bold'
                : i + 1 < current
                ? 'text-accent'
                : 'text-muted'
            }`}
          >
            {i + 1}. {title}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-0">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const step = i + 1
          const done    = step < current
          const active  = step === current
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className={[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
                done   ? 'bg-accent text-white shadow-sm ring-2 ring-accent/20' :
                active ? 'bg-primary text-white shadow-md ring-4 ring-primary/20 scale-105' :
                         'bg-surface border-2 border-border text-muted',
              ].join(' ')}>
                {done ? '✓' : step}
              </div>
              {step < TOTAL_STEPS && (
                <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${done ? 'bg-accent' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
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

  const fillSampleData = () => {
    setName('Mahratta Precision Auto Components Ltd')
    setGst('27AAACM1234F1Z5')
    setAddress('Plot No. 45, Bhosari MIDC, Pune, Maharashtra 411026')
    setPin('1234')
    setPinConfirm('1234')
    setErrors({})
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
        <div>
          <h2 className="text-2xl font-heading text-text font-bold">Company Identity</h2>
          <p className="text-sm text-muted mt-0.5">This information appears on all printed dispatch slips & invoices.</p>
        </div>
        <button
          type="button"
          onClick={fillSampleData}
          className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1.5"
        >
          <span>✨</span> Auto-Fill Sample Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Company Name" required value={name} onChange={e => setName(e.target.value)} error={errors.name} placeholder="e.g. Acme Industries Pvt Ltd" />
        <Input label="GST Number" required value={gst} onChange={e => setGst(e.target.value.toUpperCase())} error={errors.gst} placeholder="27AABCU9603R1ZM" className="font-mono uppercase" />
      </div>

      <Input label="Registered Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Plot 12, MIDC Industrial Area, Pune 411018" />

      <div>
        <label className="block text-sm font-medium text-muted mb-1.5 font-body">Company Logo <span className="text-muted/70 font-normal">(optional)</span></label>
        <div className="flex items-center gap-4">
          <div className="h-14 w-28 rounded-lg border-2 border-dashed border-border bg-bg/50 flex items-center justify-center p-1 overflow-hidden">
            {logo ? (
              <img src={logo} alt="logo" className="h-full w-full object-contain" />
            ) : (
              <img src="/mccia-logo.svg" alt="MCCIA default" className="h-10 w-auto opacity-70 object-contain" />
            )}
          </div>
          <label className="cursor-pointer px-3.5 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-text hover:border-primary hover:text-primary transition-all shadow-sm min-h-touch flex items-center">
            {logo ? 'Change logo' : 'Upload custom logo'}
            <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-base font-heading font-semibold text-text mb-0.5">Set Admin Security PIN</h3>
        <p className="text-xs text-muted mb-3">Required to access Settings, modify schemas, or export sensitive archives.</p>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Input label="PIN (4–8 digits)" type="password" inputMode="numeric" maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} error={errors.pin} placeholder="••••" className="font-mono tracking-widest text-center text-lg" />
          <Input label="Confirm PIN" type="password" inputMode="numeric" maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))} error={errors.pinConfirm} placeholder="••••" className="font-mono tracking-widest text-center text-lg" />
        </div>
      </div>

      <Button variant="primary" size="lg" className="self-end mt-2 shadow-md hover:shadow-lg" onClick={() => { if (validate()) onNext({ name, gst, address, logoBase64: logo }, pin) }}>
        Continue to Templates →
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
  const [step, setStep]   = useState(1)
  const settingsFileRef   = useRef<HTMLInputElement>(null)
  const [settingsImporting, setSettingsImporting] = useState(false)
  const [settingsError, setSettingsError]         = useState('')

  const handleSettingsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSettingsImporting(true)
    setSettingsError('')
    try {
      await importSettings(file)
      window.location.replace('/')
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Import failed')
      setSettingsImporting(false)
      e.target.value = ''
    }
  }

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

    // Full reload so App re-evaluates isSetupComplete()
    window.location.replace('/')
  }

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center pt-4 sm:pt-6 pb-12 px-3 sm:px-6">
      <div className="w-full max-w-4xl">
        {/* Header with MCCIA Logo */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-3 bg-surface px-5 py-3 rounded-2xl border border-border/80 shadow-sm">
            <img src="/mccia-logo.svg" alt="MCCIA" className="h-12 w-auto object-contain" />
            <div className="h-8 w-px bg-border mx-1" />
            <div className="flex flex-col text-left">
              <span className="text-xl font-heading font-extrabold text-primary tracking-tight leading-tight">
                MCCIA DispatchFlow
              </span>
              <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">
                MSME Document Automation
              </span>
            </div>
          </div>
          <p className="text-sm text-muted max-w-md">
            Welcome to the Smart OCR-powered document processing portal. Complete your setup in just 2 minutes.
          </p>
        </div>

        {/* Import settings from another device */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted whitespace-nowrap">Already set up on another device?</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button variant="secondary" size="sm" onClick={() => settingsFileRef.current?.click()} loading={settingsImporting}>
            📥 Import settings from backup file
          </Button>
          <input ref={settingsFileRef} type="file" accept=".json" className="sr-only" onChange={handleSettingsImport} />
          {settingsError && <p className="text-xs text-danger">{settingsError}</p>}
        </div>

        <StepBar current={step} />

        <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
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
        </div>
      </div>
    </div>
  )
}

