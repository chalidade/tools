// Client for SPSE 4 (Indonesia's e-procurement system), now served for every
// agency at https://spse.inaproc.id/<slug>/ (the old lpse.<agency>.go.id hosts
// are gone). The tender list page writes a session-bound authenticityToken into
// its HTML; the DataTable then POSTs to /<slug>/dt/lelang with that token and
// the session cookie, and gets rows as arrays.

import { load } from 'cheerio'
import { ProxyAgent } from 'undici'

export const BASE = 'https://spse.inaproc.id'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
// robots.txt asks for Crawl-delay: 1.
const DELAY_MS = 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export class Spse {
  /** @param {{ proxyUrl?: () => Promise<string | undefined> }} [o] */
  constructor({ proxyUrl } = {}) {
    this.proxyUrl = proxyUrl
    this.cookies = new Map()
    this.last = 0
    this.agent = undefined
  }

  async newSession() {
    this.cookies.clear()
    const url = this.proxyUrl ? await this.proxyUrl() : undefined
    this.agent = url ? new ProxyAgent(url) : undefined
  }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  async request(path, { method = 'GET', body, referer, accept } = {}) {
    const wait = this.last + DELAY_MS - Date.now()
    if (wait > 0) await sleep(wait)
    this.last = Date.now()
    const headers = {
      'user-agent': UA,
      'accept-language': 'id-ID,id;q=0.9,en;q=0.8',
      accept: accept ?? 'text/html,application/xhtml+xml,*/*;q=0.8',
    }
    if (this.cookies.size) headers.cookie = this.cookieHeader()
    if (referer) headers.referer = referer
    if (body) {
      headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
      headers['x-requested-with'] = 'XMLHttpRequest'
      headers.origin = BASE
    }
    let res
    try {
      res = await fetch(BASE + path, { method, body, headers, redirect: 'follow', dispatcher: this.agent, signal: AbortSignal.timeout(60_000) })
    } catch (e) {
      throw new Error(`Request to ${path} failed: ${e.cause?.message ?? e.message}`)
    }
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      if (i > 0) this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
    }
    const text = await res.text()
    if (!res.ok) {
      const challenge = /cf-chl|challenge-platform|turnstile/i.test(text) ? ' (Cloudflare challenge: try an Indonesian proxy)' : ''
      throw new Error(`HTTP ${res.status} for ${path}${challenge}`)
    }
    return text
  }

  /** Every agency slug listed in robots.txt (it allows each one by name). */
  async slugs() {
    const txt = await this.request('/robots.txt', { accept: 'text/plain' })
    const out = new Set()
    for (const m of txt.matchAll(/^Allow:\s*\/([a-z0-9][a-z0-9_-]*)\/?\s*$/gim)) out.add(m[1].toLowerCase())
    return [...out]
  }

  /** Opens the tender list of one agency and returns its authenticityToken. */
  async open(slug, tahun) {
    const html = await this.request(`/${slug}/lelang${tahun ? `?tahun=${tahun}` : ''}`)
    const m = html.match(/authenticityToken\s*[:=]\s*['"]([0-9a-f]{20,})['"]/i) ?? html.match(/name=["']authenticityToken["'][^>]*value=["']([0-9a-f]{20,})/i)
    if (!m) throw new Error(`No authenticityToken on /${slug}/lelang: the agency slug may be wrong.`)
    return m[1]
  }

  /** One page of the DataTable. */
  async page(slug, { token, tahun, start, length, search }) {
    const p = new URLSearchParams()
    p.set('draw', String(Math.floor(start / length) + 1))
    for (let i = 0; i < 6; i++) {
      p.set(`columns[${i}][data]`, String(i))
      p.set(`columns[${i}][searchable]`, 'true')
      p.set(`columns[${i}][orderable]`, i === 0 || i === 5 ? 'true' : 'false')
      p.set(`columns[${i}][search][value]`, '')
      p.set(`columns[${i}][search][regex]`, 'false')
    }
    // Column 5 is the (hidden) announcement date: newest first.
    p.set('order[0][column]', '5')
    p.set('order[0][dir]', 'desc')
    p.set('start', String(start))
    p.set('length', String(length))
    p.set('search[value]', search ?? '')
    p.set('search[regex]', 'false')
    p.set('authenticityToken', token)
    const q = tahun ? `?tahun=${tahun}` : ''
    const text = await this.request(`/${slug}/dt/lelang${q}`, {
      method: 'POST',
      body: p.toString(),
      referer: `${BASE}/${slug}/lelang${q}`,
      accept: 'application/json, text/javascript, */*; q=0.01',
    })
    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`/${slug}/dt/lelang did not return JSON (session expired or blocked).`)
    }
    return { total: Number(json.recordsFiltered ?? json.recordsTotal ?? 0), rows: Array.isArray(json.data) ? json.data : [] }
  }

  /** Label → value pairs of the announcement page. */
  async announcement(slug, kode) {
    const html = await this.request(`/${slug}/lelang/${encodeURIComponent(kode)}/pengumumanlelang`, { referer: `${BASE}/${slug}/lelang` })
    return parseAnnouncement(html)
  }
}

