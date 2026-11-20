// A cron reader written in-house so its sentences can be both Indonesian and English.
import { tr } from '@/lib/i18n'

export interface Field {
  name: 'second' | 'minute' | 'hour' | 'dom' | 'month' | 'dow'
  min: number
  max: number
  names?: string[]
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const FIELDS: Field[] = [
  { name: 'second', min: 0, max: 59 },
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dom', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: MONTHS },
  { name: 'dow', min: 0, max: 7, names: DAYS },
]

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

export class CronError extends Error {
  /** Which field is wrong (0 = minute, or seconds in a 6-field expression), -1 for the whole expression. */
  readonly field: number
  constructor(message: string, field: number) {
    super(message)
    this.field = field
  }
}

export interface Parsed {
  /** The text of each field, seconds first ("0" when the expression has 5 fields). */
  parts: string[]
  sets: Set<number>[]
  hasSeconds: boolean
  /** Day of month and day of week both restricted: either one matching is enough (classic cron). */
  domOrDow: boolean
}

const fieldLabel = (f: Field['name']) =>
  ({
    second: tr('detik', 'second'),
    minute: tr('menit', 'minute'),
    hour: tr('jam', 'hour'),
    dom: tr('tanggal', 'day of month'),
    month: tr('bulan', 'month'),
    dow: tr('hari', 'day of week'),
  })[f]

function value(text: string, f: Field, index: number) {
  const named = f.names?.indexOf(text.toUpperCase().slice(0, 3)) ?? -1
  const n = named >= 0 && /^[a-z]{3}$/i.test(text) ? named + (f.name === 'month' ? 1 : 0) : /^\d+$/.test(text) ? Number(text) : NaN
  if (Number.isNaN(n) || n < f.min || n > f.max)
    throw new CronError(tr(`Nilai "${text}" tidak valid untuk ${fieldLabel(f.name)} (${f.min}–${f.max}).`, `"${text}" is not valid for ${fieldLabel(f.name)} (${f.min}–${f.max}).`), index)
  return n
}

function parseField(text: string, f: Field, index: number) {
  const set = new Set<number>()
  for (const item of text.split(',')) {
    const [range, stepText] = item.split('/')
    const step = stepText === undefined ? 1 : Number(stepText)
    if (!Number.isInteger(step) || step < 1 || (stepText !== undefined && !/^\d+$/.test(stepText)))
      throw new CronError(tr(`Langkah "/${stepText}" tidak valid.`, `Step "/${stepText}" is not valid.`), index)
    let lo: number
    let hi: number
    if (range === '*' || range === '?') [lo, hi] = [f.min, f.name === 'dow' ? 6 : f.max]
    else if (range.includes('-')) {
      const [a, b] = range.split('-')
      lo = value(a, f, index)
      hi = value(b, f, index)
      if (lo > hi) throw new CronError(tr(`Rentang "${range}" terbalik.`, `Range "${range}" is reversed.`), index)
    } else {
      lo = value(range, f, index)
      hi = stepText === undefined ? lo : f.max
    }
    for (let v = lo; v <= hi; v += step) set.add(f.name === 'dow' && v === 7 ? 0 : v)
  }
  return set
}

export function parseCron(expression: string): Parsed {
  const text = MACROS[expression.trim().toLowerCase()] ?? expression.trim()
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length !== 5 && parts.length !== 6)
    throw new CronError(tr(`Harus 5 kolom (atau 6 dengan detik), ini ${parts.length}.`, `Needs 5 fields (or 6 with seconds), got ${parts.length}.`), -1)
  const hasSeconds = parts.length === 6
  const all = hasSeconds ? parts : ['0', ...parts]
  const sets = all.map((p, i) => parseField(p, FIELDS[i], hasSeconds ? i : i - 1))
  const restricted = (p: string) => p !== '*' && p !== '?'
  return { parts: all, sets, hasSeconds, domOrDow: restricted(all[3]) && restricted(all[5]) }
}

function dayMatches(p: Parsed, d: Date) {
  const dom = p.sets[3].has(d.getDate())
  const dow = p.sets[5].has(d.getDay())
  if (p.domOrDow) return dom || dow
  return dom && dow
}

