// STEP 6 — Parser & Validator
// Parses structured JSON from cloud OCR, maps to schema fields,
// extracts line items, and assigns per-field confidence levels.

import type { SchemaField, OcrResult, OcrStatus, OcrLineItem } from '../types'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ParsedOcrResult extends OcrResult {
  confidence: Record<string, ConfidenceLevel>
  source: 'local' | 'cloud'
}

/**
 * Strip markdown code fences from LLM output.
 */
function stripFences(raw: string): string {
  return raw.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim()
}

/**
 * Attempt to extract a JSON object from a raw string.
 * Handles: direct parse, regex extraction, truncated JSON repair.
 */
function extractJson(raw: string): Record<string, unknown> {
  const cleaned = stripFences(raw)

  // Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // noop
  }

  // Try to find the outermost JSON object
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch {
      // noop
    }
  }

  // Try to find JSON after thinking/reasoning text
  const lines = cleaned.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const remaining = lines.slice(i).join('\n').trim()
    if (remaining.startsWith('{')) {
      try {
        return JSON.parse(remaining)
      } catch {
        // noop
      }
    }
  }

  // Fix common JSON issues (trailing commas)
  const lastBrace = cleaned.lastIndexOf('}')
  const firstBrace = cleaned.indexOf('{')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1)
    try {
      const fixed = jsonCandidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
      return JSON.parse(fixed)
    } catch {
      // noop
    }
  }

  // Handle truncated JSON (Gemini cut off mid-response)
  if (firstBrace >= 0) {
    let truncated = cleaned.substring(firstBrace)

    // Close any unclosed arrays
    const openBrackets = (truncated.match(/\[/g) || []).length
    const closeBrackets = (truncated.match(/\]/g) || []).length
    if (openBrackets > closeBrackets) {
      // Remove trailing incomplete object inside array
      truncated = truncated.replace(/,?\s*\{[^}]*$/, '')
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        truncated += ']'
      }
    }

    // Remove trailing incomplete key-value pair
    truncated = truncated.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, '')
    // Remove trailing comma
    truncated = truncated.replace(/,\s*$/, '')

    // Close any unclosed braces
    const openCurly = (truncated.match(/\{/g) || []).length
    const closeCurly = (truncated.match(/\}/g) || []).length
    for (let i = 0; i < openCurly - closeCurly; i++) {
      truncated += '}'
    }

    try {
      return JSON.parse(truncated)
    } catch {
      // noop
    }
  }

  throw new Error('Could not extract valid JSON from response')
}

/**
 * Determine confidence level for a field value based on type check and content.
 */
function assessConfidence(value: string, field: SchemaField): ConfidenceLevel {
  if (!value || value.trim() === '') return 'low'

  switch (field.type) {
    case 'number': {
      const num = value.replace(/[,\s]/g, '')
      if (/^\d+(\.\d+)?$/.test(num)) return 'high'
      return 'medium'
    }
    case 'date': {
      if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(value)) return 'high'
      if (/\d{2,4}/.test(value)) return 'medium'
      return 'low'
    }
    default: {
      if (value.length >= 2) return 'high'
      return 'medium'
    }
  }
}

/**
 * Extract line items from the parsed JSON response.
 */
function extractItems(raw: Record<string, unknown>): OcrLineItem[] {
  const items = raw['items']
  if (!Array.isArray(items)) return []

  return items.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      return { item_name: '', quantity: '', unit: '', rate: '', gst_percentage: '', total_amount: '' }
    }
    const obj = item as Record<string, unknown>
    const str = (key: string) => {
      const v = obj[key]
      return (v !== null && v !== undefined) ? String(v) : ''
    }
    return {
      item_name: str('item_name'),
      quantity: str('quantity'),
      unit: str('unit'),
      rate: str('rate'),
      gst_percentage: str('gst_percentage'),
      total_amount: str('total_amount'),
    }
  })
}

/**
 * Parse a raw LLM/OCR response string and validate against the schema.
 * Extracts both flat header fields and multi-row line items.
 */
