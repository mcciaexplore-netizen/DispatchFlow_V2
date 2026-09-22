import { LS } from '../constants/storage'

// Keys that represent transferable configuration (excludes runtime/session state)
const TRANSFERABLE_KEYS: Array<keyof typeof LS> = [
  'COMPANY',
  'API_CONFIG',
  'SESSION_CONFIG',
  'BACKUP_CONFIG',
  'DISPATCH_SCHEMA',
  'INVOICE_SCHEMA',
  'DISPATCH_SCHEMA_VER',
  'INVOICE_SCHEMA_VER',
  'ADMIN_PIN_HASH',
]

export interface SettingsExport {
  version: 1
  exportedAt: string
  settings: Record<string, string>
}

export function exportSettings(): void {
  const settings: Record<string, string> = {}
  for (const key of TRANSFERABLE_KEYS) {
    const value = localStorage.getItem(LS[key])
    if (value !== null) settings[LS[key]] = value
  }

  const payload: SettingsExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  a.download = `dispatchflow_settings_${ts}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importSettings(file: File): Promise<void> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as SettingsExport).version !== 1 ||
    typeof (parsed as SettingsExport).settings !== 'object'
  ) {
    throw new Error('Not a valid DispatchFlow settings file')
  }

  const { settings } = parsed as SettingsExport
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'string') {
      localStorage.setItem(key, value)
    }
  }
  // Mark setup as complete so the app knows configuration is present
  localStorage.setItem(LS.SETUP_COMPLETE, 'true')
}
