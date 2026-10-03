// A small JSON parser and printer that keeps every literal exactly as written.
//
// JSON.parse turns numbers into JS doubles, so reformatting through it would
// silently change data: 12345678901234567890 becomes 12345678901234567000 and
// 1.0 becomes 1. Here strings and numbers are validated but kept as their
// original source text, so beautify/minify only ever change whitespace (and
// key order, when asked).

export type JsonNode =
  | { type: 'object'; entries: { key: string; value: JsonNode }[] }
  | { type: 'array'; items: JsonNode[] }
  /** `raw` is the literal exactly as written: a quoted string, number, true, false or null. */
  | { type: 'literal'; raw: string }

export class JsonSyntaxError extends Error {
  /** 1-based position of the problem. */
  line: number
  column: number
  offset: number

  constructor(message: string, source: string, offset: number) {
    super(message)
    this.offset = offset
    const before = source.slice(0, offset)
    this.line = before.split('\n').length
    this.column = offset - before.lastIndexOf('\n')
  }
}

/** Deeper than this is almost certainly not hand-written data — and would overflow the stack. */
const MAX_DEPTH = 5000

export function parseJson(source: string): JsonNode {
  // A UTF-8 byte order mark is common in files saved by Windows tools.
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source
  let i = 0

  const fail = (message: string, at = i): never => {
    throw new JsonSyntaxError(message, text, at)
  }
  const describe = (at: number) => (at >= text.length ? 'akhir data' : `karakter ${JSON.stringify(text[at])}`)

  const skipSpace = () => {
    while (i < text.length) {
      const c = text.charCodeAt(i)
      if (c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09) i++
      else break
    }
  }

  const readString = (): string => {
    const start = i
    i++ // opening quote
    while (i < text.length) {
      const c = text.charCodeAt(i)
      if (c === 0x22) {
        i++
        return text.slice(start, i)
      }
      if (c === 0x5c) {
        const e = text[i + 1]
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6)))
            fail('Escape \\u harus diikuti 4 digit heksadesimal', i)
          i += 6
        } else if (e !== undefined && '"\\/bfnrt'.includes(e)) i += 2
        else fail(`Escape tidak dikenal: \\${e ?? ''}`, i)
      } else if (c < 0x20) {
        fail(
          c === 0x0a ? 'String belum ditutup sebelum ganti baris' : 'Karakter kontrol di dalam string harus di-escape',
          i,
        )
      } else i++
    }
    return fail('String belum ditutup (tanda kutip " penutup tidak ada)', start)
  }

  const readNumber = (): string => {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400))
    if (!match || !match[0] || match[0] === '-') fail(`Angka tidak valid di ${describe(i)}`)
    const raw = match![0]
    // "01" or "1." etc.: valid prefix followed by more number characters.
    if (/[\d.eE+-]/.test(text[i + raw.length] ?? ''))
      fail('Format angka tidak valid (angka 0 di depan atau titik tanpa digit?)', i)
    i += raw.length
    return raw
  }

  const readValue = (depth: number): JsonNode => {
    if (depth > MAX_DEPTH) fail('Data terlalu dalam bersarang')
    skipSpace()
    const c = text[i]
    if (c === '{') {
      i++
      const entries: { key: string; value: JsonNode }[] = []
      skipSpace()
      if (text[i] === '}') {
        i++
        return { type: 'object', entries }
      }
      for (;;) {
        skipSpace()
        if (text[i] !== '"') {
          if (text[i] === '}' && entries.length) fail('Koma berlebih sebelum }', i)
          fail(`Diharapkan nama key dalam tanda kutip ganda, ditemukan ${describe(i)}`)
        }
        const key = readString()
        skipSpace()
        if (text[i] !== ':') fail(`Diharapkan ':' setelah key ${key}, ditemukan ${describe(i)}`)
        i++
        const value = readValue(depth + 1)
        entries.push({ key, value })
        skipSpace()
        if (text[i] === ',') {
          i++
          continue
        }
        if (text[i] === '}') {
          i++
          return { type: 'object', entries }
        }
        fail(`Diharapkan ',' atau '}' setelah nilai, ditemukan ${describe(i)}`)
      }
    }
    if (c === '[') {
      i++
      const items: JsonNode[] = []
      skipSpace()
      if (text[i] === ']') {
        i++
        return { type: 'array', items }
      }
      for (;;) {
        skipSpace()
        if (text[i] === ']' && items.length) fail('Koma berlebih sebelum ]', i)
        items.push(readValue(depth + 1))
        skipSpace()
        if (text[i] === ',') {
          i++
          continue
        }
        if (text[i] === ']') {
          i++
          return { type: 'array', items }
        }
        fail(`Diharapkan ',' atau ']' setelah nilai, ditemukan ${describe(i)}`)
      }
    }
    if (c === '"') return { type: 'literal', raw: readString() }
    if (c === '-' || (c >= '0' && c <= '9')) return { type: 'literal', raw: readNumber() }
    for (const word of ['true', 'false', 'null'])
      if (text.startsWith(word, i)) {
        i += word.length
        return { type: 'literal', raw: word }
      }
    if (c === "'") return fail('String JSON harus memakai tanda kutip ganda ", bukan kutip tunggal')
    if (c === '/') return fail('JSON tidak mengizinkan komentar')
    if (i >= text.length) return fail('Data berakhir terlalu cepat — ada kurung yang belum ditutup?')
    return fail(`Nilai tidak valid: ${describe(i)}`)
  }

  skipSpace()
  if (i >= text.length) fail('Belum ada JSON untuk diproses')
  const root = readValue(0)
  skipSpace()
  if (i < text.length) fail(`Ada data tambahan setelah JSON selesai: ${describe(i)}`)
  return root
}

