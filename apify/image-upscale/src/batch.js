// Shared by every toowl Actor (copied into each Actor's src/ by
// `node apify/sync-shared.mjs` — edit this file, not the copies).
//
// Reads the list of file URLs from the input, downloads each one, runs the
// Actor's `process` function on it, saves outputs in the run's key-value
// store and writes one dataset row per file. A file is charged (pay-per-event)
// only when it succeeded; failures get a row with `error` and no charge.

import { Actor, log } from 'apify'

const MB = 1024 * 1024

/** Accepts ["https://…"], [{ url }] (requestListSources editor) and newline-separated text. */
export function fileUrls(list) {
  const items = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/\s+/) : []
  const urls = items
    .map((x) => (typeof x === 'string' ? x : x?.url))
    .map((u) => (u ?? '').trim())
    .filter(Boolean)
  return [...new Set(urls)]
}

export function fileName(url, fallback) {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
    return last || fallback
  } catch {
    return fallback
  }
}

/** Key-value store keys allow a-zA-Z0-9!-_.'() and up to 256 chars. */
export function storeKey(index, name) {
  const safe = name.replace(/[^a-zA-Z0-9!\-_.'()]/g, '_').slice(-180)
  return `${String(index + 1).padStart(4, '0')}-${safe}`
}

export async function download(url, maxMb) {
  if (!/^https?:\/\//i.test(url)) throw new Error('Only http(s) URLs are supported.')
  let res
  try {
    res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; toowl-apify/1.0)' } })
  } catch (e) {
    throw new Error(`Download failed: ${e.cause?.message ?? e.message}`)
  }
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const limit = maxMb * MB
  const declared = Number(res.headers.get('content-length') || 0)
  if (declared > limit) throw new Error(`File is larger than ${maxMb} MB.`)
  const chunks = []
  let size = 0
  for await (const chunk of res.body) {
    size += chunk.length
    if (size > limit) throw new Error(`File is larger than ${maxMb} MB.`)
    chunks.push(chunk)
  }
  return { bytes: Buffer.concat(chunks), contentType: res.headers.get('content-type') || '' }
}

/**
 * @param {object} o
 * @param {string[]} o.urls
 * @param {string} o.eventName  pay-per-event name charged once per successful file
 * @param {number} [o.maxMb]
 * @param {number} [o.concurrency]
 * @param {(file: { url: string, name: string, index: number, bytes: Buffer, contentType: string, store: any }) => Promise<object>} o.process
 *        returns the dataset row (without url/name); may save outputs to `store`
 */
export async function runBatch({ urls, eventName, maxMb = 50, concurrency = 3, process }) {
  const store = await Actor.openKeyValueStore()
  const charging = Actor.getChargingManager()
  let next = 0
  let ok = 0
  let failed = 0
  let stopped = false
  let inFlight = 0

  // Files being processed right now will be charged when they finish, so
  // count them against the budget before starting another one.
  const budgetLeft = () => {
    try {
      return charging.calculateMaxEventChargeCountWithinLimit(eventName) - inFlight > 0
    } catch {
      return true // not a pay-per-event run (local, or pricing not set yet)
    }
  }

  async function worker() {
    while (!stopped && next < urls.length) {
      if (!budgetLeft()) {
        // Others may still fail (failures are free): wait for them first.
        if (inFlight > 0) {
          await new Promise((r) => setTimeout(r, 250))
          continue
        }
        stopped = true
        log.warning('Max charge for this run reached — stopping. Raise "Max cost per run" to process more files.')
        return
      }
      const index = next++
      const url = urls[index]
      const name = fileName(url, `file-${index + 1}`)
      inFlight++
      try {
        const { bytes, contentType } = await download(url, maxMb)
        const row = await process({ url, name, index, bytes, contentType, store })
        const result = await Actor.pushData({ url, name, ...row }, eventName)
        ok++
        if (result?.eventChargeLimitReached) stopped = true
        log.info(`✓ ${name}`)
      } catch (e) {
        failed++
        log.warning(`✗ ${name}: ${e.message}`)
        await Actor.pushData({ url, name, error: e.message })
      } finally {
        inFlight--
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, urls.length)) }, worker))
  const skipped = urls.length - ok - failed
  const summary = { total: urls.length, ok, failed, skipped }
  await Actor.setValue('SUMMARY', summary)
  log.info(`Done: ${ok} ok, ${failed} failed${skipped ? `, ${skipped} skipped (charge limit)` : ''}.`)
  return summary
}

export const formatBytes = (n) => (n < MB ? `${(n / 1024).toFixed(1)} KB` : `${(n / MB).toFixed(2)} MB`)
