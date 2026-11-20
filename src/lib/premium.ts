import { useSyncExternalStore } from 'react'
import { isIosApp } from '@/lib/native'

/*
 * Freemium: one gate for every store. Today only the iOS app can sell
 * (StoreKit 2 through the local `ToowlStore` plugin in native/store); the
 * website stays free and never shows a price. The Play Store app (TWA) can
 * plug Google Play Billing in here as another backend (Digital Goods API +
 * Payment Request), so tools only ever ask usePremium().
 *
 * Nothing is decided yet about WHAT is premium: no tool is gated. When it is,
 * gate in the tool with `const premium = usePremium()` and offer
 * buyPremium() / restorePremium() (App Store review requires a visible
 * "Restore Purchases" wherever something is sold).
 *
 * Product IDs are created in App Store Connect (and Play Console) with these
 * exact names — see docs/IOS.md.
 */

/** Unlocks premium. A non-consumable ("buy once") in App Store Connect. */
export const PRO = 'toowl.pro'

export type Store = 'app-store' | null

export interface Product {
  id: string
  title: string
  description: string
  /** Localized, e.g. "Rp 49.000". */
  price: string
}

export type PurchaseResult = 'purchased' | 'pending' | 'cancelled'

interface StorePlugin {
  products(o: { ids: string[] }): Promise<{ products: Product[] }>
  purchase(o: { id: string }): Promise<{ status: PurchaseResult; productIds: string[] }>
  entitlements(): Promise<{ productIds: string[] }>
  restore(): Promise<{ productIds: string[] }>
  addListener(event: 'entitlements', f: (e: { productIds: string[] }) => void): Promise<unknown>
}

/** Which store sells here, or null where nothing is for sale (the website). */
export const store = (): Store => (isIosApp() ? 'app-store' : null)

// Owned products, remembered so the UI is right on the first frame; the store
// is asked again at start-up and is the truth (refunds remove items).
const KEY = 'tools:owned'
let owned: string[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]
  } catch {
    return []
  }
})()
const listeners = new Set<() => void>()

function setOwned(ids: string[]) {
  owned = [...new Set(ids)].sort()
  try {
    localStorage.setItem(KEY, JSON.stringify(owned))
  } catch {
    // Storage blocked: fine, the store is asked again next launch.
  }
  listeners.forEach((f) => f())
}

let plugin: Promise<StorePlugin> | null = null
function iosStore() {
  plugin ??= import('@capacitor/core').then(({ registerPlugin }) => {
    const p = registerPlugin<StorePlugin>('ToowlStore')
    void p.addListener('entitlements', ({ productIds }) => setOwned(productIds)).catch(() => {})
    return p
  })
  return plugin
}

/** Call once at start-up: refreshes what this person owns. Does nothing on the website. */
export async function syncPremium() {
  if (store() !== 'app-store') return
  const { productIds } = await (await iosStore()).entitlements()
  setOwned(productIds)
}

export const hasPremium = () => store() !== null && owned.includes(PRO)

/** Re-renders when ownership changes. Always false on the website. */
export const usePremium = () =>
  useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => listeners.delete(f)
    },
    hasPremium,
    hasPremium,
  )

/** Name, description and localized price from the store, or null where nothing is sold. */
export async function premiumProduct(): Promise<Product | null> {
  if (store() !== 'app-store') return null
  const { products } = await (await iosStore()).products({ ids: [PRO] })
  return products[0] ?? null
}

/** Opens the store's purchase sheet. 'pending' = waiting on Ask to Buy or a payment step. */
export async function buyPremium(): Promise<PurchaseResult> {
  if (store() !== 'app-store') throw new Error('No store here')
  const { status, productIds } = await (await iosStore()).purchase({ id: PRO })
  setOwned(productIds)
  return status
}

/** "Restore Purchases": asks the store again (e.g. a new phone). Resolves true if premium is owned. */
export async function restorePremium(): Promise<boolean> {
  if (store() !== 'app-store') return false
  const { productIds } = await (await iosStore()).restore()
  setOwned(productIds)
  return hasPremium()
}
