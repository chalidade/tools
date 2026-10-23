import { tr } from '@/lib/i18n'

export type Mode = 'base64' | 'url' | 'html' | 'jwt'

const enc = new TextEncoder()
const dec = new TextDecoder('utf-8', { fatal: true })

export function base64Encode(text: string, urlSafe = false): string {
  let bin = ''
  for (const b of enc.encode(text)) bin += String.fromCharCode(b)
  const out = btoa(bin)
  return urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out
}

export function base64Decode(input: string): string {
  let s = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 === 1) {
    throw new Error(tr('Bukan Base64 yang valid.', 'Not valid Base64.'))
  }
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  try {
    return dec.decode(bytes)
  } catch {
    throw new Error(tr('Hasilnya bukan teks UTF-8 (mungkin data biner).', 'The result is not UTF-8 text (maybe binary data).'))
  }
}

export function urlEncode(text: string, full = false): string {
  return full ? encodeURI(text) : encodeURIComponent(text)
}

export function urlDecode(text: string): string {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    throw new Error(tr('Ada urutan % yang tidak valid.', 'Contains an invalid % sequence.'))
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', hellip: '…', mdash: '—', ndash: '–', euro: '€' }

export function htmlEncode(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function htmlDecode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

export interface Jwt {
  header: unknown
  payload: unknown
  signature: string
  times: { name: string; date: Date }[]
}

export function decodeJwt(token: string): Jwt {
  const parts = token.trim().replace(/^Bearer\s+/i, '').split('.')
  if (parts.length !== 3) throw new Error(tr('JWT harus punya 3 bagian dipisah titik.', 'A JWT has 3 parts separated by dots.'))
  let header: unknown
  let payload: unknown
  try {
    header = JSON.parse(base64Decode(parts[0]))
    payload = JSON.parse(base64Decode(parts[1]))
  } catch {
    throw new Error(tr('Header atau payload bukan JSON yang valid.', 'Header or payload is not valid JSON.'))
  }
  const times: Jwt['times'] = []
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>
    for (const k of ['iat', 'nbf', 'exp']) {
      if (typeof p[k] === 'number') times.push({ name: k, date: new Date((p[k] as number) * 1000) })
    }
  }
  return { header, payload, signature: parts[2], times }
}
