import { tr } from '@/lib/i18n'
import type { CategoryId } from '@/tools/registry'

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

/**
 * What a key unlocks. `all`: every tool. `one`: the single tool the buyer
 * picked at checkout — a Gumroad variant whose name ends in "[slug]".
 * Otherwise the tools in the listed categories plus the listed slugs.
 */
export type Scope = 'all' | 'one' | { categories?: CategoryId[]; tools?: string[] }

export interface Product {
  /** Gumroad product id (Content tab → "Use your product ID to verify licenses"). Empty = not on sale yet. */
  id: string
  /** Product page, e.g. https://chalidade.gumroad.com/l/toowl-embed. */
  url: string
  name: [id: string, en: string]
  /** Shown on the buy button, already formatted, e.g. "$49". */
  price: string
  scope: Scope
}

/** Tools offered one by one ("Single Tool" product, one variant each). */
export const SINGLE_TOOLS = [
  'denoise', 'remove-background', 'upscale-image', 'image-to-svg', 'pdf-to-word', 'compress-video', 'compress-pdf',
  'merge-pdf', 'sign-pdf', 'doc-to-pdf', 'kwitansi', 'cicilan', 'gaji-bersih', 'jadwal-sholat', 'zakat',
  'kalkulator-waris', 'qr-generator', 'screen-recorder', 'ocr', 'harga-jual',
]

export const LICENSE = {
  lemonSqueezy: {
    /** Checkout link of the product (Share → Checkout URL). */
    checkoutUrl: '',
    /** Store id from Settings → Stores; keys from another store are refused. */
    storeId: 0,
    /** Product ids whose keys count (e.g. Single tool, Complete, Agency). Empty = any product in the store. */
    productIds: [] as number[],
  },
  /** Gumroad products, cheapest first; each license key belongs to exactly one of them. */
  gumroad: [
    { id: 'rbH8IZkWX_Ro7MtdNnIzRA==', url: 'https://chalidade.gumroad.com/l/toowl-single', price: '$19', name: ['Tool ini saja', 'This tool only'], scope: 'one' },
    {
      id: '-CiieqTlpXI9yTYPunbC1A==',
      url: 'https://chalidade.gumroad.com/l/toowl-islami',
      price: '$29',
      name: ['Paket Islami', 'Islamic Pack'],
      scope: { tools: ['jadwal-sholat', 'arah-kiblat', 'hijriah', 'zakat', 'tasbih', 'kalkulator-waris'] },
    },
    { id: 'sW9OUhmYGXcclgtgmko-Kw==', url: 'https://chalidade.gumroad.com/l/toowl-music', price: '$29', name: ['Paket Musik', 'Music Pack'], scope: { categories: ['music'] } },
    { id: 'VsB0J5DPS1HvmW5fitd1eg==', url: 'https://chalidade.gumroad.com/l/toowl-dev', price: '$39', name: ['Paket Developer', 'Developer Pack'], scope: { categories: ['dev'] } },
    {
      id: 'IElQNcRN0CFu3zXIct1mBQ==',
      url: 'https://chalidade.gumroad.com/l/toowl-pdf',
      price: '$49',
      name: ['Paket PDF', 'PDF Suite'],
      scope: { categories: ['reader', 'to-pdf', 'from-pdf', 'pdf'], tools: ['merge-excel', 'scan', 'ocr'] },
    },
    {
      id: 'cJRQ7LK2lZoYCblC_GxQqw==',
      url: 'https://chalidade.gumroad.com/l/toowl-bisnis',
      price: '$49',
      name: ['Paket Bisnis & Keuangan', 'Business & Finance Pack'],
      scope: {
        tools: [
          'cicilan', 'gaji-bersih', 'thr-lembur', 'kwitansi', 'harga-jual', 'label-pengiriman', 'terbilang', 'persen',
          'mana-lebih-murah', 'qris', 'link-wa', 'tabungan', 'patungan', 'token-listrik', 'surat', 'cv', 'merge-excel',
          'undian', 'calculator', 'date-calculator', 'zakat',
        ],
      },
    },
    { id: 'rbGQNVtPX9nnmrS_iRoNWg==', url: 'https://chalidade.gumroad.com/l/toowl-creator', price: '$49', name: ['Paket Kreator & Media', 'Creator & Media Pack'], scope: { categories: ['media'] } },
    { id: 'ELk0YRYwJ-7ZGaKhrUqIlQ==', url: 'https://chalidade.gumroad.com/l/toowl-embed', price: '$99', name: ['Semua tool', 'All-Access'], scope: 'all' },
    { id: 'rdj0-UcEkOTIU9qvnjJHxg==', url: 'https://chalidade.gumroad.com/l/toowl-agency', price: '$29/mo', name: ['Agensi: situs tanpa batas', 'Agency: unlimited sites'], scope: 'all' },
  ] satisfies Product[] as Product[],
}

