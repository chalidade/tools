// toowl Pro for Chrome: license keys from Gumroad or Lemon Squeezy, checked
// against each store's public license endpoint (no secret key involved).
// The result lives in chrome.storage.local and is re-checked once a week; if
// the store can't be reached, a key that was valid stays valid for 30 days.
// It is a convenience gate, not DRM: the source is open.

import { useSyncExternalStore } from 'react'
import { tr } from '@/lib/i18n'
import { PRO, gumroadIds, lemonOn } from './config'

export type Provider = 'gumroad' | 'lemonsqueezy'

export interface Saved {
  key: string
  provider: Provider
  /** Lemon Squeezy activation of this install. */
  instanceId?: string
  /** Last time the store said yes. */
  okAt: number
  /** Last time we asked. */
  checkedAt: number
}

export interface Result {
  ok: boolean
  reason?: string
}

const STORE_KEY = 'pro'
const WEEK = 7 * 24 * 3600 * 1000
const GRACE = 30 * 24 * 3600 * 1000

const LEMON_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const GUMROAD_KEY = /^[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}$/i

export function guessProvider(key: string): Provider | undefined {
  if (LEMON_KEY.test(key)) return 'lemonsqueezy'
  if (GUMROAD_KEY.test(key)) return 'gumroad'
  return undefined
}

// ---- state shared with React ---------------------------------------------

let saved: Saved | null = null
let loaded = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

const hasChrome = () => typeof chrome !== 'undefined' && !!chrome.storage?.local

async function load() {
  if (hasChrome()) saved = ((await chrome.storage.local.get(STORE_KEY))[STORE_KEY] as Saved | undefined) ?? null
  else saved = JSON.parse(localStorage.getItem('toowl:pro') ?? 'null') as Saved | null
  loaded = true
  emit()
}

async function persist(next: Saved | null) {
  saved = next
  if (hasChrome()) await (next ? chrome.storage.local.set({ [STORE_KEY]: next }) : chrome.storage.local.remove(STORE_KEY))
  else if (next) localStorage.setItem('toowl:pro', JSON.stringify(next))
  else localStorage.removeItem('toowl:pro')
  emit()
}

const isPro = () => !!saved && Date.now() - saved.okAt < GRACE

/** `undefined` while loading, then whether this install has Pro. */
export function usePro(): boolean | undefined {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => (loaded ? isPro() : undefined),
  )
}

export const savedKey = () => saved?.key ?? ''
export const proNow = () => isPro()

// ---- stores ---------------------------------------------------------------

const form = (o: Record<string, string>) => ({
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(o),
})

interface GumroadAnswer {
  success?: boolean
  uses?: number
  purchase?: {
    refunded?: boolean
    disputed?: boolean
    chargebacked?: boolean
    subscription_ended_at?: string | null
    subscription_cancelled_at?: string | null
    subscription_failed_at?: string | null
  }
}

async function gumroad(key: string, activate: boolean): Promise<Result> {
  const ids = gumroadIds()
  // A key belongs to one product and the endpoint needs its id: ask them all, without counting a use.
  const answers = await Promise.all(
    ids.map((id) =>
      fetch('https://api.gumroad.com/v2/licenses/verify', form({ product_id: id, license_key: key, increment_uses_count: 'false' }))
        .then((r) => r.json() as Promise<GumroadAnswer>)
        .catch(() => null),
    ),
  )
  // No store answered at all: that's the network, not a verdict on the key.
  if (answers.every((a) => a === null)) throw new Error('offline')
  const i = answers.findIndex((a) => a?.success)
  if (i < 0) return { ok: false, reason: tr('Kunci lisensi tidak dikenal.', 'Unknown license key.') }
  const a = answers[i]!
  const p = a.purchase ?? {}
  if (p.refunded || p.chargebacked || p.disputed) return { ok: false, reason: tr('Pembelian ini sudah dikembalikan.', 'This purchase was refunded.') }
  if (p.subscription_ended_at || p.subscription_failed_at || (p.subscription_cancelled_at && Date.parse(p.subscription_cancelled_at) < Date.now()))
    return { ok: false, reason: tr('Langganan ini sudah berakhir.', 'This subscription has ended.') }
  if (activate) {
    if ((a.uses ?? 0) >= PRO.gumroad.maxActivations)
      return { ok: false, reason: tr('Kunci ini sudah dipakai di terlalu banyak perangkat.', 'This key is already used on too many devices.') }
    // Count this install.
    await fetch('https://api.gumroad.com/v2/licenses/verify', form({ product_id: ids[i], license_key: key, increment_uses_count: 'true' })).catch(() => {})
  }
  return { ok: true }
}