/** The next `count` times the schedule fires after `from`, in the device's time zone. */
export function nextRuns(p: Parsed, from: Date, count = 5): Date[] {
  const out: Date[] = []
  const d = new Date(from.getTime())
  d.setMilliseconds(0)
  d.setSeconds(d.getSeconds() + 1)
  const limit = from.getTime() + 5 * 366 * 86400000
  while (out.length < count && d.getTime() < limit) {
    if (!p.sets[4].has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1)
      d.setHours(0, 0, 0)
      continue
    }
    if (!dayMatches(p, d)) {
      d.setDate(d.getDate() + 1)
      d.setHours(0, 0, 0)
      continue
    }
    if (!p.sets[2].has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0)
      continue
    }
    if (!p.sets[1].has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0)
      continue
    }
    if (!p.sets[0].has(d.getSeconds())) {
      d.setSeconds(d.getSeconds() + 1)
      continue
    }
    out.push(new Date(d.getTime()))
    d.setSeconds(d.getSeconds() + 1)
  }
  return out
}

// --- Sentences ---

const pad = (n: number) => String(n).padStart(2, '0')
const monthName = (m: number) => new Intl.DateTimeFormat(tr('id-ID', 'en-US'), { month: 'long' }).format(new Date(2024, m - 1, 1))
const dayName = (d: number) => new Intl.DateTimeFormat(tr('id-ID', 'en-US'), { weekday: 'long' }).format(new Date(2024, 0, 7 + d))

function joinList(items: string[]) {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} ${tr('dan', 'and')} ${items[items.length - 1]}`
}

const isStar = (s: string) => s === '*' || s === '?'
const single = (s: string) => /^\d+$/.test(s)

/** One field in words, e.g. "setiap 15 menit", "jam 9 sampai 17", "hari Senin dan Jumat". */
function describeField(text: string, f: Field): string {
  const label = fieldLabel(f.name)
  const show = (v: string) => {
    const n = f.names && /^[a-z]{3}$/i.test(v) ? f.names.indexOf(v.toUpperCase()) + (f.name === 'month' ? 1 : 0) : Number(v)
    if (f.name === 'month') return monthName(n)
    if (f.name === 'dow') return dayName(n % 7)
    return String(n)
  }
  const items = text.split(',').map((item) => {
    const [range, step] = item.split('/')
    const span = range.includes('-') ? range.split('-').map(show) : null
    if (step) {
      const every = tr(`setiap ${step} ${label}`, `every ${step} ${label}s`)
      if (isStar(range)) return every
      if (span) return tr(`${every} dari ${span[0]} sampai ${span[1]}`, `${every} from ${span[0]} through ${span[1]}`)
      return tr(`${every} mulai ${show(range)}`, `${every} starting at ${show(range)}`)
    }
    if (span) return tr(`${span[0]} sampai ${span[1]}`, `${span[0]} through ${span[1]}`)
    return show(range)
  })
  const stepped = items.some((i) => i.startsWith(tr('setiap', 'every')))
  return stepped && items.length === 1 ? items[0] : `${label} ${joinList(items)}`
}

/** The whole schedule as one sentence. */
export function describe(p: Parsed): string {
  const [sec, min, hour, dom, month, dow] = p.parts
  const bits: string[] = []

  // Time of day.
  if (single(min) && single(hour) && (!p.hasSeconds || single(sec)))
    bits.push(tr('pukul ', 'at ') + `${pad(+hour)}:${pad(+min)}` + (p.hasSeconds && +sec ? `:${pad(+sec)}` : ''))
  else {
    if (p.hasSeconds && !(single(sec) && +sec === 0)) bits.push(isStar(sec) ? tr('setiap detik', 'every second') : describeField(sec, FIELDS[0]))
    if (isStar(min)) {
      if (!p.hasSeconds || single(sec)) bits.push(tr('setiap menit', 'every minute'))
    } else if (single(min) && isStar(hour)) bits.push(tr(`pada menit ke-${+min} setiap jam`, `at minute ${+min} of every hour`))
    else if (single(min)) bits.push(tr(`pada menit ke-${+min}`, `at minute ${+min}`))
    else bits.push(describeField(min, FIELDS[1]))
    if (!isStar(hour) && !(single(min) && single(hour))) bits.push(describeField(hour, FIELDS[2]))
  }

  // Days.
  const days: string[] = []
  if (!isStar(dom)) days.push(describeField(dom, FIELDS[3]))
  if (!isStar(dow)) days.push(describeField(dow, FIELDS[5]))
  if (days.length) bits.push(days.join(p.domOrDow ? tr(' atau ', ' or ') : ', '))
  else if (single(min) && single(hour)) bits.push(tr('setiap hari', 'every day'))
  if (!isStar(month)) bits.push(describeField(month, FIELDS[4]))

  const sentence = bits.join(', ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
}
