import { useRef, useState, useCallback, useEffect } from 'react'
import { runOcr, type OcrProgress, type ParsedOcrResult } from '../../ocr/ocr'
import { getPendingCount } from '../../ocr/networkQueue'
import { validateImage } from '../../services/imageUtils'
import { Button } from '../ui/Button'
import type { SchemaField, OcrResult } from '../../types'

interface Props {
  fields: SchemaField[]
  onResult: (result: OcrResult) => void
}

type Mode = 'idle' | 'camera' | 'preview'

const PROGRESS_LABELS: Record<OcrProgress, string> = {
  'checking-cache': 'Checking cache...',
  'preprocessing': 'Optimising image...',
  'local-ocr': 'Running local OCR...',
  'cloud-ocr': 'Verifying with cloud...',
  'done': 'Done',
}

export function ScanZone({ fields, onResult }: Props) {
  const [mode, setMode]         = useState<Mode>('idle')
  const [preview, setPreview]   = useState<string | null>(null)
  const [status, setStatus]     = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const [showRaw, setShowRaw]   = useState(false)
  const [lastRaw, setLastRaw]   = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, string>>({})

  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Poll pending queue count
  useEffect(() => {
    let mounted = true
    const check = async () => {
      const count = await getPendingCount()
      if (mounted) setPendingCount(count)
    }
    check()
    const interval = setInterval(check, 10000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  // ── Camera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setMode('camera')
      setStatus('')
    } catch {
      setStatus('Camera access denied. Please use file upload instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setMode('idle')
  }, [])

  const captureFrame = useCallback((): Promise<File | null> => {
    const video  = videoRef.current
    if (!video) return Promise.resolve(null)
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    return new Promise<File | null>(resolve => {
      canvas.toBlob(blob => {
        resolve(blob ? new File([blob], 'capture.jpg', { type: 'image/jpeg' }) : null)
      }, 'image/jpeg', 0.95)
    })
  }, [])

  // ── OCR pipeline ─────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    stopCamera()
    setMode('preview')
    setPreview(URL.createObjectURL(file))
    setStatus('Starting OCR pipeline...')
    setIsScanning(true)
    setFieldConfidence({})

    try {
      const onProgress = (stage: OcrProgress) => {
        setStatus(PROGRESS_LABELS[stage] ?? stage)
      }

      const result: ParsedOcrResult = await runOcr(file, fields, onProgress)

      setLastRaw(result.rawResponse ?? '')

      // Build confidence CSS classes for form fields
      if (result.confidence) {
        const classes: Record<string, string> = {}
        for (const [key, level] of Object.entries(result.confidence)) {
          classes[key] = `confidence-${level}`
        }
        setFieldConfidence(classes)
      }

      const statusMsg = result.status === 'success'
        ? `✓ OCR complete — ${result.source === 'local' ? 'local' : result.modelUsed}`
        : result.status === 'partial'
        ? `⚠ Partial — ${result.missingRequired.length} required field(s) empty`
        : `✗ OCR failed — ${result.rawResponse?.slice(0, 80) ?? ''}`
      setStatus(statusMsg)

      // Update pending count after processing
      getPendingCount().then(setPendingCount)

      // Pass result to parent (OcrResult shape preserved for downstream)
      onResult(result)
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsScanning(false)
    }
  }, [fields, onResult, stopCamera])

  const handleCapture = useCallback(async () => {
    const file = await captureFrame()
    if (file) processFile(file)
  }, [captureFrame, processFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const { valid, error } = validateImage(file)
      if (!valid) {
        setStatus(error)
        e.target.value = ''
        return
      }
      processFile(file)
    }
    e.target.value = ''
  }, [processFile])

  const reset = useCallback(() => {
    setMode('idle')
    setPreview(null)
    setStatus('')
    setLastRaw('')
    setFieldConfidence({})
  }, [])

  return (
    <div className="flex flex-col gap-3">
      {/* Pending queue badge */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/30 rounded-md text-sm text-warning">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning text-white text-xs font-bold">
            {pendingCount}
          </span>
          scan{pendingCount > 1 ? 's' : ''} pending (offline queue)
        </div>
      )}

      {/* Preview / Camera / Idle area */}
      <div className="relative w-full bg-primary/5 border border-border rounded-lg overflow-hidden"
           style={{ minHeight: 220 }}>
        {mode === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center">
              <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-muted text-center">Scan or upload a document to auto-fill fields</p>
          </div>
        )}

        {mode === 'camera' && (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ minHeight: 220 }} />
        )}

        {mode === 'preview' && preview && (
          <img src={preview} alt="scan" className="w-full object-contain" style={{ maxHeight: 300 }} />
        )}

        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-surface rounded-lg px-4 py-3 flex items-center gap-2">
              <svg className="animate-spin w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-text">{status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {mode === 'camera' ? (
          <>
            <Button variant="primary" size="md" onClick={handleCapture}>
              Capture
            </Button>
            <Button variant="ghost" size="md" onClick={stopCamera}>Cancel</Button>
          </>
        ) : (
          <>
            <Button variant="primary" size="md" onClick={startCamera}>
              Open camera
            </Button>
            <Button variant="secondary" size="md" onClick={() => fileInputRef.current?.click()}>
              Upload image
            </Button>
            {mode === 'preview' && (
              <Button variant="ghost" size="md" onClick={reset}>Clear</Button>
            )}
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
      </div>

      {/* Status message */}
      {status && !isScanning && (
        <p className={`text-sm px-1 ${status.startsWith('✓') ? 'text-success' : status.startsWith('⚠') ? 'text-warning' : status.startsWith('✗') ? 'text-danger' : 'text-muted'}`}>
          {status}
        </p>
      )}

      {/* Confidence legend */}
      {Object.keys(fieldConfidence).length > 0 && (
        <div className="flex gap-3 text-xs text-muted px-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> High</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Low</span>
        </div>
      )}

      {/* Raw debug toggle */}
      {lastRaw && (
        <div>
          <button onClick={() => setShowRaw(v => !v)} className="text-xs text-muted underline">
            {showRaw ? 'Hide' : 'Show'} raw OCR response
          </button>
          {showRaw && (
            <pre className="mt-1 text-xs font-mono text-muted bg-bg border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {lastRaw}
            </pre>
          )}
        </div>
      )}

      {/* Confidence highlight CSS */}
      <style>{`
        .confidence-high { border-left: 3px solid #22c55e !important; }
        .confidence-medium { border-left: 3px solid #eab308 !important; }
        .confidence-low { border-left: 3px solid #f87171 !important; background-color: rgba(248,113,113,0.05) !important; }
      `}</style>
    </div>
  )
}
