// A small expression evaluator for the calculator: a tokenizer and a
// recursive-descent parser, never eval(). It reads what people type on a
// phone calculator: × ÷ − as well as * / -, a comma or a dot as the decimal
// point, implicit multiplication (2π, 3(4+5)), postfix ! and %, and the
// phone-calculator percent rule: 200 + 10% = 220, 200 − 10% = 180.

import { getLang, locale, tr } from '@/lib/i18n'

export type AngleMode = 'deg' | 'rad'

export class CalcError extends Error {}

type Token =
  | { t: 'num'; v: number }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' | '%' | '!' | '(' | ')' | '√' | '∛' }
  | { t: 'id'; v: string }

const FUNCTIONS = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'ln', 'log', 'abs', 'sqrt', 'cbrt'] as const
const CONSTANTS: Record<string, number> = { π: Math.PI, pi: Math.PI, e: Math.E }

function tokenize(input: string): Token[] {
  const s = input
    .replace(/[×xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
  const tokens: Token[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/[0-9.,]/.test(c)) {
      let j = i
      while (j < s.length && /[0-9.,]/.test(s[j])) j++
      const raw = s.slice(i, j).replace(/,/g, '.')
      if ((raw.match(/\./g) ?? []).length > 1 || raw === '.') throw new CalcError(tr('Angka tidak valid', 'Invalid number'))
      tokens.push({ t: 'num', v: Number(raw) })
      i = j
      // Scientific notation the formatter itself produces: 1,5e+20
      if (s[i] === 'e' && /[+-]?\d/.test(s.slice(i + 1, i + 3))) {
        let k = i + 1
        if (s[k] === '+' || s[k] === '-') k++
        while (k < s.length && /\d/.test(s[k])) k++
        const last = tokens.pop() as { t: 'num'; v: number }
        tokens.push({ t: 'num', v: last.v * 10 ** Number(s.slice(i + 1, k)) })
        i = k
      }
      continue
    }
    if ('+-*/^%!()√∛'.includes(c)) {
      tokens.push({ t: 'op', v: c } as Token)
      i++
      continue
    }
    if (c === 'π') {
      tokens.push({ t: 'id', v: 'π' })
      i++
      continue
    }
    if (/[a-z]/i.test(c)) {
      let j = i
      while (j < s.length && /[a-z]/i.test(s[j])) j++
      let word = s.slice(i, j).toLowerCase()
      // "sine" written next to a constant, e.g. "sinπ", splits into known names.
      while (word) {
        const known = [...FUNCTIONS, 'ans', 'pi', 'e'].find((f) => word.startsWith(f))
        if (!known) throw new CalcError(tr(`Tidak dikenal: ${word}`, `Unknown: ${word}`))
        tokens.push({ t: 'id', v: known })
        word = word.slice(known.length)
      }
      i = j
      continue
    }
    throw new CalcError(tr(`Karakter tidak dikenal: ${c}`, `Unknown character: ${c}`))
  }
  return tokens
}

function factorial(n: number) {
  if (n < 0 || !Number.isInteger(n)) throw new CalcError(tr('Faktorial hanya untuk bilangan bulat ≥ 0', 'Factorial only works on whole numbers ≥ 0'))
  if (n > 170) return Infinity
  let r = 1
  for (let k = 2; k <= n; k++) r *= k
  return r
}

/** Evaluates an expression. Throws CalcError with a message in the current language on bad input. */
export function evaluate(input: string, opts: { angle?: AngleMode; ans?: number } = {}): number {
  const angle = opts.angle ?? 'deg'
  const toRad = (x: number) => (angle === 'deg' ? (x * Math.PI) / 180 : x)
  const fromRad = (x: number) => (angle === 'deg' ? (x * 180) / Math.PI : x)
  const tokens = tokenize(input)
  if (!tokens.length) throw new CalcError(tr('Kosong', 'Empty'))
  let pos = 0
  const peek = () => tokens[pos]
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v

  // A factor can start here — for implicit multiplication like 2π or 3(4+5).
  const startsFactor = () => {
    const t = peek()
    return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && (t.v === '(' || t.v === '√' || t.v === '∛')))
  }

  function expr(): number {
    let acc = term().v
    while (isOp('+') || isOp('-')) {
      const op = (tokens[pos++] as { v: string }).v
      const right = term()
      // Phone-calculator percent: a ± b% means a ± (a × b / 100).
      const amount = right.pct ? acc * right.v : right.v
      acc = op === '+' ? acc + amount : acc - amount
    }
    return acc
  }

  function term(): { v: number; pct: boolean } {
    let first = unary()
    let acc = first.v
    let pct = first.pct
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (tokens[pos++] as { v: string }).v
        const right = unary().v
        if (op === '/' && right === 0) throw new CalcError(tr('Tidak bisa dibagi nol', 'Can’t divide by zero'))
        acc = op === '*' ? acc * right : acc / right
        pct = false
      } else if (startsFactor()) {
        acc *= unary().v
        pct = false
      } else break
    }
    first = { v: acc, pct }
    return first
  }

  function unary(): { v: number; pct: boolean } {
    if (isOp('-')) {
      pos++
      const r = unary()
      return { v: -r.v, pct: r.pct }
    }
    if (isOp('+')) {
      pos++
      return unary()
    }
    return power()
  }

  function power(): { v: number; pct: boolean } {
    const base = postfix()
    if (isOp('^')) {
      pos++
      // Right-associative: 2^3^2 = 2^9.
      return { v: base.v ** unary().v, pct: false }
    }
    return base
  }

  function postfix(): { v: number; pct: boolean } {
    let v = primary()
    let pct = false
    for (;;) {
      if (isOp('!')) {
        pos++
        v = factorial(v)
        pct = false
      } else if (isOp('%')) {
        pos++
        v /= 100
        pct = true
      } else break
    }
    return { v, pct }
  }

  function primary(): number {
    const t = peek()
    if (!t) throw new CalcError(tr('Ekspresi belum lengkap', 'Incomplete expression'))
    pos++
    if (t.t === 'num') return t.v
    if (t.t === 'op') {
      if (t.v === '(') {
        const v = expr()
        // A missing closing bracket at the very end is forgiven, like phone calculators do.
        if (isOp(')')) pos++
        else if (peek()) throw new CalcError(tr('Kurung tidak seimbang', 'Unbalanced brackets'))
        return v
      }
      if (t.v === '√') {
        const v = unary().v
        if (v < 0) throw new CalcError(tr('Akar dari bilangan negatif', 'Square root of a negative number'))
        return Math.sqrt(v)
      }
      if (t.v === '∛') return Math.cbrt(unary().v)
      throw new CalcError(tr('Ekspresi belum lengkap', 'Incomplete expression'))
    }
    // Identifiers: constants, ans, functions.
    if (t.v in CONSTANTS) return CONSTANTS[t.v]
    if (t.v === 'ans') return opts.ans ?? 0
    const arg = postfix().v
    switch (t.v) {
      case 'sin':
        return Math.sin(toRad(arg))
      case 'cos':
        return Math.cos(toRad(arg))
      case 'tan': {
        // tan(90°) is undefined, not 1.6e16.
        if (angle === 'deg' && Math.abs(((arg % 180) + 180) % 180 - 90) < 1e-9) throw new CalcError(tr('Tidak terdefinisi', 'Undefined'))
        return Math.tan(toRad(arg))
      }
      case 'asin':
        if (Math.abs(arg) > 1) throw new CalcError(tr('asin hanya untuk −1 sampai 1', 'asin only works from −1 to 1'))
        return fromRad(Math.asin(arg))
      case 'acos':
        if (Math.abs(arg) > 1) throw new CalcError(tr('acos hanya untuk −1 sampai 1', 'acos only works from −1 to 1'))
        return fromRad(Math.acos(arg))
      case 'atan':
        return fromRad(Math.atan(arg))
      case 'ln':
        if (arg <= 0) throw new CalcError(tr('ln hanya untuk bilangan positif', 'ln only works on positive numbers'))
        return Math.log(arg)
      case 'log':
        if (arg <= 0) throw new CalcError(tr('log hanya untuk bilangan positif', 'log only works on positive numbers'))
        return Math.log10(arg)
      case 'abs':
        return Math.abs(arg)
      case 'sqrt':
        if (arg < 0) throw new CalcError(tr('Akar dari bilangan negatif', 'Square root of a negative number'))
        return Math.sqrt(arg)
      case 'cbrt':
        return Math.cbrt(arg)
    }
    throw new CalcError(tr(`Tidak dikenal: ${t.v}`, `Unknown: ${t.v}`))
  }

  const value = expr()
  if (pos < tokens.length) throw new CalcError(isOp(')') ? tr('Kurung tidak seimbang', 'Unbalanced brackets') : tr('Ekspresi tidak valid', 'Invalid expression'))
  if (Number.isNaN(value)) throw new CalcError(tr('Hasil tidak terdefinisi', 'Result is undefined'))
  if (!Number.isFinite(value)) throw new CalcError(tr('Hasil terlalu besar', 'Result is too large'))
  return value
}

/**
 * Rounds away binary noise (0.1 + 0.2 → 0.3, sin(180°) → 0) by keeping 12
 * significant digits.
 */
export function clean(n: number) {
  if (n === 0) return 0
  const r = Number(n.toPrecision(12))
  return Math.abs(r) < 1e-12 ? 0 : r
}

/** The decimal separator for the current language: "," in Indonesian, "." in English. */
export const decimalPoint = () => (getLang() === 'en' ? '.' : ',')

/**
 * "1.234.567,89" in Indonesian, "1,234,567.89" in English; scientific notation
 * for huge or tiny numbers.
 */
export function formatNumber(n: number) {
  const v = clean(n)
  const abs = Math.abs(v)
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    return v.toExponential(8).replace(/\.?0+e/, 'e').replace('.', decimalPoint())
  }
  return v.toLocaleString(locale(), { maximumFractionDigits: 10 })
}

/** The same number as text the input accepts back: no grouping, the language's decimal point. */
export function plainNumber(n: number) {
  const v = clean(n)
  const abs = Math.abs(v)
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    return v.toExponential(8).replace(/\.?0+e/, 'e').replace('.', decimalPoint())
  }
  return String(v).replace('.', decimalPoint())
}
