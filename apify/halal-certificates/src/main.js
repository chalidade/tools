import { Actor, log } from 'apify'
import { ProxyAgent } from 'undici'
import { fetchPage, tidy } from './bpjph.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const EVENT = 'product-found'

const by = ['produk', 'produsen', 'sertifikat'].includes(input.searchBy) ? input.searchBy : 'produk'
const terms = [...new Set((Array.isArray(input.searches) ? input.searches : String(input.searches ?? '').split('\n')).map((t) => String(t ?? '').trim()).filter(Boolean))]
// An empty search returns the whole catalogue (13 million products), never what anyone wants.
if (!terms.length) await Actor.fail('Add at least one search term to "searches".')
const maxItems = Math.max(1, Number(input.maxItems ?? 100))
const perSearch = input.maxItemsPerSearch ? Math.max(1, Number(input.maxItemsPerSearch)) : Infinity

let proxy = null
if (input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length) {
  proxy = await Actor.createProxyConfiguration(input.proxyConfiguration)
}
let dispatcher
const newAgent = async () => {
  const url = proxy ? await proxy.newUrl() : undefined
  dispatcher = url ? new ProxyAgent(url) : undefined
}
await newAgent()

const charging = Actor.getChargingManager()
const budgetLeft = () => {
  try {
    return charging.calculateMaxEventChargeCountWithinLimit(EVENT) > 0
  } catch {
    return true
  }
}

let saved = 0
let stop = false
const failed = []
const searches = []

for (const term of terms) {
  if (stop) break
  let page = 1
  let got = 0
  let total = null
  const seen = new Set()
  while (!stop && got < perSearch) {
    let res
    try {
      res = await fetchPage({ by, term, page, dispatcher })
    } catch (e) {
      try {
        await newAgent()
        res = await fetchPage({ by, term, page, dispatcher })
      } catch {
        log.warning(`✗ "${term}" page ${page}: ${e.message}`)
        failed.push({ search: term, page, error: e.message })
        break
      }
    }
    total ??= res.totalItems
    if (!res.items.length) break
    for (const raw of res.items) {
      const row = tidy(raw)
      if (row.id && seen.has(row.id)) continue
      if (row.id) seen.add(row.id)
      if (!budgetLeft()) {
        log.warning('Max charge for this run reached — stopping. Raise "Max cost per run" to get more products.')
        stop = true
        break
      }
      const r = await Actor.pushData({ search: term, searchBy: by, ...row, scrapedAt: new Date().toISOString() }, EVENT)
      saved++
      got++
      if (r?.eventChargeLimitReached || saved >= maxItems) stop = true
      if (stop || got >= perSearch) break
    }
    if (res.totalPages != null && page >= res.totalPages) break
    page++
  }
  searches.push({ search: term, saved: got, totalOnSite: total })
  log.info(`✓ "${term}": ${got} products${total != null ? ` (${total} on the site)` : ''}`)
}

await Actor.setValue('SUMMARY', { products: saved, searchBy: by, searches, failed })
log.info(`Done: ${saved} products saved.`)
if (!saved && failed.length) await Actor.fail(`Nothing scraped. First error: ${failed[0].error}`)
await Actor.exit()
