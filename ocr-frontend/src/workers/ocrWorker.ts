// STEP 2a — Tesseract.js Web Worker
// Runs OCR off the main thread so UI stays responsive.

import Tesseract from 'tesseract.js'

export interface OcrWorkerRequest {
  type: 'run'
  imageBuffer: ArrayBuffer
  langs: string
}

export interface OcrWordInfo {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface OcrWorkerResponse {
  type: 'result' | 'error' | 'progress'
  text?: string
  confidence?: number
  words?: OcrWordInfo[]
  error?: string
  progress?: number
}

let worker: Tesseract.Worker | null = null

async function getWorker(langs: string): Promise<Tesseract.Worker> {
  if (worker) return worker
  worker = await Tesseract.createWorker(langs, undefined, {
    cacheMethod: 'write',
  })
  return worker
}

self.onmessage = async (e: MessageEvent<OcrWorkerRequest>) => {
  const { imageBuffer, langs } = e.data

  try {
    const w = await getWorker(langs)
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' })

    const result = await w.recognize(blob)
    const data = result.data as unknown as Record<string, unknown>

    // Extract word-level info — tesseract.js exposes paragraphs > lines > words
    const words: OcrWordInfo[] = []
    const paragraphs = data.paragraphs as Array<{ lines?: Array<{ words?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> }> }> | undefined
    if (paragraphs) {
      for (const para of paragraphs) {
        if (para.lines) {
          for (const line of para.lines) {
            if (line.words) {
              for (const word of line.words) {
                words.push({
                  text: word.text,
                  confidence: word.confidence,
                  bbox: word.bbox,
                })
              }
            }
          }
        }
      }
    }

    const response: OcrWorkerResponse = {
      type: 'result',
      text: data.text as string,
      confidence: data.confidence as number,
      words,
    }
    self.postMessage(response)
  } catch (err) {
    const response: OcrWorkerResponse = {
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(response)
  }
}
