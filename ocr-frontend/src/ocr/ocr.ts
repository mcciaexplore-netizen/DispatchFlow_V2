// STEP 7 — OCR Orchestrator
// Coordinates: cache → preprocess → PaddleOCR backend → cloud OCR → parse → merge → cache
// PaddleOCR backend replaces Tesseract for raw text extraction (better Hindi/Marathi support).
// Falls back to Tesseract if backend is unreachable.

import { preprocessImage } from './imagePreprocessor'
import { runLocalOcr } from './localOcr'
import { getCached, setCached } from './ocrCache'
import { callCloudOcr } from './ocrCloud'
import { parseAndValidate, type ParsedOcrResult } from './ocrParser'
import { enqueue } from './networkQueue'
import { processImage as backendOcr, checkHealth as checkBackendHealth } from '../services/ocrService'
import type { SchemaField } from '../types'

export type { ParsedOcrResult } from './ocrParser'
export type OcrProgress = 'checking-cache' | 'preprocessing' | 'local-ocr' | 'cloud-ocr' | 'done'

// Track whether backend is available (checked once, then cached for 60s)
let _backendAvailable: boolean | null = null
let _backendCheckedAt = 0
const BACKEND_CHECK_TTL = 60_000

async function isBackendAvailable(): Promise<boolean> {
  const now = Date.now()
  if (_backendAvailable !== null && now - _backendCheckedAt < BACKEND_CHECK_TTL) {
    return _backendAvailable
  }
  try {
    _backendAvailable = await checkBackendHealth()
  } catch {
    _backendAvailable = false
  }
  _backendCheckedAt = now
  return _backendAvailable
}

// ── Local OCR text cleaning ──────────────────────────────────────────────

/**
 * Strip non-Latin noise from Tesseract output line-by-line.
 */
