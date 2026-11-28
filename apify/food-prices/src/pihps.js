// Bank Indonesia's PIHPS (Pusat Informasi Harga Pangan Strategis Nasional),
// www.bi.go.id/hargapangan. The "Tabel Harga" page loads DevExtreme stores with
// plain GETs under /hargapangan/WebSite/TabelHarga/ — no cookie or token needed.
//
// GetGridDataDaerah returns {"data":[row…]}: one row per commodity, level 1 =
// group (e.g. "Beras", Roman-numeral "no") with the group average, level 2 =
// variants. Each date in the range is its own key "dd/MM/yyyy", prices are
// strings with a comma thousands separator ("16,550"). The latest day is
// usually published a day late, so not every requested date comes back.

// undici's own fetch: Node's built-in one rejects an undici 8 ProxyAgent.
import { fetch } from 'undici'

export const BASE = 'https://www.bi.go.id/hargapangan/WebSite/TabelHarga'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const DELAY_MS = 1000

export const PRICE_TYPES = { 1: 'Pasar Tradisional', 2: 'Pasar Modern', 3: 'Pedagang Besar', 4: 'Produsen' }
export const REPORT_TYPES = { harian: 1, mingguan: 4, bulanan: 5 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0

export async function get(path, params, dispatcher) {
  const wait = last + DELAY_MS - Date.now()
  if (wait > 0) await sleep(wait)
  last = Date.now()
  const url = `${BASE}/${path}?${new URLSearchParams(params)}`
  let res
  try {
    res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json, text/javascript, */*; q=0.01', 'x-requested-with': 'XMLHttpRequest', referer: `${BASE.replace('/WebSite/TabelHarga', '')}/TabelHarga/PasarTradisionalDaerah` },
      dispatcher,
      signal: AbortSignal.timeout(60_000),
    })
  } catch (e) {
    throw new Error(`Request failed: ${e.cause?.message ?? e.message}`)
  }
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${path} did not return JSON.`)
  }
}

/** {data:[{id,name}]} or a bare array → [{id, name}] (field names vary by store). */
export function refList(json) {
  const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []
  return arr
    .map((x) => ({
      id: x.id ?? x.ID ?? x.prov_id ?? x.province_id ?? x.regency_id ?? x.key,
      name: String(x.name ?? x.Name ?? x.prov_name ?? x.province_name ?? x.regency_name ?? x.text ?? x.value ?? '').trim(),
    }))
    .filter((x) => x.id != null && x.name)
}

export const fold = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/^(prov(insi)?\.?|kab(upaten)?\.?|kota|kotamadya)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Resolve "DKI Jakarta", "jakarta" or "13" against a ref list. */
export function resolve(list, wanted, what) {
  const w = String(wanted).trim()
  if (/^\d+$/.test(w)) return { id: Number(w), name: list.find((x) => String(x.id) === w)?.name ?? null }
  const f = fold(w)
  const hit = list.find((x) => fold(x.name) === f) ?? list.find((x) => fold(x.name).includes(f) || f.includes(fold(x.name)))
  if (!hit) throw new Error(`Unknown ${what} "${w}". Use one of: ${list.map((x) => x.name).slice(0, 40).join(', ')}${list.length > 40 ? ', …' : ''}`)
  return hit
}

/** "16,550" → 16550; "-" / "" → null. */
export function price(v) {
  if (v == null) return null
  if (typeof v === 'number') return v
  const s = String(v).trim()
  if (!/\d/.test(s)) return null
  const n = Number(s.replace(/[^\d.-]/g, '').replace(/\.(?=\d{3}\b)/g, ''))
  return Number.isFinite(n) ? n : null
}

const DATE_KEY = /^(\d{2})\/(\d{2})\/(\d{4})$/

/** Wide grid rows → one record per commodity per date. */
export function longRows(rows) {
  const out = []
  let group = null
  for (const r of rows ?? []) {
    const level = Number(r.level)
    const name = String(r.name ?? '').trim()
    if (level === 1) group = name
    for (const [k, v] of Object.entries(r)) {
      const m = k.match(DATE_KEY)
      if (!m) continue
      out.push({
        tanggal: `${m[3]}-${m[2]}-${m[1]}`,
        komoditas: name,
        kelompok: level === 1 ? name : group,
        rataRataKelompok: level === 1,
        harga: price(v),
      })
    }
  }
  return out
}

export function isoDay(d) {
  return d.toISOString().slice(0, 10)
}
