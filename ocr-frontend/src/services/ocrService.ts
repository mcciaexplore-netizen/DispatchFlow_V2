/**
 * OCR Backend Service
 * Communicates with the PaddleOCR FastAPI backend.
 */

const API_URL: string = import.meta.env.VITE_OCR_API_URL || ''

const TIMEOUT_MS = 30_000

export interface BackendOcrResult {
  text: string
  confidence: number
  language: string
  lowConfidence: boolean
  processingTimeMs: number
  lines: Array<{ text: string; confidence: number; bbox: number[][] }>
  error: string | null
}

interface BackendResponse {
  text: string
  confidence: number
  language: string
  low_confidence: boolean
  processing_time_ms: number
  lines: Array<{ text: string; confidence: number; bbox: number[][] }>
  error?: string
  detail?: string
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function handleResponse(res: Response): Promise<BackendResponse> {
  if (!res.ok) {
    let detail = `Server error (${res.status})`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {
      // response wasn't JSON
    }
    throw new Error(detail)
  }
  return res.json()
}

function normalizeResult(data: BackendResponse): BackendOcrResult {
  return {
    text: data.text ?? '',
    confidence: data.confidence ?? 0,
    language: data.language ?? 'unknown',
    lowConfidence: Boolean(data.low_confidence),
    processingTimeMs: data.processing_time_ms ?? 0,
    lines: data.lines ?? [],
    error: data.error ?? null,
  }
}

/**
 * Process an image file or blob through the PaddleOCR backend.
 *
 * - File objects -> FormData + /ocr/upload
 * - Blobs without a name -> base64 + /ocr/base64
 */
export async function processImage(file: File | Blob): Promise<BackendOcrResult> {
  if (!API_URL) {
    throw new Error('OCR backend URL not configured (VITE_OCR_API_URL is empty)')
  }
  try {
    if (file instanceof File && file.name) {
      const form = new FormData()
      form.append('file', file)

      const res = await fetchWithTimeout(`${API_URL}/ocr/upload`, {
        method: 'POST',
        body: form,
      })
      const data = await handleResponse(res)
      return normalizeResult(data)
    }

    const base64 = await blobToBase64(file)
    return processBase64(base64, file.type || 'image/jpeg')
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. The server may be busy — please try again.')
    }
    throw new Error(
      err instanceof Error ? err.message : 'Network error. Check your connection and try again.',
    )
  }
}

/**
 * Process a base64-encoded image through the OCR backend.
 * Useful for live camera frame capture.
 */
export async function processBase64(base64String: string, mimeType = 'image/jpeg'): Promise<BackendOcrResult> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/ocr/base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64String, mime_type: mimeType }),
    })
    const data = await handleResponse(res)
    return normalizeResult(data)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. The server may be busy — please try again.')
    }
    throw new Error(
      err instanceof Error ? err.message : 'Network error. Check your connection and try again.',
    )
  }
}

/**
 * Check if the backend is reachable and models are loaded.
 */
export async function checkHealth(): Promise<boolean> {
  if (!API_URL) return false
  try {
    const res = await fetchWithTimeout(`${API_URL}/health`, {})
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'ok' && data.models_loaded === true
  } catch {
    return false
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(blob)
  })
}
