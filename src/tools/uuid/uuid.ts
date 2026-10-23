const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

function fmt(b: Uint8Array): string {
  const h = Array.from(b, (x) => HEX[x])
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`
}

export function uuidV4(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  return fmt(b)
}

/** v7: 48-bit ms timestamp, then random; a counter in the 12-bit field keeps same-ms ids ordered. */
let lastMs = -1
let seq = 0
export function uuidV7(now = Date.now()): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  if (now <= lastMs) {
    now = lastMs
    seq++
  } else {
    lastMs = now
    seq = b[6] & 0x07 // small random start leaves room to count up
  }
  if (seq > 0xfff) {
    lastMs = ++now
    seq = 0
  }
  b[0] = Math.floor(now / 2 ** 40) & 0xff
  b[1] = Math.floor(now / 2 ** 32) & 0xff
  b[2] = (now >>> 24) & 0xff
  b[3] = (now >>> 16) & 0xff
  b[4] = (now >>> 8) & 0xff
  b[5] = now & 0xff
  b[6] = 0x70 | (seq >> 8)
  b[7] = seq & 0xff
  b[8] = (b[8] & 0x3f) | 0x80
  return fmt(b)
}

export interface UuidOptions {
  version: 'v4' | 'v7'
  count: number
  upper: boolean
  hyphens: boolean
  braces: boolean
}

export function generate(o: UuidOptions): string[] {
  return Array.from({ length: o.count }, () => {
    let u = o.version === 'v7' ? uuidV7() : uuidV4()
    if (!o.hyphens) u = u.replace(/-/g, '')
    if (o.upper) u = u.toUpperCase()
    return o.braces ? `{${u}}` : u
  })
}
