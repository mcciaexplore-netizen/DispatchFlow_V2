// Shared config readers — single source of truth for localStorage config parsing

import { LS } from '../constants/storage'
import type { CompanyConfig, ApiConfig, SessionConfig, BackupConfig } from '../types'

export function getCompany(): CompanyConfig {
  try { return JSON.parse(localStorage.getItem(LS.COMPANY) ?? '{}') }
  catch { return { name: '', gst: '', address: '' } }
}

export function getApiConfig(): Partial<ApiConfig> {
  try { return JSON.parse(localStorage.getItem(LS.API_CONFIG) ?? '{}') }
  catch { return {} }
}

export function getSessionConfig(): SessionConfig {
  try { return JSON.parse(localStorage.getItem(LS.SESSION_CONFIG) ?? '{}') }
  catch { return { adminSessionTimeout: 30, appLockTimeout: 30, gracePeriodMinutes: 30 } }
}

export function getBackupConfig(): BackupConfig {
  try { return JSON.parse(localStorage.getItem(LS.BACKUP_CONFIG) ?? '{}') }
  catch { return { retentionMonths: 6, backupDayOfWeek: 1 } }
}

export function hasAppsScript(): boolean {
  try { return !!JSON.parse(localStorage.getItem(LS.API_CONFIG) ?? '{}')?.appsScriptUrl }
  catch { return false }
}
