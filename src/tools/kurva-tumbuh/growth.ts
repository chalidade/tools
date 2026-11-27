import { LMS, type LmsRow } from './data'

export type Sex = 'male' | 'female'
export type Indicator = 'wfa' | 'lhfa' | 'hcfa' | 'bfa' | 'wfl' | 'wfh'

export const MAX_DAYS = 1856 // the WHO expanded tables end at day 1856 (just past 60 months)
export const DAYS_PER_MONTH = 30.4375

export interface Lms {
  L: number
  M: number
  S: number
}

/** LMS at x, linearly interpolated between neighbouring rows; null outside the table. */
export function lmsAt(ind: Indicator, sex: Sex, x: number, table: Record<string, LmsRow[]> = LMS): Lms | null {
  const t = table[`${ind}-${sex}`]
  if (!t || x < t[0][0] - 1e-9 || x > t[t.length - 1][0] + 1e-9) return null
  let lo = 0
  let hi = t.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid][0] <= x) lo = mid
    else hi = mid
  }
  const a = t[lo]
  const b = t[hi]
  const f = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0] || 1)))
  return { L: a[1] + (b[1] - a[1]) * f, M: a[2] + (b[2] - a[2]) * f, S: a[3] + (b[3] - a[3]) * f }
}

const valueAtZ = (z: number, { L, M, S }: Lms) => (L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L))

/**
 * z-score. For weight-based indicators beyond ±3 SD WHO adjusts the score so it
 * does not blow up (the "restricted" form used by the WHO Anthro software).
 */
export function zScore(x: number, p: Lms, adjust: boolean): number {
  const { L, M, S } = p
  const z = L === 0 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S)
  if (!adjust || Math.abs(z) <= 3) return z
  if (z > 3) {
    const sd3 = valueAtZ(3, p)
    const sd2 = valueAtZ(2, p)
    return 3 + (x - sd3) / (sd3 - sd2)
  }
  const n3 = valueAtZ(-3, p)
  const n2 = valueAtZ(-2, p)
  return -3 + (x - n3) / (n2 - n3)
}

export const valueForZ = (ind: Indicator, sex: Sex, x: number, z: number): number | null => {
  const p = lmsAt(ind, sex, x)
  return p ? valueAtZ(z, p) : null
}

/** Normal-CDF percentile 0–100 (Abramowitz & Stegun 7.1.26). */
export function percentile(z: number): number {
  const a = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * a)
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)
  return (z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf)) * 100
}

export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2

export type Tone = 'low' | 'ok' | 'warn' | 'high'
export interface Category {
  label: [string, string]
  tone: Tone
}
export type Measure = 'bbu' | 'tbu' | 'bbtb' | 'imtu' | 'lku'

/** Permenkes 2/2020 (Standar Antropometri Anak), Lampiran: category thresholds on z-scores. */
export function categorize(m: Measure, z: number): Category {
  switch (m) {
    case 'bbu':
      if (z < -3) return { label: ['Berat badan sangat kurang', 'Severely underweight'], tone: 'high' }
      if (z < -2) return { label: ['Berat badan kurang', 'Underweight'], tone: 'warn' }
      if (z <= 1) return { label: ['Berat badan normal', 'Normal weight'], tone: 'ok' }
      return { label: ['Risiko berat badan lebih', 'Risk of overweight'], tone: 'warn' }
    case 'tbu':
      if (z < -3) return { label: ['Sangat pendek (severely stunted)', 'Severely stunted'], tone: 'high' }
      if (z < -2) return { label: ['Pendek (stunted)', 'Stunted'], tone: 'warn' }
      if (z <= 3) return { label: ['Normal', 'Normal'], tone: 'ok' }
      return { label: ['Tinggi', 'Tall'], tone: 'low' }
    case 'bbtb':
    case 'imtu':
      if (z < -3) return { label: ['Gizi buruk', 'Severely wasted'], tone: 'high' }
      if (z < -2) return { label: ['Gizi kurang', 'Wasted'], tone: 'warn' }
      if (z <= 1) return { label: ['Gizi baik (normal)', 'Normal'], tone: 'ok' }
      if (z <= 2) return { label: ['Berisiko gizi lebih', 'Possible risk of overweight'], tone: 'warn' }
      if (z <= 3) return { label: ['Gizi lebih', 'Overweight'], tone: 'warn' }
      return { label: ['Obesitas', 'Obese'], tone: 'high' }
    case 'lku':
      if (z < -2) return { label: ['Di bawah rentang normal', 'Below the normal range'], tone: 'warn' }
      if (z <= 2) return { label: ['Dalam rentang normal', 'Within the normal range'], tone: 'ok' }
      return { label: ['Di atas rentang normal', 'Above the normal range'], tone: 'warn' }
  }
}

/** WHO "biologically implausible" limits — usually a typing slip. */
export const IMPLAUSIBLE: Record<Measure, [number, number]> = {
  bbu: [-6, 5],
  tbu: [-6, 6],
  bbtb: [-5, 5],
  imtu: [-5, 5],
  lku: [-5, 5],
}

export interface Input {
  sex: Sex
  ageDays: number
  kg?: number
  cm?: number
  hc?: number
  /** the length/height was measured lying down */
  lying: boolean
}

export interface Result {
  measure: Measure
  z: number
  pct: number
  median: number
  value: number
  cat: Category
  implausible: boolean
}

/** Standing height and recumbent length differ by 0.7 cm; WHO tables switch at 24 months (731 days). */
export const SWITCH_DAYS = 731

export function evaluate(inp: Input): Result[] {
  const { sex, ageDays } = inp
  const out: Result[] = []
  const push = (measure: Measure, ind: Indicator, x: number, value: number, adjust: boolean) => {
    const p = lmsAt(ind, sex, x)
    if (!p || !(value > 0)) return
    const z = zScore(value, p, adjust)
    const [lo, hi] = IMPLAUSIBLE[measure]
    out.push({ measure, z, pct: percentile(z), median: p.M, value, cat: categorize(measure, z), implausible: z < lo || z > hi })
  }
  const { kg, cm, hc } = inp
  // Tables below 24 months are for lying length, from 24 months for standing height.
  const under2 = ageDays < SWITCH_DAYS
  const adj = cm ? (under2 && !inp.lying ? cm + 0.7 : !under2 && inp.lying ? cm - 0.7 : cm) : undefined
  if (kg) push('bbu', 'wfa', ageDays, kg, true)
  if (adj) push('tbu', 'lhfa', ageDays, adj, false)
  if (kg && adj) push('bbtb', under2 ? 'wfl' : 'wfh', adj, kg, true)
  if (kg && adj) push('imtu', 'bfa', ageDays, bmi(kg, adj), true)
  if (hc) push('lku', 'hcfa', ageDays, hc, false)
  return out
}
