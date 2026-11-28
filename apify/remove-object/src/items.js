// Shared by the toowl generator Actors (copied into each Actor's src/ by
// `node apify/sync-shared.mjs` — edit this file, not the copies).
//
// Like runBatch in batch.js, but for Actors whose input is a list of values
// (texts, codes, …) instead of file URLs: one dataset row per item, charged
// (pay-per-event) only when it succeeded. Generated files are also collected
// so the caller can bundle them into one ZIP.

import { Actor, log } from 'apify'
import { zipSync } from 'fflate'

/**
 * @param {object} o
 * @param {any[]} o.items
 * @param {string} o.eventName  pay-per-event name charged once per successful item
 * @param {number} [o.concurrency]
 * @param {(item: any, ctx: { index: number, store: any, addFile: (name: string, bytes: Buffer) => void }) => Promise<object>} o.process
 *        returns the dataset row; files passed to addFile go into the ZIP
 * @param {string} [o.zipName]  bundle every generated file into this ZIP (null = no ZIP)
 */
export async function runItems({ items, eventName, concurrency = 4, process, zipName = null }) {
  const store = await Actor.openKeyValueStore()
  const charging = Actor.getChargingManager()
  const zip = {}
  let next = 0
  let ok = 0
  let failed = 0
  let stopped = false
  let inFlight = 0

  const budgetLeft = () => {
    try {
      return charging.calculateMaxEventChargeCountWithinLimit(eventName) - inFlight > 0
    } catch {
      return true // not a pay-per-event run (local, or pricing not set yet)
    }
  }

  async function worker() {
    while (!stopped && next < items.length) {
      if (!budgetLeft()) {
        if (inFlight > 0) {
          await new Promise((r) => setTimeout(r, 100))
          continue
        }
        stopped = true
        log.warning('Max charge for this run reached — stopping. Raise "Max cost per run" to generate more.')
        return
      }
      const index = next++
      const item = items[index]
      inFlight++
      const files = []
      try {
        const row = await process(item, { index, store, addFile: (name, bytes) => files.push([name, bytes]) })
        for (const [name, bytes] of files) zip[name] = [bytes, { level: 6 }]
        const result = await Actor.pushData(row, eventName)
        ok++
        if (result?.eventChargeLimitReached) stopped = true
      } catch (e) {
        failed++
        const label = typeof item === 'string' ? item : JSON.stringify(item)
        log.warning(`✗ ${label.slice(0, 80)}: ${e.message}`)
        await Actor.pushData({ input: item, error: e.message })
      } finally {
        inFlight--
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker))
  const skipped = items.length - ok - failed
  const summary = { total: items.length, ok, failed, skipped }
  if (zipName && Object.keys(zip).length) {
    await store.setValue(zipName, Buffer.from(zipSync(zip)), { contentType: 'application/zip' })
    summary.zipUrl = store.getPublicUrl(zipName)
  }
  await Actor.setValue('SUMMARY', summary)
  log.info(`Done: ${ok} ok, ${failed} failed${skipped ? `, ${skipped} skipped (charge limit)` : ''}.${summary.zipUrl ? ` ZIP: ${summary.zipUrl}` : ''}`)
  return summary
}

/** Accepts ["a", "b"], [{ text }]/[{ value }] objects and newline-separated text. */
export function itemList(list) {
  if (typeof list === 'string') return list.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  if (!Array.isArray(list)) return []
  return list
    .map((x) => (typeof x === 'string' ? x.trim() : x))
    .filter((x) => (typeof x === 'string' ? x.length > 0 : x && typeof x === 'object'))
}

/** A file name from free text: "https://a.com/x?y" → "a.com-x-y". */
export function slugName(text, fallback) {
  const s = String(text ?? '')
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return s || fallback
}
