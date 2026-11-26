// Barcode encoders (EAN-13, EAN-8, UPC-A, Code 128, Code 39) as plain bar
// patterns, plus the drawing primitives that the SVG, PNG and PDF outputs
// share. Pure code: no DOM, no dependencies.

export type BarcodeType = 'ean13' | 'ean8' | 'upca' | 'code128' | 'code39'

export const TYPES: { value: BarcodeType; label: string }[] = [
  { value: 'ean13', label: 'EAN-13' },
  { value: 'ean8', label: 'EAN-8' },
  { value: 'upca', label: 'UPC-A' },
  { value: 'code128', label: 'Code 128' },
  { value: 'code39', label: 'Code 39' },
]

export type EncodeError = 'empty' | 'digits' | 'length' | 'check' | 'chars'

export interface Encoded {
  /** One char per module: '1' bar, '0' space. Without quiet zones. */
  bars: string
  /** Human-readable text under the bars. */
  text: string
  type: BarcodeType
  /** Digits (EAN/UPC) as printed, including the check digit. */
  digits?: string
}

export type EncodeResult = { ok: true; code: Encoded } | { ok: false; error: EncodeError; expected?: number; check?: number }

/** GS1 check digit for the data digits (without the check digit itself). */
export function checkDigit(data: string): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const d = data.charCodeAt(data.length - 1 - i) - 48
    sum += i % 2 === 0 ? d * 3 : d
  }
  return (10 - (sum % 10)) % 10
}

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const R = L.map((p) => [...p].map((c) => (c === '1' ? '0' : '1')).join(''))
const G = R.map((p) => [...p].reverse().join(''))
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

const LENGTHS = { ean13: 13, ean8: 8, upca: 12 } as const

function encodeEan(type: 'ean13' | 'ean8' | 'upca', raw: string): EncodeResult {
  const value = raw.replace(/[\s-]/g, '')
  if (!value) return { ok: false, error: 'empty' }
  if (!/^\d+$/.test(value)) return { ok: false, error: 'digits' }
  const full = LENGTHS[type]
  if (value.length !== full && value.length !== full - 1) return { ok: false, error: 'length', expected: full }
  const data = value.slice(0, full - 1)
  const check = checkDigit(data)
  if (value.length === full && Number(value[full - 1]) !== check) return { ok: false, error: 'check', check }
  const digits = data + check
  // UPC-A is EAN-13 with a leading zero.
  const d = type === 'upca' ? '0' + digits : digits
  let bars = '101'
  if (type === 'ean8') {
    for (let i = 0; i < 4; i++) bars += L[+d[i]]
    bars += '01010'
    for (let i = 4; i < 8; i++) bars += R[+d[i]]
  } else {
    const parity = PARITY[+d[0]]
    for (let i = 0; i < 6; i++) bars += (parity[i] === 'L' ? L : G)[+d[i + 1]]
    bars += '01010'
    for (let i = 7; i < 13; i++) bars += R[+d[i]]
  }
  bars += '101'
  return { ok: true, code: { bars, text: digits, type, digits } }
}

// Code 128: widths of bar/space pairs per symbol (0–102 data, 103–105 start A/B/C, 106 stop).
const C128 = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232 2331112'
).split(' ')

function c128Symbol(i: number): string {
  let out = ''
  let bar = true
  for (const w of C128[i]) {
    out += (bar ? '1' : '0').repeat(+w)
    bar = !bar
  }
  return out
}

/** Code 128 symbol values for the text: set C for runs of 4+ digits, set B otherwise. */
export function code128Values(value: string): number[] | null {
  for (const ch of value) {
    const c = ch.charCodeAt(0)
    if (c < 32 || c > 126) return null
  }
  const codes: number[] = []
  let set: 'B' | 'C' | null = null
  let i = 0
  const digitRun = (from: number) => {
    let n = 0
    while (from + n < value.length && value.charCodeAt(from + n) >= 48 && value.charCodeAt(from + n) <= 57) n++
    return n
  }
  while (i < value.length) {
    const run = digitRun(i)
    const useC = run >= 4 || (run >= 2 && run === value.length - i && set === 'C')
    if (useC) {
      if (set !== 'C') {
        codes.push(set === null ? 105 : 99)
        set = 'C'
      }
      const pairs = Math.floor(run / 2)
      for (let p = 0; p < pairs; p++) codes.push(Number(value.slice(i + p * 2, i + p * 2 + 2)))
      i += pairs * 2
    } else {
      if (set !== 'B') {
        codes.push(set === null ? 104 : 100)
        set = 'B'
      }
      codes.push(value.charCodeAt(i) - 32)
      i++
    }
  }
  return codes
}

function encode128(value: string): EncodeResult {
  if (!value) return { ok: false, error: 'empty' }
  const codes = code128Values(value)
  if (!codes) return { ok: false, error: 'chars' }
  let sum = codes[0]
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i
  codes.push(sum % 103, 106)
  return { ok: true, code: { bars: codes.map(c128Symbol).join(''), text: value, type: 'code128' } }
}

// Code 39: n = narrow, w = wide, alternating bar/space starting with a bar.
const C39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw',
  C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn',
  I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww',
  O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn', $: 'nwnwnwnnn', '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
}
const C39_WIDE = 3

