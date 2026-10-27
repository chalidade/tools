const ID_ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
const ID_SCALES = ['', 'ribu', 'juta', 'miliar', 'triliun', 'kuadriliun']

function idBelow1000(n: number): string {
  const out: string[] = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h === 1) out.push('seratus')
  else if (h > 1) out.push(`${ID_ONES[h]} ratus`)
  if (r > 0) {
    if (r < 12) out.push(ID_ONES[r])
    else if (r < 20) out.push(`${ID_ONES[r - 10]} belas`)
    else {
      const t = Math.floor(r / 10)
      const o = r % 10
      out.push(`${ID_ONES[t]} puluh${o ? ' ' + ID_ONES[o] : ''}`)
    }
  }
  return out.join(' ')
}

const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion']

function enBelow1000(n: number): string {
  const out: string[] = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) out.push(`${EN_ONES[h]} hundred`)
  if (r) {
    if (r < 20) out.push(EN_ONES[r])
    else out.push(EN_TENS[Math.floor(r / 10)] + (r % 10 ? '-' + EN_ONES[r % 10] : ''))
  }
  return out.join(' ')
}

/** Splits a non-negative integer digit string into groups of three, lowest first. */
function groups(digits: string): number[] {
  const g: number[] = []
  for (let i = digits.length; i > 0; i -= 3) g.push(Number(digits.slice(Math.max(0, i - 3), i)))
  return g
}

export const MAX_DIGITS = 18

export function integerWords(digits: string, lang: 'id' | 'en'): string {
  digits = digits.replace(/^0+(?=\d)/, '')
  if (digits === '0' || digits === '') return lang === 'id' ? 'nol' : 'zero'
  const g = groups(digits)
  const parts: string[] = []
  for (let i = g.length - 1; i >= 0; i--) {
    const n = g[i]
    if (!n) continue
    if (lang === 'id') {
      if (i === 1 && n === 1) parts.push('seribu')
      else parts.push(`${idBelow1000(n)}${ID_SCALES[i] ? ' ' + ID_SCALES[i] : ''}`)
    } else {
      parts.push(`${enBelow1000(n)}${EN_SCALES[i] ? ' ' + EN_SCALES[i] : ''}`)
    }
  }
  return parts.join(' ')
}

const ID_DIGITS = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']
const EN_DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

export type Case = 'lower' | 'upper' | 'sentence' | 'title'

export function applyCase(s: string, c: Case): string {
  if (c === 'upper') return s.toUpperCase()
  if (c === 'sentence') return s.charAt(0).toUpperCase() + s.slice(1)
  if (c === 'title') return s.replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
  return s
}

export interface Parsed {
  negative: boolean
  int: string
  frac: string
}

/**
 * Reads a number typed in Indonesian style (1.234.567,89) or plain/English
 * style (1234567.89 or 1,234,567.89). Returns null when it is not a number.
 */
export function parseNumber(raw: string): Parsed | null {
  let s = raw.trim().replace(/\s/g, '')
  let negative = false
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let int = s
  let frac = ''
  const sepAt = Math.max(lastDot, lastComma)
  if (sepAt >= 0) {
    const sep = s[sepAt]
    const other = sep === '.' ? ',' : '.'
    const after = s.slice(sepAt + 1)
    const before = s.slice(0, sepAt)
    const sepCount = s.split(sep).length - 1
    const isDecimal = s.includes(other) ? true : sepCount === 1 && after.length !== 3
    if (isDecimal) {
      if (sepCount > 1 || before.includes(sep)) return null
      int = before.split(other).join('')
      frac = after
    } else {
      int = s.split(sep).join('')
    }
  }
  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) return null
  int = int.replace(/^0+(?=\d)/, '') || '0'
  if (int.length > MAX_DIGITS) return null
  return { negative, int, frac }
}

export interface Options {
  lang: 'id' | 'en'
  currency: boolean
  case: Case
}

export function toWords(p: Parsed, o: Options): string {
  const id = o.lang === 'id'
  let text: string
  if (o.currency) {
    const cents = (p.frac + '00').slice(0, 2)
    text = integerWords(p.int, o.lang)
    text += ' rupiah'
    const c = Number(cents)
    if (c > 0) text += ` ${integerWords(String(c), o.lang)} sen`
  } else {
    text = integerWords(p.int, o.lang)
    if (p.frac) {
      const digits = p.frac.split('').map((d) => (id ? ID_DIGITS : EN_DIGITS)[Number(d)])
      text += `${id ? ' koma ' : ' point '}${digits.join(' ')}`
    }
  }
  if (p.negative && (p.int !== '0' || /[1-9]/.test(p.frac))) text = `minus ${text}`
  return applyCase(text, o.case)
}
