// Hitungan kalender Jawa murni: hari pasaran, neptu, wuku, dan tanggal Jawa.
// Tanpa ramalan/primbon — hanya kalender.

export const HARI: [string, string][] = [
  ['Minggu', 'Sunday'],
  ['Senin', 'Monday'],
  ['Selasa', 'Tuesday'],
  ['Rabu', 'Wednesday'],
  ['Kamis', 'Thursday'],
  ['Jumat', 'Friday'],
  ['Sabtu', 'Saturday'],
]
export const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon']
const NEPTU_HARI = [5, 4, 3, 7, 8, 6, 9] // Minggu..Sabtu
const NEPTU_PASARAN = [5, 9, 7, 4, 8] // Legi, Pahing, Pon, Wage, Kliwon
export const WUKU = [
  'Sinta', 'Landep', 'Wukir', 'Kurantil', 'Tolu', 'Gumbreg', 'Warigalit', 'Warigagung', 'Julungwangi', 'Sungsang',
  'Dungulan', 'Kuningan', 'Langkir', 'Medangsia', 'Pujut', 'Pahang', 'Krulut', 'Merakih', 'Tambir', 'Medangkungan',
  'Maktal', 'Wuye', 'Manahil', 'Prangbakat', 'Bala', 'Wugu', 'Wayang', 'Kulawu', 'Dukut', 'Watugunung',
]
export const BULAN_JAWA = [
  'Sura', 'Sapar', 'Mulud', 'Bakda Mulud', 'Jumadilawal', 'Jumadilakir', 'Rejeb', 'Ruwah', 'Pasa', 'Sawal', 'Sela', 'Besar',
]

/** Nomor hari Julian untuk tanggal Gregorian (tengah malam UTC). */
export function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
}

export function fromJdn(n: number): { y: number; m: number; d: number } {
  const a = n + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)
  return { d: e - Math.floor((153 * m + 2) / 5) + 1, m: m + 3 - 12 * Math.floor(m / 10), y: 100 * b + d - 4800 + Math.floor(m / 10) }
}

const mod = (a: number, n: number) => ((a % n) + n) % n

// Jangkar: Galungan 2024-02-28 adalah Rabu Kliwon di wuku Dungulan (indeks 10),
// jadi Minggu pertama wuku Dungulan jatuh pada 2024-02-25.
const WUKU_ANCHOR = jdn(2024, 2, 25) - 10 * 7

export interface Weton {
  jdn: number
  hari: number // 0 = Minggu
  pasaran: number // 0 = Legi
  neptuHari: number
  neptuPasaran: number
  neptu: number
  wuku: number
  hariDalamWuku: number // 0..6 dari Minggu
}

export function wetonOfJdn(n: number): Weton {
  const hari = mod(n + 1, 7)
  const pasaran = mod(n, 5)
  const dalamSiklus = mod(n - WUKU_ANCHOR, 210)
  return {
    jdn: n,
    hari,
    pasaran,
    neptuHari: NEPTU_HARI[hari],
    neptuPasaran: NEPTU_PASARAN[pasaran],
    neptu: NEPTU_HARI[hari] + NEPTU_PASARAN[pasaran],
    wuku: Math.floor(dalamSiklus / 7),
    hariDalamWuku: dalamSiklus % 7,
  }
}

export const wetonOf = (y: number, m: number, d: number) => wetonOfJdn(jdn(y, m, d))

/** Tanggal Jawa (Sultan Agungan) dari kalender Hijriah tabular; bisa berbeda satu hari dari penetapan keraton. */
export function tanggalJawa(y: number, m: number, d: number): { day: number; month: number; year: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(
      new Date(Date.UTC(y, m - 1, d)),
    )
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    const day = get('day')
    const month = get('month')
    const year = get('year')
    if (!day || !month || !year) return null
    return { day, month: month - 1, year: year + 512 }
  } catch {
    return null
  }
}

/** Tanggal-tanggal Gregorian berikutnya yang memiliki hari + pasaran tertentu (selang 35 hari). */
export function findWeton(hari: number, pasaran: number, fromJdn0: number, count: number): number[] {
  let first = fromJdn0
  while (mod(first + 1, 7) !== hari || mod(first, 5) !== pasaran) first++
  return Array.from({ length: count }, (_, i) => first + i * 35)
}

export function validDate(y: number, m: number, d: number): boolean {
  const x = fromJdn(jdn(y, m, d))
  return x.y === y && x.m === m && x.d === d
}
