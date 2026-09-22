import Dexie, { type Table } from 'dexie';
import type {
  DispatchRecord,
  InvoiceRecord,
  SyncQueueEntry,
  SyncLogEntry,
  SchemaArchiveEntry,
} from '../types';

export class DispatchFlowDB extends Dexie {
  dispatch!: Table<DispatchRecord, number>;
  invoice!: Table<InvoiceRecord, number>;
  syncQueue!: Table<SyncQueueEntry, number>;
  syncLog!: Table<SyncLogEntry, number>;
  schemaArchive!: Table<SchemaArchiveEntry, number>;

  constructor() {
    super('DispatchFlowDB');
    this.version(1).stores({
      dispatch: '++id, slipNumber, createdAt, createdBy, schemaVersion, date, syncStatus, isDraft',
      invoice: '++id, slipNumber, createdAt, createdBy, schemaVersion, date, syncStatus, invoiceNumber, isDraft',
      syncQueue: '++id, recordId, timestamp, status',
      syncLog: '++id, timestamp, status, entityType, entityId',
      schemaArchive: '++id, kind, version, [kind+version]'
    });
    this.version(2).stores({
      dispatch: '++id, slipNumber, createdAt, createdBy, schemaVersion, date, syncStatus, isDraft',
      invoice: '++id, slipNumber, createdAt, createdBy, schemaVersion, date, syncStatus, invoiceNumber, isDraft',
      syncQueue: '++id, recordId, timestamp, status',
      syncLog: '++id, timestamp, status, entityType, entityId',
      schemaArchive: '++id, kind, version, [kind+version]'
    });
  }
}

export const db = new DispatchFlowDB();
