import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { SchemaEditor } from '../components/schema/SchemaEditor'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SectionHeader, Divider } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { saveSchema, getSchema } from '../lib/schema'
import { savePin, verifyPin } from '../lib/pinAuth'
import { exportBackup, importBackup, runRetentionSweep } from '../lib/backup'
import { exportSettings, importSettings } from '../lib/settingsExport'
import { forceSyncNow } from '../lib/syncWorker'
import { LS } from '../constants/storage'
import { db } from '../db'
import { getCompany as loadCompany, getApiConfig as loadApiConfig, getSessionConfig as loadSessionConfig, getBackupConfig as loadBackupConfig } from '../lib/config'
import type { CompanyConfig, ApiConfig, SessionConfig, BackupConfig, SchemaField, SyncLogEntry } from '../types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-heading text-text border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  )
}

// ── Apps Script template for copy ────────────────────────────────────────
const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var ss   = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    if (data.payload._test) return ContentService.createTextOutput("ok");
    var tab  = data.recordType === 'invoice' ? 'Invoices' : 'Dispatch';
    var sheet = ss.getSheetByName(tab);
    if (!sheet) {
      // If default "Sheet1" exists and is blank, rename it instead of creating a new tab
      var sheet1 = ss.getSheetByName('Sheet1');
      if (sheet1 && sheet1.getLastRow() === 0) {
        sheet1.setName(tab);
        sheet = sheet1;
      } else {
        sheet = ss.insertSheet(tab);
      }
    }
    var payload = data.payload;
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(Object.keys(payload));
    }
    sheet.appendRow(Object.values(payload));
    return ContentService.createTextOutput("ok");
  } catch(err) {
    return ContentService.createTextOutput("error: " + err.toString());
  }
}`

export function Settings() {
  // ── Company ─────────────────────────────────────────────────────────
  const [company,   setCompany]   = useState<CompanyConfig>(loadCompany)
  const [logoFile,  setLogoFile]  = useState<string | undefined>(company.logoBase64)

  // ── API config ───────────────────────────────────────────────────────
  const [api,      setApi]       = useState<Partial<ApiConfig>>(loadApiConfig)
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({})
  const [testMsg,   setTestMsg]   = useState<Record<string, string>>({})

  // ── Session config ───────────────────────────────────────────────────
  const [session,  setSession]   = useState<SessionConfig>(loadSessionConfig)

  // ── Backup config ────────────────────────────────────────────────────
  const [backupCfg, setBackupCfg] = useState<BackupConfig>(loadBackupConfig)

  // ── PIN change ───────────────────────────────────────────────────────
  const [oldPin,   setOldPin]    = useState('')
  const [newPin,   setNewPin]    = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinMsg,   setPinMsg]    = useState('')

  // ── Schema ───────────────────────────────────────────────────────────
  const [schemaTab, setSchemaTab] = useState<'dispatch' | 'invoice'>('dispatch')
  const [dispatchFields, setDispatchFields] = useState<SchemaField[]>(() => getSchema('dispatch'))
  const [invoiceFields,  setInvoiceFields]  = useState<SchemaField[]>(() => getSchema('invoice'))

  // ── Sync log ─────────────────────────────────────────────────────────
  const syncLog = useLiveQuery(() => db.syncLog.orderBy('id').reverse().limit(20).toArray(), [])

  // ── Import backup ─────────────────────────────────────────────────────
  const importRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [syncing,   setSyncing]   = useState(false)
  const [exporting, setExporting] = useState(false)

  // ── Settings transfer ──────────────────────────────────────────────────
  const settingsImportRef = useRef<HTMLInputElement>(null)
  const [settingsImporting, setSettingsImporting] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  // ── Save helpers ─────────────────────────────────────────────────────
  const saveCompany = () => {
    localStorage.setItem(LS.COMPANY, JSON.stringify({ ...company, logoBase64: logoFile }))
    alert('Company details saved.')
  }

  const saveApiConfig = () => {
    localStorage.setItem(LS.API_CONFIG, JSON.stringify(api))
    alert('API configuration saved.')
  }

  const saveSessionConfig = () => {
    localStorage.setItem(LS.SESSION_CONFIG, JSON.stringify(session))
    alert('Session settings saved.')
  }

  const saveBackupConfig = () => {
    localStorage.setItem(LS.BACKUP_CONFIG, JSON.stringify(backupCfg))
    alert('Backup settings saved.')
  }

  const saveSchemas = () => {
    saveSchema('dispatch', dispatchFields)
    saveSchema('invoice', invoiceFields)
    alert('Schemas saved.')
  }

  const handlePinChange = async () => {
    setPinMsg('')
    if (newPin.length < 4)      { setPinMsg('New PIN must be at least 4 digits'); return }
    if (newPin !== pinConfirm)  { setPinMsg('PINs do not match'); return }
    const ok = await verifyPin(oldPin)
    if (!ok) { setPinMsg('Current PIN is incorrect'); return }
    await savePin(newPin)
    setPinMsg('PIN updated successfully.')
    setOldPin(''); setNewPin(''); setPinConfirm('')
  }

  const testAppsScript = async () => {
    const url = api.appsScriptUrl
    if (!url) return
    setTestStatus(s => ({ ...s, appsScript: 'testing' }))
    try {
      const res = await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ recordType: '_test', payload: { _test: true } }), redirect: 'follow' })
      if (res.type === 'opaque' || res.ok) {
        setTestStatus(s => ({ ...s, appsScript: 'ok' }))
        setTestMsg(m => ({ ...m, appsScript: 'Connection successful' }))
      } else { throw new Error(`HTTP ${res.status}`) }
    } catch (e) {
      setTestStatus(s => ({ ...s, appsScript: 'fail' }))
      setTestMsg(m => ({ ...m, appsScript: e instanceof Error ? e.message : 'Failed' }))
    }
  }

  const testSheetsApi = async () => {
    const { sheetsApiKey, spreadsheetId } = api
    if (!sheetsApiKey || !spreadsheetId) { setTestMsg(m => ({ ...m, sheets: 'API key and Spreadsheet ID are required' })); return }
    setTestStatus(s => ({ ...s, sheets: 'testing' }))
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${sheetsApiKey}&fields=spreadsheetId`
      const res = await fetch(url)
      if (res.ok) { setTestStatus(s => ({ ...s, sheets: 'ok' })); setTestMsg(m => ({ ...m, sheets: 'Sheet accessible' })) }
      else { throw new Error(`HTTP ${res.status}`) }
    } catch (e) {
      setTestStatus(s => ({ ...s, sheets: 'fail' }))
      setTestMsg(m => ({ ...m, sheets: e instanceof Error ? e.message : 'Failed' }))
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('')
    try {
      const result = await importBackup(file)
      setImportMsg(`Import complete: ${result.imported} records added.`)
    } catch (err) {
      setImportMsg(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleForceSync = async () => {
    setSyncing(true)
    await forceSyncNow()
    setSyncing(false)
  }

  const handleRetentionSweep = async () => {
    const deleted = await runRetentionSweep()
    alert(`Retention sweep: ${deleted} old record(s) removed from device.`)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoFile(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSettingsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSettingsImporting(true)
    setSettingsMsg('')
    try {
      await importSettings(file)
      setSettingsMsg('Settings imported. Reloading…')
      setTimeout(() => window.location.replace('/'), 1000)
    } catch (err) {
      setSettingsMsg(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSettingsImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
      <SectionHeader title="Settings" subtitle="Admin access required for all changes." />

      {/* ── Company identity ── */}
      <Section title="Company identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Company Name" required value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
          <Input label="GST Number" value={company.gst} onChange={e => setCompany(c => ({ ...c, gst: e.target.value.toUpperCase() }))} className="font-mono" />
        </div>
        <Input label="Address" value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} />
        <div className="flex items-center gap-3">
          {logoFile && <img src={logoFile} alt="logo" className="h-12 w-auto object-contain rounded border border-border" />}
          <label className="cursor-pointer px-3 py-2 rounded border border-border bg-bg text-sm text-muted hover:border-accent hover:text-text transition-colors min-h-touch flex items-center">
            {logoFile ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
          </label>
        </div>
        <Button variant="primary" size="md" onClick={saveCompany} className="self-start">Save company details</Button>
      </Section>

      <Divider />

      {/* ── API configuration ── */}
      <Section title="API & cloud configuration">
        <Input label="Gemini API Key" value={api.geminiApiKey ?? ''} onChange={e => setApi(a => ({ ...a, geminiApiKey: e.target.value }))} placeholder="AIza..." hint="From aistudio.google.com — restrict to your domain" />

        <div>
          <Input label="Apps Script Web App URL" value={api.appsScriptUrl ?? ''} onChange={e => setApi(a => ({ ...a, appsScriptUrl: e.target.value }))} placeholder="https://script.google.com/macros/s/..." />
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={testAppsScript} loading={testStatus.appsScript === 'testing'}>Test</Button>
            {testStatus.appsScript === 'ok'   && <span className="text-sm text-success">✓ {testMsg.appsScript}</span>}
            {testStatus.appsScript === 'fail' && <span className="text-sm text-danger">{testMsg.appsScript}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input label="Sheets API Key (read)" value={api.sheetsApiKey ?? ''} onChange={e => setApi(a => ({ ...a, sheetsApiKey: e.target.value }))} placeholder="AIza..." />
            <div className="mt-2 flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={testSheetsApi} loading={testStatus.sheets === 'testing'}>Test</Button>
              {testStatus.sheets === 'ok'   && <span className="text-sm text-success">✓ {testMsg.sheets}</span>}
              {testStatus.sheets === 'fail' && <span className="text-sm text-danger">{testMsg.sheets}</span>}
            </div>
          </div>
          <Input label="Spreadsheet ID" value={api.spreadsheetId ?? ''} onChange={e => setApi(a => ({ ...a, spreadsheetId: e.target.value }))} className="font-mono text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Dispatch Sheet Tab" value={api.dispatchSheetName ?? 'Dispatch'} onChange={e => setApi(a => ({ ...a, dispatchSheetName: e.target.value }))} />
          <Input label="Invoice Sheet Tab"  value={api.invoiceSheetName  ?? 'Invoices'} onChange={e => setApi(a => ({ ...a, invoiceSheetName:  e.target.value }))} />
        </div>

        <Button variant="primary" size="md" onClick={saveApiConfig} className="self-start">Save API config</Button>

        {/* Apps Script code snippet */}
        <details>
          <summary className="cursor-pointer text-sm text-muted hover:text-text">Copy Apps Script code</summary>
          <pre className="mt-2 text-xs font-mono bg-bg border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap">{APPS_SCRIPT_CODE}</pre>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(APPS_SCRIPT_CODE)}>Copy to clipboard</Button>
        </details>
      </Section>

      <Divider />

      {/* ── Schema editor ── */}
      <Section title="Field schema">
        <div className="flex gap-1 p-1 bg-bg rounded-lg border border-border w-fit">
          {(['dispatch', 'invoice'] as const).map(t => (
            <button key={t} onClick={() => setSchemaTab(t)}
              className={['px-4 py-2 rounded text-sm font-body transition-colors min-h-touch', schemaTab === t ? 'bg-accent text-white' : 'text-muted hover:text-text'].join(' ')}>
              {t === 'dispatch' ? 'Dispatch' : 'Invoice'}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <SchemaEditor
            fields={schemaTab === 'dispatch' ? dispatchFields : invoiceFields}
            onChange={schemaTab === 'dispatch' ? setDispatchFields : setInvoiceFields}
          />
        </div>
        <Button variant="primary" size="md" onClick={saveSchemas} className="self-start">Save schema</Button>
      </Section>

      <Divider />

      {/* ── Session & access ── */}
      <Section title="Session & access">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Admin timeout</label>
            <select className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent min-h-touch"
              value={session.adminSessionTimeout}
              onChange={e => setSession(s => ({ ...s, adminSessionTimeout: Number(e.target.value) as 15 | 30 | 60 }))}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">App lock after</label>
            <input type="number" min={5} max={480} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent min-h-touch"
              value={session.appLockTimeout}
              onChange={e => setSession(s => ({ ...s, appLockTimeout: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Edit grace period</label>
            <select className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent min-h-touch"
              value={session.gracePeriodMinutes}
              onChange={e => setSession(s => ({ ...s, gracePeriodMinutes: Number(e.target.value) as 0 | 15 | 30 | 60 }))}>
              <option value={0}>Always editable</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={saveSessionConfig} className="self-start">Save session settings</Button>

        {/* PIN change */}
        <div className="border-t border-border pt-4">
          <h3 className="text-base font-heading text-text mb-3">Change admin PIN</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Current PIN" type="password" inputMode="numeric" maxLength={8} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-widest text-center" />
            <Input label="New PIN"     type="password" inputMode="numeric" maxLength={8} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-widest text-center" />
            <Input label="Confirm PIN" type="password" inputMode="numeric" maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-widest text-center" />
          </div>
          {pinMsg && <p className={`text-sm mt-1 ${pinMsg.includes('success') ? 'text-success' : 'text-danger'}`}>{pinMsg}</p>}
          <Button variant="secondary" size="md" onClick={handlePinChange} className="mt-2">Update PIN</Button>
        </div>
      </Section>

      <Divider />

      {/* ── Settings transfer ── */}
      <Section title="Settings transfer">
        <p className="text-sm text-muted">
          Export your configuration (API keys, schemas, company info) as a JSON file to quickly set up this app on another device in the same organisation.
          The admin PIN is included in the export — keep the file secure.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="md" onClick={exportSettings}>
            ↓ Export settings
          </Button>
          <Button variant="secondary" size="md" onClick={() => settingsImportRef.current?.click()} loading={settingsImporting}>
            ↑ Import settings
          </Button>
          <input ref={settingsImportRef} type="file" accept=".json" className="sr-only" onChange={handleSettingsImport} />
        </div>
        {settingsMsg && (
          <p className={`text-sm ${settingsMsg.includes('failed') ? 'text-danger' : 'text-success'}`}>{settingsMsg}</p>
        )}
      </Section>

      <Divider />

      {/* ── Data management ── */}
      <Section title="Data management">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Retain local records (months)</label>
            <input type="number" min={1} max={60} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent min-h-touch"
              value={backupCfg.retentionMonths}
              onChange={e => setBackupCfg(b => ({ ...b, retentionMonths: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Weekly backup day</label>
            <select className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent min-h-touch"
              value={backupCfg.backupDayOfWeek}
              onChange={e => setBackupCfg(b => ({ ...b, backupDayOfWeek: Number(e.target.value) }))}>
              {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={saveBackupConfig} className="self-start">Save backup settings</Button>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="secondary" size="md" onClick={async () => { setExporting(true); await exportBackup(); setExporting(false) }} loading={exporting}>
            ↓ Export backup
          </Button>
          <Button variant="secondary" size="md" onClick={() => importRef.current?.click()} loading={importing}>
            ↑ Import backup
          </Button>
          <input ref={importRef} type="file" accept=".json" className="sr-only" onChange={handleImport} />
          <Button variant="secondary" size="md" onClick={handleForceSync} loading={syncing}>
            ↻ Force sync now
          </Button>
          <Button variant="ghost" size="md" onClick={handleRetentionSweep}>
            🗑 Run retention sweep
          </Button>
        </div>
        {importMsg && <p className={`text-sm ${importMsg.includes('failed') ? 'text-danger' : 'text-success'}`}>{importMsg}</p>}

        {/* Sync log */}
        <div className="mt-2">
          <h3 className="text-sm font-heading text-muted uppercase tracking-wide mb-2">Sync log (last 20)</h3>
          {!syncLog?.length ? (
            <p className="text-xs text-muted">No sync attempts yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {syncLog.map((entry: SyncLogEntry) => (
                <div key={entry.id} className="flex items-center gap-3 text-xs font-mono py-1 border-b border-border/50 last:border-0">
                  <Badge variant={entry.outcome === 'success' ? 'success' : 'danger'}>{entry.outcome}</Badge>
                  <span className="text-muted">{new Date(entry.timestamp).toLocaleString('en-IN')}</span>
                  <span className="text-muted">{entry.recordCount} record(s)</span>
                  {entry.error && <span className="text-danger truncate max-w-xs">{entry.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
