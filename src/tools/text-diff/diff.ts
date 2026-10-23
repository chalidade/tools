export type Op = 'eq' | 'add' | 'del'
export interface Piece {
  op: Op
  text: string
}

/** Myers-style LCS diff over tokens, with common prefix/suffix trimmed first. */
export function diffTokens(a: string[], b: string[]): Piece[] {
  let s = 0
  while (s < a.length && s < b.length && a[s] === b[s]) s++
  let ea = a.length
  let eb = b.length
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) {
    ea--
    eb--
  }
  const A = a.slice(s, ea)
  const B = b.slice(s, eb)
  const n = A.length
  const m = B.length
  const out: Piece[] = a.slice(0, s).map((text) => ({ op: 'eq', text }))
  // Guard against huge quadratic tables: fall back to replace-all.
  if (n * m > 4_000_000) {
    A.forEach((text) => out.push({ op: 'del', text }))
    B.forEach((text) => out.push({ op: 'add', text }))
  } else {
    const w = m + 1
    const L = new Uint32Array((n + 1) * w)
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        L[i * w + j] = A[i] === B[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1])
    let i = 0
    let j = 0
    while (i < n && j < m) {
      if (A[i] === B[j]) {
        out.push({ op: 'eq', text: A[i] })
        i++
        j++
      } else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) out.push({ op: 'del', text: A[i++] })
      else out.push({ op: 'add', text: B[j++] })
    }
    while (i < n) out.push({ op: 'del', text: A[i++] })
    while (j < m) out.push({ op: 'add', text: B[j++] })
  }
  for (let k = ea; k < a.length; k++) out.push({ op: 'eq', text: a[k] })
  return out
}

export interface Options {
  ignoreCase: boolean
  ignoreSpace: boolean
}

const norm = (s: string, o: Options) => {
  if (o.ignoreSpace) s = s.trim().replace(/[ \t]+/g, ' ')
  return o.ignoreCase ? s.toLowerCase() : s
}

export interface Line {
  op: Op
  text: string
  /** Word-level pieces when a deleted line pairs with an added one. */
  parts?: Piece[]
}

export function splitLines(s: string): string[] {
  return s === '' ? [] : s.replace(/\r\n?/g, '\n').split('\n')
}

export function diffLines(left: string, right: string, o: Options): Line[] {
  const a = splitLines(left)
  const b = splitLines(right)
  const na = a.map((x) => norm(x, o))
  const nb = b.map((x) => norm(x, o))
  // Diff on normalised keys; map back to original text.
  const keyed = diffTokens(na, nb)
  const lines: Line[] = []
  let i = 0
  let j = 0
  for (const p of keyed) {
    if (p.op === 'eq') {
      lines.push({ op: 'eq', text: b[j] })
      i++
      j++
    }
    else if (p.op === 'del') lines.push({ op: 'del', text: a[i++] })
    else lines.push({ op: 'add', text: b[j++] })
  }
  return lines
}

const WORDS = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu

export function diffWords(left: string, right: string, o: Options): Piece[] {
  const a = left.match(WORDS) ?? []
  const b = right.match(WORDS) ?? []
  const key = (s: string) => (/^\s+$/.test(s) && o.ignoreSpace ? ' ' : o.ignoreCase ? s.toLowerCase() : s)
  const keyed = diffTokens(a.map(key), b.map(key))
  const out: Piece[] = []
  let i = 0
  let j = 0
  for (const p of keyed) {
    if (p.op === 'eq') {
      out.push({ op: 'eq', text: b[j] })
      i++
      j++
    }
    else if (p.op === 'del') out.push({ op: 'del', text: a[i++] })
    else out.push({ op: 'add', text: b[j++] })
  }
  return out
}

/** Pair each run of deletions with the following run of additions for word-level highlighting. */
export function withInline(lines: Line[], o: Options): Line[] {
  const out: Line[] = []
  for (let k = 0; k < lines.length; ) {
    if (lines[k].op !== 'del') {
      out.push(lines[k++])
      continue
    }
    const dels: Line[] = []
    while (k < lines.length && lines[k].op === 'del') dels.push(lines[k++])
    const adds: Line[] = []
    while (k < lines.length && lines[k].op === 'add') adds.push(lines[k++])
    const pairs = Math.min(dels.length, adds.length)
    for (let p = 0; p < pairs; p++) {
      const w = diffWords(dels[p].text, adds[p].text, o)
      dels[p] = { ...dels[p], parts: w.filter((x) => x.op !== 'add') }
      adds[p] = { ...adds[p], parts: w.filter((x) => x.op !== 'del') }
    }
    out.push(...dels, ...adds)
  }
  return out
}

export function stats(lines: Line[]) {
  return {
    added: lines.filter((l) => l.op === 'add').length,
    removed: lines.filter((l) => l.op === 'del').length,
    same: lines.filter((l) => l.op === 'eq').length,
  }
}
