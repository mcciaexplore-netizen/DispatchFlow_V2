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
  'checking-cache': 'Checking neural cache...',
  'preprocessing': 'Optimizing contrast & binarization...',
  'local-ocr': 'Running on-device OCR engine...',
  'cloud-ocr': 'Synthesizing with cloud vision...',
  'done': 'OCR Extraction Complete',
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
    setStatus('Initializing OCR engine...')
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
        ? `✓ OCR Success — Parsed by ${result.source === 'local' ? 'Local Engine' : result.modelUsed}`
        : result.status === 'partial'
        ? `⚠ Partial match — ${result.missingRequired.length} field(s) require review`
        : `✗ OCR parse failed — ${result.rawResponse?.slice(0, 80) ?? ''}`
      setStatus(statusMsg)

      getPendingCount().then(setPendingCount)
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
    <div className="flex flex-col gap-4">
      {/* Offline Pending Banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-700">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>{pendingCount} scan{pendingCount > 1 ? 's' : ''} queued locally (offline auto-retry enabled)</span>
        </div>
      )}

      {/* Main Scan Viewport */}
      <div 
        className="relative w-full rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-b from-primary/5 via-surface to-bg overflow-hidden flex flex-col items-center justify-center p-4 min-h-[260px] transition-all hover:border-primary/60"
      >
        {/* Video stream element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover rounded-xl ${mode === 'camera' ? 'block' : 'hidden'}`}
          style={{ minHeight: 260 }}
        />

        {/* Idle dropzone mode */}
        {mode === 'idle' && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center text-center p-6 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface border border-primary/20 shadow-xs flex items-center justify-center text-3xl mb-3 group-hover:scale-110 group-hover:border-primary/50 transition-all">
              📷
            </div>
            <h4 className="text-base font-heading font-bold text-text group-hover:text-primary transition-colors">
              Scan Document or Drop Slip Image
            </h4>
            <p className="text-xs text-muted max-w-sm mt-1">
              Supports delivery tags, GST invoices, and gate passes in PNG, JPG, or PDF format
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary">
              <span>Browse Image File</span>
              <span>→</span>
            </div>
          </div>
        )}

        {/* Preview image */}
        {mode === 'preview' && preview && (
          <div className="relative w-full flex items-center justify-center max-h-[320px] rounded-xl overflow-hidden bg-black/5 p-2">
            <img src={preview} alt="scanned document" className="max-h-[300px] w-auto object-contain rounded-lg shadow-sm" />
          </div>
        )}

        {/* Scanning Laser Beam Overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs z-20">
            <div className="relative w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse shadow-lg" />
            <div className="bg-surface/95 border border-border/80 rounded-2xl px-5 py-3.5 shadow-xl flex items-center gap-3 mt-4">
              <svg className="animate-spin w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text font-heading">{status}</span>
                <span className="text-[10px] text-muted">Analyzing document layout & text zones</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'camera' ? (
            <>
              <Button variant="accent" size="md" onClick={handleCapture} className="shadow-md font-bold">
                📸 Capture Photo
              </Button>
              <Button variant="ghost" size="md" onClick={stopCamera}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" size="md" onClick={startCamera} className="shadow-xs font-bold">
                📷 Open Camera
              </Button>
              <Button variant="secondary" size="md" onClick={() => fileInputRef.current?.click()} className="font-semibold">
                📁 Upload File
              </Button>
              {mode === 'preview' && (
                <Button variant="ghost" size="md" onClick={reset}>
                  ✕ Reset
                </Button>
              )}
            </>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
        </div>

        {/* Confidence Legend */}
        {Object.keys(fieldConfidence).length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted bg-surface border border-border px-3 py-1.5 rounded-xl">
            <span className="font-semibold text-text">Confidence:</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> High</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Low</span>
          </div>
        )}
      </div>

      {/* Status Feedback Notification */}
      {status && !isScanning && (
        <div className={`text-xs px-3.5 py-2 rounded-xl border font-semibold flex items-center gap-2 ${
          status.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          status.startsWith('⚠') ? 'bg-amber-50 text-amber-800 border-amber-200' :
          status.startsWith('✗') ? 'bg-red-50 text-red-800 border-red-200' :
          'bg-surface text-muted border-border'
        }`}>
          <span>{status}</span>
        </div>
      )}

      {/* Raw Payload Inspector Accordion */}
      {lastRaw && (
        <div className="pt-1">
          <button
            onClick={() => setShowRaw(v => !v)}
            className="text-xs text-muted hover:text-text underline flex items-center gap-1"
          >
            <span>{showRaw ? '▾ Hide' : '▸ Show'} raw OCR output payload</span>
          </button>
          {showRaw && (
            <pre className="mt-2 text-xs font-mono text-muted bg-surface border border-border rounded-xl p-3.5 overflow-x-auto max-h-48 whitespace-pre-wrap shadow-2xs">
              {lastRaw}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