export type Indent = 2 | 4 | 'tab'

/** Keys compare by their decoded text, so "a" sorts with "a". */
const keyText = (raw: string) => {
  try {
    return JSON.parse(raw) as string
  } catch {
    return raw
  }
}

export function formatJson(node: JsonNode, opts: { indent: Indent; sortKeys: boolean }): string {
  const unit = opts.indent === 'tab' ? '\t' : ' '.repeat(opts.indent)
  const out: string[] = []
  const write = (n: JsonNode, pad: string) => {
    if (n.type === 'literal') {
      out.push(n.raw)
      return
    }
    const inner = pad + unit
    if (n.type === 'array') {
      if (!n.items.length) return void out.push('[]')
      out.push('[\n')
      n.items.forEach((item, k) => {
        out.push(inner)
        write(item, inner)
        out.push(k < n.items.length - 1 ? ',\n' : '\n')
      })
      out.push(pad, ']')
      return
    }
    if (!n.entries.length) return void out.push('{}')
    const entries = opts.sortKeys
      ? [...n.entries].sort((a, b) => {
          const x = keyText(a.key)
          const y = keyText(b.key)
          return x < y ? -1 : x > y ? 1 : 0
        })
      : n.entries
    out.push('{\n')
    entries.forEach((e, k) => {
      out.push(inner, e.key, ': ')
      write(e.value, inner)
      out.push(k < entries.length - 1 ? ',\n' : '\n')
    })
    out.push(pad, '}')
  }
  write(node, '')
  return out.join('') + '\n'
}

export function minifyJson(node: JsonNode): string {
  const out: string[] = []
  const write = (n: JsonNode) => {
    if (n.type === 'literal') return void out.push(n.raw)
    if (n.type === 'array') {
      out.push('[')
      n.items.forEach((item, k) => {
        if (k) out.push(',')
        write(item)
      })
      return void out.push(']')
    }
    out.push('{')
    n.entries.forEach((e, k) => {
      if (k) out.push(',')
      out.push(e.key, ':')
      write(e.value)
    })
    out.push('}')
  }
  write(node)
  return out.join('')
}

/** Counts for the summary line. */
export function stats(node: JsonNode) {
  let keys = 0
  let depth = 0
  const walk = (n: JsonNode, d: number) => {
    depth = Math.max(depth, d)
    if (n.type === 'object') {
      keys += n.entries.length
      for (const e of n.entries) walk(e.value, d + 1)
    } else if (n.type === 'array') for (const item of n.items) walk(item, d + 1)
  }
  walk(node, 0)
  return { keys, depth }
}