function cleanLocalText(text: string): string {
  return text
    .split('\n')
    .map(line => {
      // Remove Devanagari + other non-Latin scripts
      let cleaned = line.replace(/[\u0900-\u0DFF]+/g, '').trim()
      // Collapse runs of whitespace
      cleaned = cleaned.replace(/\s{2,}/g, ' ')
      // Remove lines that are mostly garbage (fewer than 3 alphanumeric chars)
      if (cleaned.replace(/[^a-zA-Z0-9]/g, '').length < 3) return ''
      return cleaned
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Clean an extracted field value by removing trailing OCR noise.
 * Tesseract often appends random characters from background smudges,
 * stamps, or shadows after the actual value on the same line.
 */
function cleanFieldValue(raw: string, fieldType: SchemaField['type']): string {
  let val = raw.trim()

  // Remove Devanagari and other non-Latin scripts
  val = val.replace(/[\u0900-\u0DFF]+/g, '').trim()

  if (fieldType === 'number') {
    // Extract the first number (with optional comma/decimal)
    const match = val.match(/[\d,]+\.?\d*/)
    return match ? match[0].replace(/,/g, '') : ''
  }

  if (fieldType === 'date') {
    // Extract DD/MM/YYYY or similar date pattern
    const match = val.match(/\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/)
    return match ? match[0] : ''
  }

  // For text fields: trim trailing garbage
  // Garbage pattern: sequences of random single chars, punctuation, and spaces
  // that don't form meaningful words after the real value.

  // Strategy: find where the meaningful content ends.
  // Split on 2+ consecutive spaces or tab — content after is likely noise from adjacent column/stamp
  const spaceSplit = val.split(/\s{2,}|\t/)
  if (spaceSplit.length > 1) {
    val = spaceSplit[0].trim()
  }

  // Remove trailing sequences of random punctuation/single-chars
  // e.g. "Shree Precision Tools : es La : & ." → "Shree Precision Tools"
  // Pattern: from right, remove segments that are mostly non-alphanumeric or single random chars
  val = val.replace(/(?:\s+[:;|.=&,!?>\-–—]+\s*[\w]{0,2}\s*)+$/, '').trim()
  // Also remove trailing isolated single characters separated by spaces
  val = val.replace(/(\s+[^a-zA-Z0-9\s]\s*)+$/, '').trim()
  val = val.replace(/(\s+\S{1,2})+\s*$/, (match) => {
    // Only strip if the trailing tokens look like noise (mostly non-alpha)
    const tokens = match.trim().split(/\s+/)
    const noiseCount = tokens.filter(t => t.length <= 2 && /[^a-zA-Z0-9]/.test(t)).length
    return noiseCount > tokens.length / 2 ? '' : match
  }).trim()

  return val
}

/**
 * Build a JSON object from local OCR text by matching field labels/keys
 * to lines. Applies per-field-type cleanup to strip noise.
 */
function localTextToJson(text: string, schema: SchemaField[]): string {
  const cleaned = cleanLocalText(text)
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean)
  const result: Record<string, string> = {}
  const usedLines = new Set<number>()

  // First pass: match by label keywords
  for (const field of schema) {
    const labelWords = field.label.toLowerCase().split(/\s+/)
    // Use the most distinctive word (longest) from the label
    const matchWord = labelWords.reduce((a, b) => a.length >= b.length ? a : b, '')

    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue
      const lower = lines[i].toLowerCase()

      // Match if line contains the label's key word
      if (lower.includes(matchWord) && matchWord.length >= 3) {
        const colonIdx = lines[i].indexOf(':')
        if (colonIdx >= 0) {
          const rawVal = lines[i].substring(colonIdx + 1).trim()
          result[field.key] = cleanFieldValue(rawVal, field.type)
          usedLines.add(i)
        }
        break
      }
    }
    if (!result[field.key]) result[field.key] = ''
  }

  // For number fields: try to split "120 PCS" into quantity and unit
  for (const field of schema) {
    if (field.type === 'number' && result[field.key]) {
      const match = result[field.key].match(/^([\d,.]+)\s*(.*)$/)
      if (match) {
        result[field.key] = match[1].replace(/,/g, '')
        // If there's a unit-like field in schema and it's empty, fill it
        const unitField = schema.find(f =>
          f.key.toLowerCase().includes('unit') && !result[f.key]
        )
        if (unitField && match[2]) {
          result[unitField.key] = match[2].trim()
        }
      }
    }
  }

  return JSON.stringify(result)
}

/**
 * Run raw text extraction via PaddleOCR backend, falling back to Tesseract.
 * PaddleOCR handles Hindi/Marathi/English mixed text much better.
 */
async function extractRawText(
  file: File | Blob,
  preprocessed: Blob,
): Promise<{ text: string; source: 'paddle-backend' | 'tesseract' }> {
  // Try PaddleOCR backend first
  const backendUp = await isBackendAvailable()
  if (backendUp) {
    try {
      const result = await backendOcr(file)
      if (result.text) {
        if (import.meta.env.DEV) console.log(`[OCR] PaddleOCR backend: ${result.text.length} chars, conf=${result.confidence}, lang=${result.language}`)
        return { text: result.text, source: 'paddle-backend' }
      }
    } catch (err) {
      console.warn('[OCR] PaddleOCR backend failed, falling back to Tesseract:', err)
      // Invalidate cached health so we re-check next time
      _backendAvailable = null
    }
  }

  // Fallback: Tesseract in Web Worker
  try {
    const localResult = await runLocalOcr(preprocessed)
    return { text: localResult.text, source: 'tesseract' }
  } catch {
    return { text: '', source: 'tesseract' }
  }
}

/**
 * Main OCR pipeline orchestrator.
 *
 * Flow:
 * 1. Cache check → return if hit
 * 2. Preprocess image (contrast, sharpen, resize)
 * 3. Raw text extraction: PaddleOCR backend → Tesseract fallback
 * 4. If offline → enqueue job, return partial local result
 * 5. Cloud OCR (Gemini) with raw text as hint for structured extraction
 * 6. Parse + validate cloud result
 * 7. Cache and return
 *
 * PaddleOCR backend provides much better Hindi/Marathi/English mixed text
 * extraction. Falls back to Tesseract if backend is unreachable.
 *
 * @param file - The source image File or Blob
 * @param schema - SchemaField[] defining expected fields
 * @param onProgress - Optional callback for UI progress updates
 * @returns Parsed and validated OCR result
 */
export async function runOcr(
  file: File | Blob,
  schema: SchemaField[],
  onProgress?: (stage: OcrProgress) => void,
): Promise<ParsedOcrResult> {
  const blob = file instanceof Blob ? file : file as Blob

  // 1. Check cache
  onProgress?.('checking-cache')
  const cached = await getCached(blob)
  if (cached) {
    onProgress?.('done')
    return {
      ...cached,
      confidence: (cached as ParsedOcrResult).confidence ?? {},
      source: (cached as ParsedOcrResult).source ?? 'cloud',
    } as ParsedOcrResult
  }

  // 2. Preprocess image
  onProgress?.('preprocessing')
  let preprocessed: Blob
  try {
    preprocessed = await preprocessImage(file)
  } catch {
    preprocessed = blob
  }

  // 3. Raw text extraction: PaddleOCR backend (preferred) → Tesseract (fallback)
  onProgress?.('local-ocr')
  const { text: rawOcrText, source: ocrSource } = await extractRawText(file, preprocessed)
  // PaddleOCR preserves Devanagari — only clean if from Tesseract
  const hintText = ocrSource === 'tesseract' ? cleanLocalText(rawOcrText) : rawOcrText

  if (import.meta.env.DEV) console.log(`[OCR] Raw text from ${ocrSource}: ${rawOcrText.slice(0, 200)}...`)

  // 4. If offline, enqueue and return partial local result
  if (!navigator.onLine) {
    await enqueue({
      imageBlob: preprocessed,
      schemaFields: schema,
    })

    const localJson = localTextToJson(rawOcrText, schema)
    const partial = parseAndValidate(localJson, schema, 'local')
    partial.status = 'partial'
    partial.rawResponse = 'Offline — queued for cloud processing when connectivity returns.'
    onProgress?.('done')
    return partial
  }

  // 5. Cloud OCR (Gemini) — structured extraction with raw text as hint
  onProgress?.('cloud-ocr')
  try {
    const { text: cloudText, model } = await callCloudOcr(
      preprocessed,
      schema,
      hintText || undefined,
    )

    if (import.meta.env.DEV) {
      console.log('[OCR Cloud Response] length:', cloudText.length, 'starts:', JSON.stringify(cloudText.slice(0, 100)))
      console.log('[OCR Cloud Response] full:', cloudText)
    }

    // 6. Parse cloud result
    const cloudResult = parseAndValidate(cloudText, schema, 'cloud')
    cloudResult.modelUsed = `${model} + ${ocrSource}`
    cloudResult.rawResponse = cloudText

    // 7. Only cache successful/partial results
    if (cloudResult.status !== 'failed') {
      await setCached(blob, cloudResult)
    }
    onProgress?.('done')
    return cloudResult

  } catch (err) {
    const cloudError = err instanceof Error ? err.message : String(err)
    console.error('[OCR Cloud Error]', cloudError)

    // Fallback: try to parse raw OCR text into schema fields
    let fallback: ParsedOcrResult
    try {
      const localJson = localTextToJson(rawOcrText, schema)
      fallback = parseAndValidate(localJson, schema, 'local')
    } catch {
      const emptyData: Record<string, string> = {}
      const emptyConf: Record<string, 'low'> = {}
      schema.forEach(f => { emptyData[f.key] = ''; emptyConf[f.key] = 'low' })
      fallback = {
        status: 'failed',
        data: emptyData,
        missingRequired: schema.filter(f => f.required).map(f => f.key),
        modelUsed: ocrSource,
        rawResponse: '',
        confidence: emptyConf,
        source: 'local',
      }
    }
    fallback.status = 'failed'
    fallback.rawResponse = cloudError
    onProgress?.('done')
    return fallback
  }
}
