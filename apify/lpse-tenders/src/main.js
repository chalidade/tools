import { Actor, log } from 'apify'
import { Spse, applyAnnouncement, rowToTender } from './spse.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const EVENT = 'tender-scraped'

const norm = (s) =>
  String(s ?? '')
    .trim()
    .replace(/^https?:\/\/spse\.inaproc\.id\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
let slugs = [...new Set((Array.isArray(input.lpse) ? input.lpse : String(input.lpse ?? '').split(/[\s,]+/)).map(norm).filter(Boolean))]
const tahun = input.tahun ? Number(input.tahun) : new Date().getFullYear()
const keyword = String(input.keyword ?? '').trim()
const maxItems = Math.max(1, Number(input.maxItems ?? 100))
const perLpse = input.maxItemsPerLpse ? Math.max(1, Number(input.maxItemsPerLpse)) : Infinity
const minHps = input.minHps ? Number(input.minHps) : null
const maxHps = input.maxHps ? Number(input.maxHps) : null
const tahapanFilter = String(input.tahapan ?? '').trim().toLowerCase()
const details = input.includeDetails === true

let proxyUrl
if (input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length) {
  const proxy = await Actor.createProxyConfiguration(input.proxyConfiguration)
  proxyUrl = () => proxy?.newUrl()
}
const spse = new Spse({ proxyUrl })
await spse.newSession()

if (!slugs.length || slugs.includes('*') || slugs.includes('all')) {
  slugs = await spse.slugs()
  log.info(`Scanning every LPSE listed on spse.inaproc.id: ${slugs.length} agencies.`)
}

const charging = Actor.getChargingManager()
const budgetLeft = () => {
  try {
    return charging.calculateMaxEventChargeCountWithinLimit(EVENT) > 0
  } catch {
    return true
  }
}

const PAGE = 100
let saved = 0
const failed = []
let stop = false

for (const slug of slugs) {
  if (stop) break
  let token
  try {
    token = await spse.open(slug, tahun)
  } catch (e) {
    // A fresh session (and proxy IP) once, then give up on this agency.
    try {
      await spse.newSession()
      token = await spse.open(slug, tahun)
    } catch {
      log.warning(`✗ ${slug}: ${e.message}`)
      failed.push({ lpse: slug, error: e.message })
      continue
    }
  }

  let start = 0
  let fromThis = 0
  let total = null
  while (!stop && (total == null || start < total) && fromThis < perLpse) {
    let page
    try {
      page = await spse.page(slug, { token, tahun, start, length: PAGE, search: keyword })
    } catch (e) {
      try {
        token = await spse.open(slug, tahun)
        page = await spse.page(slug, { token, tahun, start, length: PAGE, search: keyword })
      } catch {
        log.warning(`✗ ${slug} (from row ${start}): ${e.message}`)
        failed.push({ lpse: slug, error: e.message })
        break
      }
    }
    total = page.total
    if (!page.rows.length) break
    start += page.rows.length
    const lastPage = page.rows.length < PAGE

    for (const row of page.rows) {
      const t = rowToTender(row, slug)
      if (minHps != null && (t.hps == null || t.hps < minHps)) continue
      if (maxHps != null && (t.hps == null || t.hps > maxHps)) continue
      if (tahapanFilter && !(t.tahapan ?? '').toLowerCase().includes(tahapanFilter)) continue
      if (!budgetLeft()) {
        log.warning('Max charge for this run reached — stopping. Raise "Max cost per run" to get more tenders.')
        stop = true
        break
      }
      if (details && t.kode) {
        try {
          applyAnnouncement(t, await spse.announcement(slug, t.kode))
        } catch (e) {
          t.pengumuman = null
          t.detailError = e.message
        }
      }
      t.scrapedAt = new Date().toISOString()
      const res = await Actor.pushData(t, EVENT)
      saved++
      fromThis++
      if (res?.eventChargeLimitReached) stop = true
      if (saved >= maxItems) stop = true
      if (stop || fromThis >= perLpse) break
    }
    if (lastPage) break
  }
  log.info(`✓ ${slug}: ${fromThis} tenders${total ? ` (of ${total} listed for ${tahun})` : ''}`)
}

const summary = { tenders: saved, tahun, keyword: keyword || null, lpseScanned: slugs.length, failed }
await Actor.setValue('SUMMARY', summary)
log.info(`Done: ${saved} tenders saved, ${failed.length} agencies failed.`)
if (!saved && failed.length) await Actor.fail(`No tenders scraped. First error: ${failed[0].error}`)
await Actor.exit()
