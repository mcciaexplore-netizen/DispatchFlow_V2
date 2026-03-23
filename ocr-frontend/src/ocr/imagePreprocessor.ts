// STEP 1 — Image preprocessor: auto-contrast, sharpening, brightness normalisation
// Pure Canvas 2D API — no external image libraries

const MAX_EDGE = 2000
const JPEG_QUALITY = 0.92

/**
 * Load an image File/Blob into an HTMLImageElement.
 */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(blob)
  })
}

/**
 * Resize to max 2000px on longest edge, preserving aspect ratio.
 */
function resizeToCanvas(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  let w = img.naturalWidth
  let h = img.naturalHeight
  const longest = Math.max(w, h)
  if (longest > MAX_EDGE) {
    const scale = MAX_EDGE / longest
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return { canvas, ctx }
}

/**
 * Auto-contrast: stretch histogram so darkest pixel → 0, brightest → 255.
 */
function autoContrast(imageData: ImageData): void {
  const d = imageData.data
  let min = 255
  let max = 0
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
    if (lum < min) min = lum
    if (lum > max) max = lum
  }
  const range = max - min
  if (range < 10) return // already very low contrast, skip
  const scale = 255 / range
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, Math.max(0, (d[i] - min) * scale))
    d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - min) * scale))
    d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - min) * scale))
  }
}

/**
 * Brightness normalisation: shift average brightness to ~128.
 */
function normaliseBrightness(imageData: ImageData): void {
  const d = imageData.data
  let sum = 0
  const pixelCount = d.length / 4
  for (let i = 0; i < d.length; i += 4) {
    sum += (d[i] + d[i + 1] + d[i + 2]) / 3
  }
  const avg = sum / pixelCount
  const shift = 128 - avg
  if (Math.abs(shift) < 5) return
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, Math.max(0, d[i] + shift))
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + shift))
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + shift))
  }
}

/**
 * 3x3 unsharp-mask sharpening via convolution.
 * Kernel: center=5, edges=-1 (approximates sharpen by subtracting blur).
 */
function sharpen(imageData: ImageData, width: number, height: number): ImageData {
  const src = imageData.data
  const out = new Uint8ClampedArray(src.length)

  // Sharpening kernel
  // [ 0, -1,  0]
  // [-1,  5, -1]
  // [ 0, -1,  0]
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c
            val += src[idx] * kernel[(ky + 1) * 3 + (kx + 1)]
          }
        }
        out[(y * width + x) * 4 + c] = val
      }
      out[(y * width + x) * 4 + 3] = 255 // alpha
    }
  }

  // Copy edges (first/last row and column) from source
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4
    const botIdx = ((height - 1) * width + x) * 4
    for (let c = 0; c < 4; c++) {
      out[topIdx + c] = src[topIdx + c]
      out[botIdx + c] = src[botIdx + c]
    }
  }
  for (let y = 0; y < height; y++) {
    const leftIdx = y * width * 4
    const rightIdx = (y * width + width - 1) * 4
    for (let c = 0; c < 4; c++) {
      out[leftIdx + c] = src[leftIdx + c]
      out[rightIdx + c] = src[rightIdx + c]
    }
  }

  return new ImageData(out, width, height)
}

/**
 * Optional deskew using opencv-js. Wrapped in try/catch so it degrades
 * gracefully if the WASM module fails to load.
 */
async function tryDeskew(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    // Dynamic import with variable to prevent Vite from bundling this optional dep
    const moduleName = '@techstark/opencv-js'
    const cv = await import(/* @vite-ignore */ moduleName)
    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    const edges = new cv.Mat()
    cv.Canny(gray, edges, 50, 150)
    const lines = new cv.Mat()
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 80, 60, 10)

    // Calculate median angle from detected lines
    const angles: number[] = []
    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.intAt(i, 0)
      const y1 = lines.intAt(i, 1)
      const x2 = lines.intAt(i, 2)
      const y2 = lines.intAt(i, 3)
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
      if (Math.abs(angle) < 15) angles.push(angle) // only near-horizontal
    }

    src.delete()
    gray.delete()
    edges.delete()
    lines.delete()

    if (angles.length < 3) return false
    angles.sort((a, b) => a - b)
    const medianAngle = angles[Math.floor(angles.length / 2)]
    if (Math.abs(medianAngle) < 0.5) return false // already straight

    // Rotate canvas
    const ctx = canvas.getContext('2d')!
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((-medianAngle * Math.PI) / 180)
    ctx.translate(-cx, -cy)
    ctx.putImageData(imgData, 0, 0)
    ctx.restore()
    return true
  } catch {
    // opencv-js not available or WASM failed — gracefully degrade
    return false
  }
}

/**
 * Preprocess an image for OCR: resize, auto-contrast, brightness normalisation,
 * sharpening, and optional deskew. Returns a JPEG Blob at 0.92 quality.
 *
 * @param file - The source image File or Blob
 * @returns Preprocessed image as a JPEG Blob
 */
export async function preprocessImage(file: File | Blob): Promise<Blob> {
  const img = await loadImage(file)
  const { canvas, ctx } = resizeToCanvas(img)
  const { width, height } = canvas

  // Apply image enhancements
  let imageData = ctx.getImageData(0, 0, width, height)
  autoContrast(imageData)
  normaliseBrightness(imageData)
  ctx.putImageData(imageData, 0, 0)

  // Sharpen
  imageData = ctx.getImageData(0, 0, width, height)
  const sharpened = sharpen(imageData, width, height)
  ctx.putImageData(sharpened, 0, 0)

  // Optional deskew (degrades gracefully)
  await tryDeskew(canvas)

  // Export as JPEG
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

/**
 * Convert a Blob to base64 string and detect its MIME type.
 */
export function blobToBase64(blob: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, base64] = result.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      resolve({ base64, mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