export function parseAndValidate(
  rawResponse: string,
  schema: SchemaField[],
  source: 'local' | 'cloud',
): ParsedOcrResult {
  try {
    const raw = extractJson(rawResponse)
    if (import.meta.env.DEV) {
      console.log('[OCR Parser] Extracted JSON keys:', Object.keys(raw))
      console.log('[OCR Parser] Schema keys:', schema.map(f => f.key))
    }

    // Build data from raw JSON mapped to schema fields
    const data: Record<string, string> = {}
    const confidence: Record<string, ConfidenceLevel> = {}

    for (const f of schema) {
      const val = raw[f.key]
      const strVal = (val !== null && val !== undefined) ? String(val) : ''
      data[f.key] = strVal
      confidence[f.key] = assessConfidence(strVal, f)
    }

    // Extract line items
    const items = extractItems(raw)
    const grandTotal = raw['grand_total'] != null ? String(raw['grand_total']) : ''
    const documentType = raw['document_type'] != null ? String(raw['document_type']) : ''

    // If items exist, fill empty flat fields from the items (so the form gets populated)
    if (items.length > 0) {
      const itemFieldMap: Record<string, keyof OcrLineItem> = {
        'item_description': 'item_name',
        'item_name': 'item_name',
        'quantity': 'quantity',
        'unit': 'unit',
        'rate': 'rate',
        'hsn_sac_code': 'gst_percentage',
      }

      for (const f of schema) {
        // Only fill if the flat field is empty and we have item data
        if (data[f.key]) continue
        const itemKey = itemFieldMap[f.key]
        if (itemKey) {
          if (items.length === 1) {
            // Single item: use its value directly
            data[f.key] = items[0][itemKey]
          } else {
            // Multiple items: build a summary
            items.map((it, i) => `${i + 1}. ${it[itemKey]}`).filter(v => v !== `${items.indexOf(items[0]) + 1}. `)
            const nonEmpty = items.map(it => it[itemKey]).filter(Boolean)
            if (nonEmpty.length > 0) {
              data[f.key] = itemKey === 'item_name'
                ? items.map((it, i) => `${i + 1}. ${it.item_name}`).join('\n')
                : nonEmpty.join(', ')
            }
          }
          if (data[f.key]) confidence[f.key] = 'high'
        }
      }

      // Fill total_amount from grand_total if empty
      if (!data['total_amount'] && grandTotal) {
        data['total_amount'] = grandTotal
        confidence['total_amount'] = 'high'
      }
    }

    if (import.meta.env.DEV) console.log('[OCR Parser] items:', items.length, '| grand_total:', grandTotal)

    const missingRequired = schema
      .filter(f => f.required && !data[f.key])
      .map(f => f.key)

    const hasAnyData = Object.values(data).some(v => v !== '') || items.length > 0
    let status: OcrStatus = 'failed'
    if (hasAnyData) {
      status = missingRequired.length > 0 ? 'partial' : 'success'
    }

    if (import.meta.env.DEV) console.log('[OCR Parser] status:', status, '| hasAnyData:', hasAnyData, '| missingRequired:', missingRequired)

    return {
      status,
      data,
      missingRequired,
      modelUsed: source,
      rawResponse,
      confidence,
      source,
      items: items.length > 0 ? items : undefined,
      grand_total: grandTotal || undefined,
      document_type: documentType || undefined,
    }
  } catch (err) {
    console.error('[OCR Parser] FAILED:', err)
    const emptyData: Record<string, string> = {}
    const lowConfidence: Record<string, ConfidenceLevel> = {}
    schema.forEach(f => {
      emptyData[f.key] = ''
      lowConfidence[f.key] = 'low'
    })

    return {
      status: 'failed',
      data: emptyData,
      missingRequired: schema.filter(f => f.required).map(f => f.key),
      modelUsed: source,
      rawResponse: err instanceof Error ? err.message : String(err),
      confidence: lowConfidence,
      source,
    }
  }
}
