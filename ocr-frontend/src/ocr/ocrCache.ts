// STEP 4 — Image hash cache with 24-hour TTL
// Uses SHA-256 hash of image blob as cache key, stored in IndexedDB.

import { openDB, type IDBPDatabase } from 'idb'
import type { OcrResult } from '../types'

const DB_NAME = 'ocr-cache'
const DB_VERSION = 1
const STORE = 'results'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  hash: string
  result: OcrResult
  timestamp: number
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'hash' })
        }
      },
    })
  }
  return dbPromise
}

/**
 * Compute SHA-256 hash of a Blob for use as cache key.
 */
async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Purge cache entries older than 24 hours.
 */
async function purgeExpired(): Promise<void> {
  const db = await getDb()
  const now = Date.now()
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  let cursor = await store.openCursor()
  while (cursor) {
    const entry = cursor.value as CacheEntry
    if (now - entry.timestamp > TTL_MS) {
      await cursor.delete()
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

/**
 * Look up a cached OCR result for the given image blob.
 * Returns null on cache miss. Purges expired entries on every read.
 *
 * @param imageBlob - The image to look up
 * @returns Cached OcrResult or null
 */
export async function getCached(imageBlob: Blob): Promise<OcrResult | null> {
  await purgeExpired()
  const db = await getDb()
  const hash = await hashBlob(imageBlob)
  const entry: CacheEntry | undefined = await db.get(STORE, hash)
  if (!entry) return null
  if (Date.now() - entry.timestamp > TTL_MS) {
    await db.delete(STORE, hash)
    return null
  }
  return entry.result
}

/**
 * Store an OCR result in the cache, keyed by the image blob's SHA-256 hash.
 *
 * @param imageBlob - The source image
 * @param result - The OCR result to cache
 */
export async function setCached(imageBlob: Blob, result: OcrResult): Promise<void> {
  const db = await getDb()
  const hash = await hashBlob(imageBlob)
  const entry: CacheEntry = {
    hash,
    result,
    timestamp: Date.now(),
  }
  await db.put(STORE, entry)
}

/**
 * Clear all cached OCR results.
 */
export async function clearCache(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE)
}
