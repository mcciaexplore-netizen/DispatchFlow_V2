// STEP 5 — Cloud OCR: Gemini Flash (single call with rate limit + backoff)
// No Anthropic — uses only Gemini API with a single model call.

import { LS } from '../constants/storage'
import { blobToBase64 } from './imagePreprocessor'
import type { SchemaField } from '../types'

// Rate limit: minimum 3 seconds between calls
let lastCallTimestamp = 0
const MIN_INTERVAL_MS = 3000

// Retry config: exponential backoff 2s, 4s, 8s
const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000

/**
 * Build the extraction prompt from schema fields and optional local OCR hint.
 * Supports multi-line item extraction for invoices and dispatch slips.
 */
function buildPrompt(fields: SchemaField[], localHint?: string): string {
  const fieldList = fields.map(f => {
    const hint = f.description ? ` (${f.description})` : ''
    const req = f.required ? ' [REQUIRED]' : ''
    return `  "${f.key}"${hint}${req}`
  }).join('\n')

  let prompt = `You are an industrial document OCR assistant for Indian MSME dispatch and invoice operations.

Carefully examine the provided image and extract data into a structured JSON object.

STEP 1: Detect document type — "invoice", "dispatch_slip", or "other".

STEP 2: Extract header-level fields into a flat object with these keys:
${fieldList}

STEP 3: If the document contains a TABLE with MULTIPLE LINE ITEMS (rows of parts, products, services), extract EACH ROW as a separate object in an "items" array.

For each item extract:
  "item_name" — description or name of the item/part/service
  "quantity" — number of units (string, e.g. "45")
  "unit" — unit of measurement (Nos, Kg, Pcs, etc.) or null
  "rate" — price per unit (string, no currency symbol) or null
  "gst_percentage" — GST % for this item or null
  "total_amount" — total for this line item (string, no currency symbol)

STEP 4: Extract "grand_total" — the final payable amount.

Return this EXACT JSON structure:
{
  "document_type": "invoice" | "dispatch_slip" | "other",
  <all header field keys from above>,
  "items": [ { "item_name": "", "quantity": "", "unit": "", "rate": "", "gst_percentage": "", "total_amount": "" } ],
  "grand_total": ""
}

CRITICAL RULES:
- If 5 rows exist in the table, "items" MUST have 5 objects. Do NOT merge rows.
- Multi-line item descriptions belong to ONE item — do NOT split them.
- Use null for any value you cannot read — do NOT guess.
- For dates, use DD/MM/YYYY format.
- For numbers, return the numeric value as a string WITHOUT currency symbols or commas (e.g. "680000" not "INR 6,80,000.00").
- For GST numbers, return the 15-character alphanumeric exactly as printed.
- If there are NO line items (e.g. a simple dispatch slip), set "items" to an empty array [].
- Return ONLY the JSON object — no markdown, no code fences, no explanation.`

  if (localHint) {
    prompt += `\n\nLocal OCR pre-read of the document (may contain errors, use as reference only):\n${localHint}`
  }

  return prompt
}

/**
 * Enforce rate limit — wait until MIN_INTERVAL_MS has passed since last call.
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastCallTimestamp
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed))
  }
  lastCallTimestamp = Date.now()
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Get the Gemini API key from localStorage config.
 */
function getGeminiKey(): string {
  try {
    const raw = localStorage.getItem(LS.API_CONFIG)
    return JSON.parse(raw ?? '{}')?.geminiApiKey ?? ''
  } catch {
    return ''
  }
}

/**
 * Call Gemini Flash — single API call.
 */
async function callGemini(
  apiKey: string,
  base64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  // Try v1beta first (where most models live), fall back to v1
  const versions = ['v1beta', 'v1'] as const
  let lastErr = ''

  for (const version of versions) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      if (import.meta.env.DEV) console.log('[Gemini raw response]', JSON.stringify(data, null, 2))

      const candidate = data?.candidates?.[0]
      const parts = candidate?.content?.parts
      if (!parts || parts.length === 0) throw new Error('No parts in Gemini response')

      // Gemini 2.5 returns "thought" parts (thinking) + regular "text" parts
      // Filter out thought parts — they have a "thought" property set to true
      const outputParts = parts.filter((p: Record<string, unknown>) =>
        p.text != null && !p.thought
      )

      // If all parts are thought parts, fall back to any text part
      const textParts = outputParts.length > 0
        ? outputParts
        : parts.filter((p: Record<string, unknown>) => p.text != null)

      const text = textParts.length > 0 ? textParts[textParts.length - 1].text as string : null
      if (!text) throw new Error('No text in Gemini response')
      return text.trim()
    }

    const err = await res.json().catch(() => ({}))
    lastErr = err?.error?.message ?? `HTTP ${res.status}`

    // If it's a model-not-found error, try next API version
    if (res.status === 404) continue
    // For other errors (quota, auth), don't bother trying v1
    throw new Error(lastErr)
  }

  throw new Error(lastErr)
}

/**
 * Call cloud OCR with a single Gemini API call, rate limiting, and
 * exponential backoff (2s, 4s, 8s on failure, max 3 retries).
 *
 * @param imageBlob - Preprocessed image blob
 * @param schema - Schema fields to extract
 * @param localHint - Optional raw text from local OCR to aid extraction
 * @returns Raw response text and model name
 */
export async function callCloudOcr(
  imageBlob: Blob,
  schema: SchemaField[],
  localHint?: string,
): Promise<{ text: string; model: string }> {
  const apiKey = getGeminiKey()
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Add it in Settings.')
  }

  const { base64, mimeType } = await blobToBase64(imageBlob)
  const prompt = buildPrompt(schema, localHint)

  await enforceRateLimit()

  const errors: string[] = []

  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      const text = await callGemini(apiKey, base64, mimeType, prompt)
      return { text, model: 'gemini-2.5-flash' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[retry ${retry}] ${msg}`)

      if (retry < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retry) // 2s, 4s, 8s
        await sleep(delay)
      }
    }
  }

  throw new Error(`Cloud OCR failed:\n${errors.join('\n')}`)
}
