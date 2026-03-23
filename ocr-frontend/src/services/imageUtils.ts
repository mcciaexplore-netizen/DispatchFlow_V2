/**
 * Image utility functions for camera capture and validation.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff',
]

/**
 * Capture the current frame from a video element as a base64 JPEG string.
 * Returns raw base64 without data URI prefix.
 */
export function captureFrame(videoElement: HTMLVideoElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoElement, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  return dataUrl.split(',')[1]
}

/**
 * Validate an image file before upload.
 * Checks file type and size (max 10MB).
 */
export function validateImage(file: File): { valid: boolean; error: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type}". Use JPEG, PNG, WebP, BMP, or TIFF.`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum size is 10 MB.`,
    }
  }

  return { valid: true, error: '' }
}
