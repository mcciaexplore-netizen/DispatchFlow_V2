// Module 4 — PIN hashing/verification using Web Crypto API (browser-native, offline)

import { LS } from '../constants/storage'

async function sha256hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const buffer  = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPin(pin: string): Promise<string> {
  return sha256hex(pin.trim())
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(LS.ADMIN_PIN_HASH)
  if (!stored) return false
  const hash = await sha256hex(pin.trim())
  return hash === stored
}

export async function savePin(pin: string): Promise<void> {
  const hash = await hashPin(pin)
  localStorage.setItem(LS.ADMIN_PIN_HASH, hash)
}

export function hasPinConfigured(): boolean {
  return !!localStorage.getItem(LS.ADMIN_PIN_HASH)
}

export function clearPin(): void {
  localStorage.removeItem(LS.ADMIN_PIN_HASH)
}