const clean = (s) => s.replace(/\s+/g, ' ').trim()

export function parseAnnouncement(html) {
  const $ = load(html)
  const out = {}
  $('table tr').each((_, tr) => {
    const cells = $(tr).children('th, td')
    // Rows are "label | value" or "label | value | label | value".
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const a = cells.eq(i)
      const b = cells.eq(i + 1)
      if (!a.is('th') && !b.is('td')) continue
      const label = clean(a.text())
      if (!label || label.length > 80 || out[label] !== undefined) continue
      // Nested tables (e.g. lokasi pekerjaan lists) become one line per row.
      const nested = b.find('tr')
      const value = nested.length
        ? nested.map((__, r) => clean($(r).text())).get().filter(Boolean).join('\n')
        : clean(b.text())
      out[label] = value
    }
  })
  return out
}

/**
 * Indonesian money text to a number of rupiah: "1.234.567,89", "Rp 1,5 M",
 * "250 Jt", "2,1 T". Returns null when there is no number.
 */
export function rupiah(text) {
  if (text == null) return null
  if (typeof text === 'number') return text
  const s = String(text).replace(/rp\.?/i, '').trim()
  const m = s.match(/(-?[\d.,]+)\s*(t|triliun|m|miliar|milyar|jt|juta|rb|ribu)?\b/i)
  if (!m) return null
  let num = m[1]
  const unit = (m[2] ?? '').toLowerCase()
  if (unit) {
    // "1,5 M": comma is the decimal separator.
    num = num.replace(/\./g, '').replace(',', '.')
  } else if (/,\d{1,2}$/.test(num)) {
    num = num.replace(/\./g, '').replace(',', '.')
  } else {
    num = num.replace(/[.,]/g, '')
  }
  const v = Number(num)
  if (!Number.isFinite(v)) return null
  const mult = { t: 1e12, triliun: 1e12, m: 1e9, miliar: 1e9, milyar: 1e9, jt: 1e6, juta: 1e6, rb: 1e3, ribu: 1e3 }[unit] ?? 1
  return Math.round(v * mult)
}

const yes = (v) => v === true || v === 1 || /^(1|true|ya|y)$/i.test(String(v ?? '').trim())
const txt = (v) => (v == null ? null : clean(load(`<p>${v}</p>`)('p').text()) || null)

/** DataTable row (array) → tidy record. Column order taken from the page's JS. */
export function rowToTender(row, slug) {
  const r = Array.isArray(row) ? row : Object.values(row ?? {})
  const kode = txt(r[0])
  const hpsText = txt(r[4])
  const nilaiKontrakText = txt(r[10])
  return {
    kode,
    namaPaket: txt(r[1]),
    instansi: txt(r[2]),
    tahapan: txt(r[3]),
    hps: rupiah(hpsText),
    hpsText,
    nilaiKontrak: rupiah(nilaiKontrakText),
    nilaiKontrakText,
    jenisPengadaan: txt(r[6]),
    metode: txt(r[7]),
    tahunAnggaran: txt(r[8]),
    versiSpse: txt(r[9]),
    evaluasiUlang: yes(r[11]),
    penawaranUlang: yes(r[12]),
    konsolidasi: yes(r[13]),
    oap: yes(r[14]),
    lpse: slug,
    url: kode ? `${BASE}/${slug}/lelang/${kode}/pengumumanlelang` : null,
    jadwalUrl: kode ? `${BASE}/${slug}/lelang/${kode}/jadwal` : null,
  }
}
