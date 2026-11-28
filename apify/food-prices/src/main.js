import { Actor, log } from 'apify'
import { ProxyAgent } from 'undici'
import { PRICE_TYPES, REPORT_TYPES, fold, get, isoDay, longRows, refList, resolve } from './pihps.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const EVENT = 'price-record'

const priceTypes = (Array.isArray(input.priceTypes) && input.priceTypes.length ? input.priceTypes : [1]).map(Number).filter((n) => PRICE_TYPES[n])
if (!priceTypes.length) await Actor.fail('Pick at least one market type in "priceTypes".')
const report = REPORT_TYPES[input.reportType] ? input.reportType : 'harian'
const locations = (Array.isArray(input.locations) && input.locations.length ? input.locations : ['']).map((s) => String(s ?? '').trim())
const commodityFilter = (Array.isArray(input.commodities) ? input.commodities : []).map(fold).filter(Boolean)
const groupAverages = input.includeGroupAverages !== false
const maxItems = Math.max(1, Number(input.maxItems ?? 5000))

// Dates: Jakarta "today"; the latest day is usually published a day late.
const today = new Date(Date.now() + 7 * 3600_000)
const end = input.endDate ? new Date(`${input.endDate}T00:00:00Z`) : today
const start = input.startDate ? new Date(`${input.startDate}T00:00:00Z`) : new Date(end.getTime() - 6 * 86400_000)
if (!(start <= end)) await Actor.fail('"startDate" must be on or before "endDate" (format YYYY-MM-DD).')
// Ask for at most ~31 days per request so the grid stays small.
const chunks = []
const span = report === 'harian' ? 31 : 366
for (let a = new Date(start); a <= end; ) {
  const b = new Date(Math.min(end.getTime(), a.getTime() + (span - 1) * 86400_000))
  chunks.push([isoDay(a), isoDay(b)])
  a = new Date(b.getTime() + 86400_000)
}

let dispatcher
if (input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length) {
  const proxy = await Actor.createProxyConfiguration(input.proxyConfiguration)
  const url = await proxy?.newUrl()
  if (url) dispatcher = new ProxyAgent(url)
}

const charging = Actor.getChargingManager()
const budgetLeft = () => {
  try {
    return charging.calculateMaxEventChargeCountWithinLimit(EVENT) > 0
  } catch {
    return true
  }
}

// "" = national, "DKI Jakarta" = province, "DKI Jakarta / Kota Jakarta Pusat" = regency.
let provinces = null
const regencies = new Map()
async function place(text, priceType) {
  if (!text) return { provinsi: null, kabKota: null, province_id: '', regency_id: '' }
  const [provText, regText] = text.split('/').map((s) => s.trim())
  provinces ??= refList(await get('GetRefProvince', { price_type_id: priceType }, dispatcher))
  const prov = /^\d+$/.test(provText) && !provinces.length ? { id: Number(provText), name: null } : resolve(provinces, provText, 'province')
  if (!regText) return { provinsi: prov.name, kabKota: null, province_id: prov.id, regency_id: '' }
  const key = `${prov.id}:${priceType}`
  if (!regencies.has(key)) regencies.set(key, refList(await get('GetRefRegency', { price_type_id: priceType, ref_prov_id: prov.id }, dispatcher)))
  const reg = resolve(regencies.get(key), regText, `regency in ${prov.name ?? prov.id}`)
  return { provinsi: prov.name, kabKota: reg.name, province_id: prov.id, regency_id: reg.id }
}

let saved = 0
let stop = false
const failed = []
const done = []

outer: for (const priceType of priceTypes) {
  for (const loc of locations) {
    let where
    try {
      where = await place(loc, priceType)
    } catch (e) {
      log.warning(`✗ ${loc}: ${e.message}`)
      failed.push({ location: loc, jenisPasar: PRICE_TYPES[priceType], error: e.message })
      continue
    }
    let count = 0
    for (const [from, to] of chunks) {
      let json
      try {
        json = await get(
          'GetGridDataDaerah',
          { price_type_id: priceType, comcat_id: '', province_id: where.province_id, regency_id: where.regency_id, market_id: '', tipe_laporan: REPORT_TYPES[report], start_date: from, end_date: to },
          dispatcher,
        )
      } catch (e) {
        log.warning(`✗ ${loc || 'Nasional'} ${from}…${to}: ${e.message}`)
        failed.push({ location: loc || 'Nasional', jenisPasar: PRICE_TYPES[priceType], from, to, error: e.message })
        continue
      }
      for (const r of longRows(json?.data)) {
        if (!groupAverages && r.rataRataKelompok) continue
        if (commodityFilter.length && !commodityFilter.some((c) => fold(r.komoditas).includes(c) || fold(r.kelompok).includes(c))) continue
        if (r.harga == null && input.skipEmpty !== false) continue
        if (!budgetLeft()) {
          log.warning('Max charge for this run reached — stopping. Raise "Max cost per run" to get more prices.')
          stop = true
          break outer
        }
        const res = await Actor.pushData(
          {
            ...r,
            jenisPasar: PRICE_TYPES[priceType],
            laporan: report,
            wilayah: where.kabKota ?? where.provinsi ?? 'Nasional',
            provinsi: where.provinsi,
            kabKota: where.kabKota,
            provinceId: where.province_id === '' ? null : where.province_id,
            regencyId: where.regency_id === '' ? null : where.regency_id,
            sumber: 'PIHPS Bank Indonesia',
          },
          EVENT,
        )
        saved++
        count++
        if (res?.eventChargeLimitReached || saved >= maxItems) {
          stop = true
          break outer
        }
      }
    }
    done.push({ location: loc || 'Nasional', jenisPasar: PRICE_TYPES[priceType], records: count })
    log.info(`✓ ${loc || 'Nasional'} · ${PRICE_TYPES[priceType]}: ${count} prices`)
  }
}

await Actor.setValue('SUMMARY', { records: saved, from: isoDay(start), to: isoDay(end), report, done, failed })
log.info(`Done: ${saved} price records saved.`)
if (!saved && failed.length) await Actor.fail(`Nothing scraped. First error: ${failed[0].error}`)
await Actor.exit()
