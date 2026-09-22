// Central registry of all localStorage keys used by the app.
// Never reference raw string keys outside this file.

export const LS = {
  SETUP_COMPLETE:        'df_setupComplete',
  COMPANY:               'df_company',
  API_CONFIG:            'df_apiConfig',
  SESSION_CONFIG:        'df_sessionConfig',
  BACKUP_CONFIG:         'df_backupConfig',
  DISPATCH_SCHEMA:       'df_dispatchSchema',
  INVOICE_SCHEMA:        'df_invoiceSchema',
  DISPATCH_SCHEMA_VER:   'df_dispatchSchemaVersion',
  INVOICE_SCHEMA_VER:    'df_invoiceSchemaVersion',
  ADMIN_PIN_HASH:        'df_adminPinHash',
  ADMIN_SESSION_START:   'df_adminSessionStart',
  LAST_ACTIVITY:         'df_lastActivity',
  LAST_OPERATOR_SESSION: 'df_lastOperatorSession',
  PENDING_BACKUP:        'df_pendingBackup',
  LAST_BACKUP_DATE:      'df_lastBackupDate',
  RETENTION_DUE:         'df_retentionDue',
} as const

export type LSKey = typeof LS[keyof typeof LS]
