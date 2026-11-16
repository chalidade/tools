// Membaca format NIK (16 digit): PPKKCC DDMMYY SSSS. Hanya membaca susunan angka —
// tidak memastikan NIK terdaftar di Dukcapil.

export interface NikInfo {
  province: string
  regency: string
  district: string
  provinceName?: string
  regencyName?: string
  districtName?: string
  day: number
  month: number
  yy: number
  female: boolean
  sequence: string
  dateValid: boolean
}

const ACRONYMS = new Set(['DKI', 'DI', 'NTB', 'NTT', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII'])

/** "KOTA ADMINISTRASI JAKARTA PUSAT" → "Kota Administrasi Jakarta Pusat"; nama yang sudah campur huruf dibiarkan. */
export function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s
  return s
    .toLowerCase()
    .split(/(\s+|-|\/|\(|\))/)
    .map((w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')
}

export type Wilayah = Map<string, string>

export function parseWilayah(raw: string): Wilayah {
  const m: Wilayah = new Map()
  for (const line of raw.split('\n')) {
    const i = line.indexOf('|')
    if (i > 0) m.set(line.slice(0, i), titleCase(line.slice(i + 1)))
  }
  return m
}

export const cleanNik = (s: string) => s.replace(/[\s.-]/g, '')

export function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function parseNik(nik: string, w: Wilayah | null): NikInfo | null {
  if (!/^\d{16}$/.test(nik)) return null
  const rawDay = Number(nik.slice(6, 8))
  const female = rawDay > 40
  const day = female ? rawDay - 40 : rawDay
  const month = Number(nik.slice(8, 10))
  const yy = Number(nik.slice(10, 12))
  const province = nik.slice(0, 2)
  const regency = nik.slice(0, 4)
  const district = nik.slice(0, 6)
  return {
    province,
    regency,
    district,
    provinceName: w?.get(province),
    regencyName: w?.get(regency),
    districtName: w?.get(district),
    day,
    month,
    yy,
    female,
    sequence: nik.slice(12),
    dateValid: month >= 1 && month <= 12 && day >= 1 && day <= daysIn(yy % 4 === 0 ? 2000 + yy : 2001, month),
  }
}

/** Dua tahun lahir yang mungkin (abad ke-20 dan ke-21); tahun 2-digit tidak membedakan abad. */
export function birthCandidates(info: NikInfo, nowYear: number): number[] {
  const out = [1900 + info.yy, 2000 + info.yy].filter((y) => y <= nowYear && daysIn(y, info.month) >= info.day)
  return out.length ? out : []
}

export function ageOn(y: number, m: number, d: number, now: Date): number {
  let a = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--
  return a
}