/** A tool made to order (no license key); linked under the license options. */
export const CUSTOM_TOOL_URL = 'https://chalidade.gumroad.com/l/toowl-custom'

/** Developer kits (packages/_kits): source-free ZIPs of web components +
 *  headless API under a commercial license, sold on Gumroad. Not license keys:
 *  nothing here is checked by `checkLicense`. */
export interface DevKit {
  url: string
  name: [string, string]
  count: number
  price: string
}

const GUM = 'https://chalidade.gumroad.com/l/'
export const DEV_KITS: DevKit[] = [
  { url: GUM + 'toowl-dev-complete', name: ['Complete Kit', 'Complete Kit'], count: 72, price: '$199' },
  { url: GUM + 'toowl-dev-pdf', name: ['PDF Toolkit', 'PDF Toolkit'], count: 11, price: '$79' },
  { url: GUM + 'toowl-dev-office', name: ['Konverter Office', 'Office Converter Kit'], count: 7, price: '$69' },
  { url: GUM + 'toowl-dev-image', name: ['Kit Gambar + AI', 'Image Kit + AI'], count: 8, price: '$59' },
  { url: GUM + 'toowl-dev-media', name: ['Kit Video & Audio', 'Video & Audio Kit'], count: 9, price: '$69' },
  { url: GUM + 'toowl-dev-music', name: ['Kit Musik', 'Music Kit'], count: 9, price: '$49' },
  { url: GUM + 'toowl-dev-utils', name: ['Utilitas Developer', 'Dev Utilities Kit'], count: 11, price: '$29' },
  { url: GUM + 'toowl-dev-islamic', name: ['Kit Islami', 'Islamic Kit'], count: 5, price: '$29' },
  { url: GUM + 'toowl-dev-single', name: ['Satu komponen', 'Single component'], count: 1, price: '$29' },
]

export type Provider = 'lemonsqueezy' | 'gumroad'

export interface LicenseResult {
  valid: boolean
  provider?: Provider
  /** Why a key was refused, already in the visitor's language. */
  reason?: string
  /** Gumroad: the product the key belongs to, and for a single-tool key the tool picked. */
  productId?: string
  tool?: string
}

/** The part of a tool a license looks at. */
export interface Licensable {
  slug: string
  category: CategoryId
}

const lemonOn = () => !!LICENSE.lemonSqueezy.checkoutUrl && LICENSE.lemonSqueezy.storeId > 0
const gumroadProducts = () => LICENSE.gumroad.filter((p) => p.id && p.url)
const gumroadOn = () => gumroadProducts().length > 0

/** True once at least one store is configured; the paid UI shows only then. */
export const licenseEnabled = () => lemonOn() || gumroadOn()

function inScope(scope: Scope, tool: Licensable, picked?: string) {
  if (scope === 'all') return true
  if (scope === 'one') return picked === tool.slug
  return !!(scope.categories?.includes(tool.category) || scope.tools?.includes(tool.slug))
}

/** The products on sale that cover this tool, cheapest first (single-tool only where it is offered). */
export function productsFor(tool: Licensable): Product[] {
  return gumroadProducts().filter((p) => (p.scope === 'one' ? SINGLE_TOOLS.includes(tool.slug) : inScope(p.scope, tool)))
}

/** How many of these tools a product covers (a single-tool product: one). */
export function productCount(p: Product, tools: Licensable[]): number {
  return p.scope === 'one' ? 1 : tools.filter((t) => inScope(p.scope, t)).length
}

