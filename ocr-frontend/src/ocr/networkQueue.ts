// STEP 3 — Offline IndexedDB-backed OCR job queue
// Enqueues OCR jobs when offline, drains when connectivity returns.

import { openDB, type IDBPDatabase } from 'idb'
import type { SchemaField } from '../types'

const DB_NAME = 'ocr-queue'
const DB_VERSION = 1
const STORE = 'jobs'
const MAX_QUEUE_SIZE = 50

export interface OcrJob {
  id?: number
  imageBuffer: ArrayBuffer
  schemaFields: SchemaField[]
  createdAt: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        }
      },
    })
  }
  return dbPromise
}

/**
 * Enqueue an OCR job for later processing. Stores the image as ArrayBuffer
 * alongside schema metadata. Evicts oldest jobs if queue exceeds 50.
 *
 * @param job - The OCR job to enqueue (imageBlob converted to ArrayBuffer + schema)
 */
export async function enqueue(job: { imageBlob: Blob; schemaFields: SchemaField[] }): Promise<void> {
  const db = await getDb()
  const buffer = await job.imageBlob.arrayBuffer()

  const entry: Omit<OcrJob, 'id'> = {
    imageBuffer: buffer,
    schemaFields: job.schemaFields,
    createdAt: new Date().toISOString(),
  }

  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  await store.add(entry)

  // Evict oldest if over max
  const count = await store.count()
  if (count > MAX_QUEUE_SIZE) {
    const cursor = await store.openCursor()
    let toDelete = count - MAX_QUEUE_SIZE
    let c = cursor
    while (c && toDelete > 0) {
      await c.delete()
      toDelete--
      c = await c.continue()
    }
  }
  await tx.done
}

/**
 * Get all pending jobs from the queue, ordered oldest first.
 */
export async function getAllJobs(): Promise<OcrJob[]> {
  const db = await getDb()
  return db.getAll(STORE)
}

/**
 * Remove a completed job from the queue by id.
 */
export async function removeJob(id: number): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

/**
 * Get the number of pending OCR jobs in the queue.
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE)
}

/**
 * Process all pending jobs using the provided processor function.
 * Called automatically when coming back online.
 *
 * @param processor - Function that processes a single OCR job
 */
export async function drainQueue(
  processor: (imageBlob: Blob, schemaFields: SchemaField[]) => Promise<void>,
): Promise<void> {
  const jobs = await getAllJobs()
  for (const job of jobs) {
    try {
      const blob = new Blob([job.imageBuffer], { type: 'image/jpeg' })
      await processor(blob, job.schemaFields)
      if (job.id != null) await removeJob(job.id)
    } catch {
      // Leave failed jobs in queue for next drain attempt
    }
  }
}

/** Registered listener cleanup function */
let cleanupListener: (() => void) | null = null

/**
 * Register an online listener that drains the queue when connectivity returns.
 *
 * @param processor - The function to process each queued job
 */
export function registerOnlineListener(
  processor: (imageBlob: Blob, schemaFields: SchemaField[]) => Promise<void>,
): void {
  if (cleanupListener) cleanupListener()

  const handler = () => { drainQueue(processor).catch(console.error) }
  window.addEventListener('online', handler)
  cleanupListener = () => window.removeEventListener('online', handler)
}