interface LemonAnswer {
  valid?: boolean
  activated?: boolean
  error?: string
  license_key?: { status?: string }
  instance?: { id?: string }
  meta?: { store_id?: number; product_id?: number }
}

function lemonVerdict(a: LemonAnswer, accepted: boolean | undefined): Result {
  if (!accepted) {
    const status = a.license_key?.status
    if (status === 'expired') return { ok: false, reason: tr('Lisensi sudah kedaluwarsa.', 'This license has expired.') }
    if (status === 'disabled') return { ok: false, reason: tr('Lisensi ini dinonaktifkan.', 'This license is disabled.') }
    if (a.error && /limit/i.test(a.error)) return { ok: false, reason: tr('Kunci ini sudah dipakai di terlalu banyak perangkat.', 'This key is already used on too many devices.') }
    return { ok: false, reason: tr('Kunci lisensi tidak dikenal.', 'Unknown license key.') }
  }
  const { storeId, productIds } = PRO.lemonSqueezy
  if (a.meta?.store_id !== storeId || (productIds.length > 0 && !productIds.includes(a.meta?.product_id ?? -1)))
    return { ok: false, reason: tr('Kunci ini bukan untuk toowl Pro.', 'This key is not for toowl Pro.') }
  return { ok: true }
}

async function lemonActivate(key: string): Promise<Result & { instanceId?: string }> {
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', form({ license_key: key, instance_name: 'toowl for Chrome' }))
  const a = (await res.json()) as LemonAnswer
  return { ...lemonVerdict(a, a.activated), instanceId: a.instance?.id }
}

async function lemonValidate(key: string, instanceId?: string): Promise<Result> {
  const body: Record<string, string> = { license_key: key }
  if (instanceId) body.instance_id = instanceId
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', form(body))
  const a = (await res.json()) as LemonAnswer
  return lemonVerdict(a, a.valid)
}

// ---- actions ---------------------------------------------------------------

/** Checks a key typed by the buyer and, if good, turns Pro on for this install. */
export async function activate(raw: string): Promise<Result> {
  const key = raw.trim()
  const provider = guessProvider(key)
  if (!provider) return { ok: false, reason: tr('Format kunci tidak dikenali.', 'Unrecognised key format.') }
  if ((provider === 'gumroad' && gumroadIds().length === 0) || (provider === 'lemonsqueezy' && !lemonOn()))
    return { ok: false, reason: tr('Kunci ini bukan untuk toowl Pro.', 'This key is not for toowl Pro.') }
  try {
    const now = Date.now()
    if (provider === 'gumroad') {
      const r = await gumroad(key, true)
      if (r.ok) await persist({ key, provider, okAt: now, checkedAt: now })
      return r
    }
    const r = await lemonActivate(key)
    if (r.ok) await persist({ key, provider, instanceId: r.instanceId, okAt: now, checkedAt: now })
    return { ok: r.ok, reason: r.reason }
  } catch {
    return { ok: false, reason: tr('Tidak bisa menghubungi toko lisensi. Cek koneksi lalu coba lagi.', "Couldn't reach the license store. Check your connection and try again.") }
  }
}

/** Turns Pro off here (frees a Lemon Squeezy activation). */
export async function deactivate() {
  const s = saved
  if (s?.provider === 'lemonsqueezy' && s.instanceId)
    await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', form({ license_key: s.key, instance_id: s.instanceId })).catch(() => {})
  await persist(null)
}

/** Loads the saved key and re-checks it with the store at most once a week. */
export async function startLicense() {
  await load()
  const s = saved
  if (!s || Date.now() - s.checkedAt < WEEK) return
  try {
    const r = s.provider === 'gumroad' ? await gumroad(s.key, false) : await lemonValidate(s.key, s.instanceId)
    const now = Date.now()
    // A definite "no" from the store ends Pro; otherwise keep it fresh.
    await persist(r.ok ? { ...s, okAt: now, checkedAt: now } : null)
  } catch {
    // Offline: try again next time; the grace period covers it.
    await persist({ ...s, checkedAt: Date.now() - WEEK + 3600 * 1000 })
  }
}