/** All products on sale, in the order of LICENSE.gumroad. */
export const licenseProducts = () => gumroadProducts()

/** Where a plain "Buy a license" link goes: Lemon Squeezy first, else the widest Gumroad product. */
export const buyUrl = () => (lemonOn() ? LICENSE.lemonSqueezy.checkoutUrl : (gumroadProducts().find((p) => p.scope === 'all')?.url ?? ''))

/** Does a valid key cover this tool? */
export function covers(r: LicenseResult, tool: Licensable): boolean {
  if (!r.valid) return false
  if (r.provider !== 'gumroad' || !r.productId) return true
  const p = LICENSE.gumroad.find((x) => x.id === r.productId)
  return !!p && inScope(p.scope, tool, r.tool)
}

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

interface GumroadAnswer {
  success?: boolean
  purchase?: {
    refunded?: boolean
    disputed?: boolean
    chargebacked?: boolean
    subscription_ended_at?: string | null
    subscription_cancelled_at?: string | null
    subscription_failed_at?: string | null
    /** The chosen variant, e.g. "(Noise Remover [denoise])". */
    variants?: string
  }
}

async function verifyGumroad(productId: string, key: string): Promise<GumroadAnswer> {
  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: 'false' }),
  })
  return (await res.json().catch(() => ({}))) as GumroadAnswer
}

// A Gumroad key belongs to one product and the verify endpoint needs the
// product id, so ask each product on sale (all at once) and keep the one that knows it.
async function checkGumroad(key: string): Promise<LicenseResult> {
  const products = gumroadProducts()
  const answers = await Promise.all(products.map((p) => verifyGumroad(p.id, key)))
  const i = answers.findIndex((a) => a.success)
  if (i < 0) return { valid: false, reason: tr('Kunci lisensi tidak dikenal.', 'Unknown license key.') }
  const p = answers[i].purchase ?? {}
  if (p.refunded || p.chargebacked || p.disputed) return { valid: false, reason: tr('Pembelian ini sudah dikembalikan.', 'This purchase was refunded.') }
  if (p.subscription_ended_at || p.subscription_cancelled_at || p.subscription_failed_at)
    return { valid: false, reason: tr('Langganan ini sudah berakhir.', 'This subscription has ended.') }
  const tool = p.variants?.match(/\[([a-z0-9-]+)\]/)?.[1]
  return { valid: true, provider: 'gumroad', productId: products[i].id, tool }
}

const CACHE = 'toowl:license'
const WEEK = 7 * 24 * 3600 * 1000

interface Cached {
  key: string
  valid: boolean
  provider?: Provider
  productId?: string
  tool?: string
  at: number
}

function readCache(key: string): LicenseResult | undefined {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as Cached | null
    if (c && c.key === key && Date.now() - c.at < WEEK) return { valid: c.valid, provider: c.provider, productId: c.productId, tool: c.tool }
  } catch {
    // storage blocked (private mode, partitioned iframe): just ask the store
  }
  return undefined
}

function writeCache(key: string, r: LicenseResult) {
  try {
    localStorage.setItem(CACHE, JSON.stringify({ key, valid: r.valid, provider: r.provider, productId: r.productId, tool: r.tool, at: Date.now() } satisfies Cached))
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
export async function checkLicense(rawKey: string, tool: Licensable): Promise<LicenseResult> {
  const r = await checkKey(rawKey)
  if (!r.valid || covers(r, tool)) return r
  const p = LICENSE.gumroad.find((x) => x.id === r.productId)
  const name = p ? tr(p.name[0], p.name[1]) : ''
  return {
    ...r,
    valid: false,
    reason:
      p?.scope === 'one'
        ? tr('Kunci ini untuk tool lain. Satu kunci "Tool ini saja" berlaku untuk satu tool.', 'This key is for another tool. A "This tool only" key covers one tool.')
        : tr(`Kunci ini untuk ${name}, yang tidak mencakup tool ini.`, `This key is for the ${name}, which doesn't include this tool.`),
  }
}

async function checkKey(rawKey: string): Promise<LicenseResult> {
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
