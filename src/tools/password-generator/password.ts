// Password and passphrase generation with crypto.getRandomValues, plus a strength estimate.

export const LOWER = 'abcdefghijkmnopqrstuvwxyz'
export const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const DIGITS = '23456789'
export const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?'
const AMBIGUOUS = 'lIO01'
const FULL_LOWER = 'abcdefghijklmnopqrstuvwxyz'
const FULL_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const FULL_DIGITS = '0123456789'

/** Uniform random integer in [0, max) without modulo bias. */
export function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

export interface PasswordOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  /** Drop look-alike characters (l I O 0 1). */
  noAmbiguous: boolean
}

export function charPools(o: PasswordOptions): string[] {
  const strip = (s: string) => (o.noAmbiguous ? [...s].filter((c) => !AMBIGUOUS.includes(c)).join('') : s)
  const pools: string[] = []
  if (o.lower) pools.push(strip(o.noAmbiguous ? LOWER : FULL_LOWER))
  if (o.upper) pools.push(strip(o.noAmbiguous ? UPPER : FULL_UPPER))
  if (o.digits) pools.push(strip(o.noAmbiguous ? DIGITS : FULL_DIGITS))
  if (o.symbols) pools.push(SYMBOLS)
  return pools
}

/** Random password that contains at least one character of every chosen kind. */
export function generatePassword(o: PasswordOptions): string {
  const pools = charPools(o)
  if (!pools.length) return ''
  const all = pools.join('')
  const chars: string[] = pools.map((p) => p[randomInt(p.length)])
  while (chars.length < o.length) chars.push(all[randomInt(all.length)])
  const out = chars.slice(0, Math.max(o.length, pools.length))
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join('')
}

export function passwordEntropy(o: PasswordOptions): number {
  const pools = charPools(o)
  const size = new Set(pools.join('')).size
  return size ? Math.max(o.length, pools.length) * Math.log2(size) : 0
}

export interface PassphraseOptions {
  words: number
  separator: string
  capitalize: boolean
  number: boolean
}

export function generatePassphrase(list: readonly string[], o: PassphraseOptions): string {
  const picked = Array.from({ length: o.words }, () => {
    const w = list[randomInt(list.length)]
    return o.capitalize ? w[0].toUpperCase() + w.slice(1) : w
  })
  if (o.number) picked[randomInt(picked.length)] += String(randomInt(10))
  return picked.join(o.separator)
}

export function passphraseEntropy(listSize: number, o: PassphraseOptions): number {
  return o.words * Math.log2(listSize) + (o.number ? Math.log2(10 * o.words) : 0)
}

const COMMON = [
  'password', 'passw0rd', 'qwerty', 'qwertyuiop', 'asdfgh', 'zxcvbn', 'abc123', 'letmein', 'welcome', 'admin',
  'iloveyou', 'monkey', 'dragon', 'football', 'login', 'master', 'sunshine', 'princess', 'rahasia', 'sayang',
  'bismillah', 'indonesia', 'jakarta', 'kamu', 'cintaku', 'passwordku', 'kucing', 'bahagia',
]

/** Entropy estimate (bits) of a typed password, with penalties for patterns people actually use. */
export function estimateStrength(pw: string): number {
  if (!pw) return 0
  let pool = 0
  if (/[a-z]/.test(pw)) pool += 26
  if (/[A-Z]/.test(pw)) pool += 26
  if (/[0-9]/.test(pw)) pool += 10
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 30
  const chars = [...pw]
  let bits = chars.length * Math.log2(pool)
  // Repeated characters add almost nothing.
  const unique = new Set(chars.map((c) => c.toLowerCase())).size
  bits = Math.min(bits, bits * 0.5 + unique * Math.log2(Math.max(pool, 2)) * 0.5)
  // Runs like abcd / 4321 / aaaa.
  let runs = 0
  for (let i = 2; i < chars.length; i++) {
    const a = chars[i - 2].charCodeAt(0)
    const b = chars[i - 1].charCodeAt(0)
    const c = chars[i].charCodeAt(0)
    if (b - a === c - b && Math.abs(b - a) <= 1) runs++
  }
  bits -= runs * Math.log2(Math.max(pool, 2)) * 0.8
  const lower = pw.toLowerCase()
  if (COMMON.some((w) => lower.includes(w))) bits = Math.min(bits, 20 + Math.max(0, chars.length - 8) * 2)
  return Math.max(0, bits)
}

export const GUESSES_PER_SECOND = 1e10

/** Average seconds to guess by brute force at an offline attacker's speed. */
export function secondsToGuess(bits: number): number {
  return Math.pow(2, Math.max(bits - 1, 0)) / GUESSES_PER_SECOND
}

export type Level = 0 | 1 | 2 | 3 | 4

export function level(bits: number): Level {
  if (bits < 40) return 0
  if (bits < 60) return 1
  if (bits < 80) return 2
  if (bits < 100) return 3
  return 4
}

/** Human duration as [value, unit key]; unit keys are translated by the UI. */
export function duration(seconds: number): { value: number; unit: 'instant' | 's' | 'min' | 'h' | 'd' | 'y' | 'ky' | 'my' | 'by' | 'forever' } {
  if (seconds < 1) return { value: 0, unit: 'instant' }
  if (seconds < 60) return { value: Math.round(seconds), unit: 's' }
  if (seconds < 3600) return { value: Math.round(seconds / 60), unit: 'min' }
  if (seconds < 86400) return { value: Math.round(seconds / 3600), unit: 'h' }
  if (seconds < 86400 * 365) return { value: Math.round(seconds / 86400), unit: 'd' }
  const years = seconds / (86400 * 365)
  if (years < 1000) return { value: Math.round(years), unit: 'y' }
  if (years < 1e6) return { value: Math.round(years / 1e3), unit: 'ky' }
  if (years < 1e9) return { value: Math.round(years / 1e6), unit: 'my' }
  if (years < 1e12) return { value: Math.round(years / 1e9), unit: 'by' }
  return { value: 0, unit: 'forever' }
}