function encode39(raw: string): EncodeResult {
  const value = raw.toUpperCase()
  if (!value) return { ok: false, error: 'empty' }
  for (const ch of value) if (ch === '*' || !(ch in C39)) return { ok: false, error: 'chars' }
  let bars = ''
  const chars = `*${value}*`
  for (let c = 0; c < chars.length; c++) {
    let bar = true
    for (const w of C39[chars[c]]) {
      bars += (bar ? '1' : '0').repeat(w === 'w' ? C39_WIDE : 1)
      bar = !bar
    }
    if (c < chars.length - 1) bars += '0'
  }
  return { ok: true, code: { bars, text: value, type: 'code39' } }
}

export function encodeBarcode(type: BarcodeType, value: string): EncodeResult {
  if (type === 'code128') return encode128(value)
  if (type === 'code39') return encode39(value)
  return encodeEan(type, value)
}

// ---- drawing ------------------------------------------------------------

export interface DrawOpts {
  /** Width of one module, in output units. */
  module: number
  /** Bar height. */
  height: number
  showText: boolean
  /** Quiet zone, in modules, on each side. */
  quiet: number
}

export interface Drawing {
  width: number
  height: number
  rects: { x: number; y: number; w: number; h: number }[]
  texts: { s: string; x: number; y: number; size: number; anchor: 'start' | 'middle' | 'end' }[]
}

/** Turns an encoded barcode into rectangles and text lines in output units. */
export function drawBarcode(code: Encoded, o: DrawOpts): Drawing {
  const m = o.module
  const q = Math.max(o.quiet, 0) * m
  const fontSize = Math.max(8, m * 8)
  const textH = o.showText ? fontSize * 1.35 : 0
  const isEan = code.type === 'ean13' || code.type === 'ean8' || code.type === 'upca'
  const guard = isEan && o.showText ? fontSize * 0.6 : 0
  const total = code.bars.length * m + q * 2
  const rects: Drawing['rects'] = []
  // Guard bars (edges and centre) reach lower than the rest in EAN/UPC.
  const n = code.bars.length
  const guardAt = (i: number) => {
    if (!isEan) return false
    if (i < 3 || i >= n - 3) return true
    const mid = n === 67 ? 31 : 45
    return i >= mid && i < mid + 5
  }
  let i = 0
  while (i < n) {
    if (code.bars[i] !== '1') {
      i++
      continue
    }
    const g = guardAt(i)
    let j = i + 1
    while (j < n && code.bars[j] === '1' && guardAt(j) === g) j++
    rects.push({ x: q + i * m, y: 0, w: (j - i) * m, h: o.height + (g ? guard : 0) })
    i = j
  }
  const texts: Drawing['texts'] = []
  if (o.showText) {
    const y = o.height + fontSize * 1.05
    const at = (mod: number) => q + mod * m
    const d = code.digits
    if (code.type === 'ean13' && d) {
      texts.push({ s: d[0], x: at(0) - m * 1.5, y, size: fontSize, anchor: 'end' })
      texts.push({ s: d.slice(1, 7), x: at(3 + 21), y, size: fontSize, anchor: 'middle' })
      texts.push({ s: d.slice(7), x: at(50 + 21), y, size: fontSize, anchor: 'middle' })
    } else if (code.type === 'ean8' && d) {
      texts.push({ s: d.slice(0, 4), x: at(3 + 14), y, size: fontSize, anchor: 'middle' })
      texts.push({ s: d.slice(4), x: at(36 + 14), y, size: fontSize, anchor: 'middle' })
    } else if (code.type === 'upca' && d) {
      texts.push({ s: d[0], x: at(0) - m * 1.5, y, size: fontSize, anchor: 'end' })
      texts.push({ s: d.slice(1, 6), x: at(10 + 17.5), y, size: fontSize, anchor: 'middle' })
      texts.push({ s: d.slice(6, 11), x: at(50 + 17.5), y, size: fontSize, anchor: 'middle' })
      texts.push({ s: d[11], x: at(n) + m * 1.5, y, size: fontSize, anchor: 'start' })
    } else {
      texts.push({ s: code.type === 'code39' ? `*${code.text}*` : code.text, x: total / 2, y, size: fontSize, anchor: 'middle' })
    }
  }
  return { width: total, height: o.height + textH + guard * 0.2, rects, texts }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function drawingToSvg(d: Drawing, fg = '#000', bg = '#fff'): string {
  const f = (n: number) => +n.toFixed(3)
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f(d.width)}" height="${f(d.height)}" viewBox="0 0 ${f(d.width)} ${f(d.height)}">`,
    `<rect width="100%" height="100%" fill="${bg}"/>`,
    `<g fill="${fg}">`,
    ...d.rects.map((r) => `<rect x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}"/>`),
    '</g>',
    `<g fill="${fg}" font-family="Helvetica, Arial, sans-serif">`,
    ...d.texts.map((t) => `<text x="${f(t.x)}" y="${f(t.y)}" font-size="${f(t.size)}" text-anchor="${t.anchor}">${esc(t.s)}</text>`),
    '</g>',
    '</svg>',
  ]
  return parts.join('')
}

/** Splits a pasted list into one value per line, dropping blanks. */
export function parseLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
}
