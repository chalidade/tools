// Reads BPJPH's public halal certificate search (bpjph.halal.go.id/cari/sertifikat).
// The page is a Next.js App Router page: results are not fetched by the browser
// but rendered into the RSC payload (self.__next_f.push([1,"…"]) scripts). We
// join those chunks, find the "data":[…] array and the paging fields after it.
// Page size is fixed at 10.

export const BASE = 'https://bpjph.halal.go.id'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const DELAY_MS = 500

export const SEARCH_PARAM = { produk: 'produk', produsen: 'produsen', sertifikat: 'no_regis' }

const PROVINSI = {
  11: 'Aceh', 12: 'Sumatera Utara', 13: 'Sumatera Barat', 14: 'Riau', 15: 'Jambi', 16: 'Sumatera Selatan', 17: 'Bengkulu', 18: 'Lampung',
  19: 'Kepulauan Bangka Belitung', 21: 'Kepulauan Riau', 31: 'DKI Jakarta', 32: 'Jawa Barat', 33: 'Jawa Tengah', 34: 'DI Yogyakarta',
  35: 'Jawa Timur', 36: 'Banten', 51: 'Bali', 52: 'Nusa Tenggara Barat', 53: 'Nusa Tenggara Timur', 61: 'Kalimantan Barat',
  62: 'Kalimantan Tengah', 63: 'Kalimantan Selatan', 64: 'Kalimantan Timur', 65: 'Kalimantan Utara', 71: 'Sulawesi Utara',
  72: 'Sulawesi Tengah', 73: 'Sulawesi Selatan', 74: 'Sulawesi Tenggara', 75: 'Gorontalo', 76: 'Sulawesi Barat', 81: 'Maluku',
  82: 'Maluku Utara', 91: 'Papua Barat', 92: 'Papua Barat Daya', 94: 'Papua', 95: 'Papua Selatan', 96: 'Papua Tengah', 97: 'Papua Pegunungan',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0

export async function fetchPage({ by, term, page, dispatcher }) {
  const wait = last + DELAY_MS - Date.now()
  if (wait > 0) await sleep(wait)
  last = Date.now()
  const q = new URLSearchParams({ [SEARCH_PARAM[by]]: term, page: String(page) })
  const url = `${BASE}/cari/sertifikat?${q}`
  let res
  try {
    res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'id-ID,id;q=0.9' }, dispatcher, signal: AbortSignal.timeout(60_000) })
  } catch (e) {
    throw new Error(`Request failed: ${e.cause?.message ?? e.message}`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return parseResults(await res.text())
}

/** All RSC chunks of the page, unescaped and joined. */
export function rscPayload(html) {
  let out = ''
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      out += JSON.parse(m[1])
    } catch {
      /* not a string chunk */
    }
  }
  return out
}

/** The JSON value (array/object) starting at text[start], by bracket matching. */
function jsonAt(text, start) {
  const open = text[start]
  const close = open === '[' ? ']' : '}'
  let depth = 0
  let inStr = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === open || c === '[' || c === '{') depth++
    else if (c === close || c === ']' || c === '}') {
      depth--
      if (depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
  }
  throw new Error('Unterminated JSON in page payload.')
}

export function parseResults(html) {
  const payload = rscPayload(html)
  // The results array is the one that holds certificate objects.
  let idx = -1
  for (const m of payload.matchAll(/"data":\[/g)) {
    const at = m.index + m[0].length - 1
    if (payload.slice(at, at + 4000).includes('"sertifikat"') || payload.startsWith('[]', at)) {
      idx = at
      break
    }
  }
  if (idx < 0) throw new Error('No results block found on the page (the site layout may have changed).')
  const data = jsonAt(payload, idx)
  const tail = payload.slice(idx, idx + JSON.stringify(data).length + 400)
  const num = (k) => {
    const m = tail.match(new RegExp(`"${k}":\\s*"?(\\d+)`))
    return m ? Number(m[1]) : null
  }
  return { items: data, currentPage: num('currentPage'), totalItems: num('totalItems'), pageSize: num('pageSize'), totalPages: num('totalPages') }
}

const s = (v) => (v == null ? null : String(v).trim() || null)

export function tidy(item) {
  const pabrik = (item.pabrik ?? []).map((p) => ({
    nama: s(p.nama),
    alamat: s(p.alamat),
    kodeKabKota: s(p.kab_kota),
    kodeProvinsi: s(p.provinsi),
    provinsi: PROVINSI[Number(p.provinsi)] ?? null,
    kodePos: s(p.kode_pos),
    negara: s(p.negara),
    jenisFasilitas: p.fasil_id === 'FAPAB' ? 'pabrik' : p.fasil_id === 'FAOUT' ? 'outlet' : s(p.fasil_id),
  }))
  return {
    noSertifikat: s(item.sertifikat?.no_sertifikat),
    tanggalTerbit: s(item.sertifikat?.tgl_terbit_sertifikat),
    tanggalTerbitIso: isoDate(item.sertifikat?.tgl_terbit_sertifikat),
    namaProduk: s(item.nama_produk),
    merek: s(item.merek_dagang),
    pelakuUsaha: s(item.pelaku_usaha?.nama_pelaku_usaha),
    nib: s(item.pelaku_usaha?.nib),
    skalaUsaha: s(item.skala_usaha),
    jenisLayanan: s(item.pengajuan?.jenis_layanan),
    jenisProduk: s(item.pengajuan?.jenis_produk),
    provinsi: pabrik.find((p) => p.provinsi)?.provinsi ?? null,
    pabrik,
    id: s(item.id),
  }
}

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  januari: 1, februari: 2, maret: 3, mei: 5, juni: 6, juli: 7, agustus: 8, oktober: 10, desember: 12 }

export function isoDate(text) {
  const m = String(text ?? '').trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!m) return null
  const mo = MONTHS[m[2].toLowerCase()]
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}
