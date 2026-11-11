// Fair random draws and arisan rounds: pure logic, no React.

/** Uniform integer in [0, n) from crypto.getRandomValues, without modulo bias. */
export function randomInt(n: number): number {
  if (n <= 0) return 0
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / n) * n
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return buf[0] % n
}

export function parseNames(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

/** Remove duplicates (case-insensitive), keeping the first spelling. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>()
  return names.filter((n) => {
    const k = n.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export type DrawEntry = { name: string; at: number; round: number }

export type Mode = 'random' | 'arisan'

/** Names still eligible: arisan excludes winners of the current round. */
export function eligible(names: string[], history: DrawEntry[], mode: Mode, round: number): string[] {
  if (mode === 'random') return names
  const won = new Set(history.filter((h) => h.round === round).map((h) => h.name))
  return names.filter((n) => !won.has(n))
}

/** The round the next arisan draw belongs to: a new one starts once everyone has won. */
export function currentRound(names: string[], history: DrawEntry[]): number {
  let round = 1
  for (const h of history) round = Math.max(round, h.round)
  const won = new Set(history.filter((h) => h.round === round).map((h) => h.name))
  if (names.length && names.every((n) => won.has(n))) round++
  return round
}

export function pick(pool: string[]): string | null {
  return pool.length ? pool[randomInt(pool.length)] : null
}
