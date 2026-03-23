// STEP 2b — Main-thread convenience wrapper for the Tesseract Web Worker
// Communicates with ocrWorker.ts via postMessage.

import type { OcrWorkerRequest, OcrWorkerResponse, OcrWordInfo } from '../workers/ocrWorker'

export interface LocalOcrResult {
  text: string
  confidence: number
  words: OcrWordInfo[]
}

let workerInstance: Worker | null = null

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/ocrWorker.ts', import.meta.url),
      { type: 'module' },
    )
  }
  return workerInstance
}

/**
 * Run local Tesseract OCR on a preprocessed image blob.
 * Executes in a Web Worker so the UI thread is never blocked.
 * Loads eng + hin + mar language packs (downloaded on first use, cached by Tesseract).
 *
 * @param imageBlob - The preprocessed image to recognise
 * @returns Extracted text, overall confidence, and per-word details
 */
export function runLocalOcr(imageBlob: Blob): Promise<LocalOcrResult> {
  return new Promise(async (resolve, reject) => {
    const worker = getWorker()

    const buffer = await imageBlob.arrayBuffer()

    const handler = (e: MessageEvent<OcrWorkerResponse>) => {
      worker.removeEventListener('message', handler)
      worker.removeEventListener('error', errHandler)

      if (e.data.type === 'result') {
        resolve({
          text: e.data.text ?? '',
          confidence: e.data.confidence ?? 0,
          words: e.data.words ?? [],
        })
      } else if (e.data.type === 'error') {
        reject(new Error(e.data.error ?? 'Local OCR failed'))
      }
    }

    const errHandler = (err: ErrorEvent) => {
      worker.removeEventListener('message', handler)
      worker.removeEventListener('error', errHandler)
      reject(new Error(err.message ?? 'Worker error'))
    }

    worker.addEventListener('message', handler)
    worker.addEventListener('error', errHandler)

    const msg: OcrWorkerRequest = {
      type: 'run',
      imageBuffer: buffer,
      langs: 'eng',
    }
    worker.postMessage(msg, [buffer])
  })
}

/**
 * Terminate the Web Worker and free resources.
 */
export function terminateLocalOcr(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
}
