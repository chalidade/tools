import { tr } from '@/lib/i18n'

// License keys for the paid embed: a key bought on Lemon Squeezy or Gumroad
// removes the "toowl" credit under an embedded tool and lets the site owner
// pick their own accent color (#/<slug>?embed&key=…&accent=…).
//
// The check runs in the browser against each store's public license endpoint
// (no secret API key is involved, so nothing here needs a server). It is a
// convenience gate, not DRM: the code is open source, and someone determined
// can patch it out. Results are cached in localStorage for a week so an embed
// does not ask the store on every page view.
//
// Fill in LICENSE after creating the products. While every field is empty the
// paid section in "Pasang di situsmu" stays hidden and ?key= is ignored.

export const LICENSE = {
  lemonSqueezy: {
    /** Checkout link of the product (Share → Checkout URL). */
    checkoutUrl: '',
    /** Store id from Settings → Stores; keys from another store are refused. */
    storeId: 0,
    /** Product ids whose keys count (e.g. Single tool, Complete, Agency). Empty = any product in the store. */
    productIds: [] as number[],
  },
  gumroad: {
    /** Product page link, e.g. https://<you>.gumroad.com/l/toowl. */
    checkoutUrl: 'https://chalidade.gumroad.com/l/toowl-embed',
    /** Product id from the product's settings ("License key" section) — required by the verify endpoint. */
    productId: 'ELk0YRYwJ-7ZGaKhrUqIlQ==',
  },
}

export type Provider = 'lemonsqueezy' | 'gumroad'

export interface LicenseResult {
  valid: boolean
  provider?: Provider
  /** Why a key was refused, already in the visitor's language. */
  reason?: string
}

const lemonOn = () => !!LICENSE.lemonSqueezy.checkoutUrl && LICENSE.lemonSqueezy.storeId > 0
const gumroadOn = () => !!LICENSE.gumroad.checkoutUrl && !!LICENSE.gumroad.productId

/** True once at least one store is configured; the paid UI shows only then. */
export const licenseEnabled = () => lemonOn() || gumroadOn()

/** Where the "Buy a license" button goes: Lemon Squeezy first, Gumroad as the fallback. */
export const buyUrl = () => (lemonOn() ? LICENSE.lemonSqueezy.checkoutUrl : gumroadOn() ? LICENSE.gumroad.checkoutUrl : '')

// Lemon Squeezy keys are UUIDs; Gumroad's are four groups of eight hex digits.
const LEMON_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const GUMROAD_KEY = /^[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}$/i

export function guessProvider(key: string): Provider | undefined {
  const k = key.trim()
  if (LEMON_KEY.test(k)) return 'lemonsqueezy'
  if (GUMROAD_KEY.test(k)) return 'gumroad'
  return undefined
}

async function checkLemon(key: string): Promise<LicenseResult> {
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    valid?: boolean
    error?: string
    license_key?: { status?: string }
    meta?: { store_id?: number; product_id?: number }
  }
  const { storeId, productIds } = LICENSE.lemonSqueezy
  if (!data.valid) {
    const status = data.license_key?.status
    if (status === 'expired') return { valid: false, reason: tr('Lisensi sudah kedaluwarsa.', 'This license has expired.') }
    if (status === 'disabled') return { valid: false, reason: tr('Lisensi ini dinonaktifkan.', 'This license is disabled.') }
    return { valid: false, reason: tr('Kunci lisensi tidak dikenal.', 'Unknown license key.') }
  }
  if (data.meta?.store_id !== storeId || (productIds.length > 0 && !productIds.includes(data.meta?.product_id ?? -1)))
    return { valid: false, reason: tr('Kunci ini bukan untuk toowl.', 'This key is not for toowl.') }
  return { valid: true, provider: 'lemonsqueezy' }
}

async function checkGumroad(key: string): Promise<LicenseResult> {
  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ product_id: LICENSE.gumroad.productId, license_key: key, increment_uses_count: 'false' }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean
    purchase?: { refunded?: boolean; disputed?: boolean; chargebacked?: boolean; subscription_ended_at?: string | null; subscription_cancelled_at?: string | null }
  }
  if (!data.success) return { valid: false, reason: tr('Kunci lisensi tidak dikenal.', 'Unknown license key.') }
  const p = data.purchase ?? {}
  if (p.refunded || p.chargebacked || p.disputed) return { valid: false, reason: tr('Pembelian ini sudah dikembalikan.', 'This purchase was refunded.') }
  if (p.subscription_ended_at || p.subscription_cancelled_at) return { valid: false, reason: tr('Langganan ini sudah berakhir.', 'This subscription has ended.') }
  return { valid: true, provider: 'gumroad' }
}

const CACHE = 'toowl:license'
const WEEK = 7 * 24 * 3600 * 1000

interface Cached {
  key: string
  valid: boolean
  provider?: Provider
  at: number
}

function readCache(key: string): LicenseResult | undefined {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as Cached | null
    if (c && c.key === key && Date.now() - c.at < WEEK) return { valid: c.valid, provider: c.provider }
  } catch {
    // storage blocked (private mode, partitioned iframe): just ask the store
  }
  return undefined
}

function writeCache(key: string, r: LicenseResult) {
  try {
    localStorage.setItem(CACHE, JSON.stringify({ key, valid: r.valid, provider: r.provider, at: Date.now() } satisfies Cached))
  } catch {
    // ignore
  }
}

/** The key this browser last checked successfully, so a returning buyer finds it filled in. */
export function savedLicenseKey(): string {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as Cached | null
    return c?.valid ? c.key : ''
  } catch {
    return ''
  }
}

/**
 * Checks a key with the store it belongs to. Network failures resolve to
 * `{ valid: false, reason }` and are not cached, so a flaky connection only
 * shows the credit for that one view.
 */
export async function checkLicense(rawKey: string): Promise<LicenseResult> {
  const key = rawKey.trim()
  if (!licenseEnabled()) return { valid: false }
  const provider = guessProvider(key)
  if (!provider) return { valid: false, reason: tr('Format kunci tidak dikenali.', 'Unrecognised key format.') }
  if ((provider === 'lemonsqueezy' && !lemonOn()) || (provider === 'gumroad' && !gumroadOn()))
    return { valid: false, reason: tr('Kunci ini bukan untuk toowl.', 'This key is not for toowl.') }
  const cached = readCache(key)
  if (cached) return cached
  try {
    const r = provider === 'lemonsqueezy' ? await checkLemon(key) : await checkGumroad(key)
    writeCache(key, r)
    return r
  } catch {
    return { valid: false, reason: tr('Tidak bisa menghubungi toko lisensi. Coba lagi nanti.', "Couldn't reach the license store. Try again later.") }
  }
}

/** "#7c3aed" or "7c3aed" → "#7c3aed"; anything else → undefined. */
export function parseAccent(value: string | null | undefined): string | undefined {
  const m = value?.trim().match(/^#?([0-9a-f]{6})$/i)
  return m ? `#${m[1].toLowerCase()}` : undefined
}

/** Paints an embed in the buyer's color: accent text/borders, fills, and ink that stays readable on the fill. */
export function applyAccent(hex: string, root: HTMLElement = document.documentElement) {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const lum = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  const ink = lum > 0.4 ? '#0b0b0c' : '#ffffff'
  for (const name of ['--brand-2', '--brand-fill-1', '--brand-fill-2', '--primary']) root.style.setProperty(name, hex)
  root.style.setProperty('--brand-ink', ink)
  root.style.setProperty('--primary-foreground', ink)
}
