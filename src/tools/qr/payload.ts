// What goes inside a QR code: building the text for common kinds (Wi-Fi,
// contact card, WhatsApp…) and reading a scanned text back into fields.
// These are the de facto formats phone cameras understand.

import { tr } from '@/lib/i18n'

export type QrKind = 'url' | 'text' | 'wifi' | 'whatsapp' | 'contact' | 'email' | 'phone'

export interface WifiFields {
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
}
export interface ContactFields {
  name: string
  phone: string
  email: string
  org: string
  url: string
}
export interface MessageFields {
  to: string
  subject: string
  body: string
}

/** Wi-Fi QR fields escape \ ; , : and " with a backslash. */
const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
/** vCard values escape \ , ; and newlines. */
const vcardEscape = (s: string) => s.replace(/([\\,;])/g, '\\$1').replace(/\r?\n/g, '\\n')

/**
 * Phone number as international digits: "0812-3456 7890" → "6281234567890".
 * A leading 0 is taken as Indonesian (+62); a leading + is kept as given.
 */
export function internationalPhone(input: string) {
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits.slice(1).replace(/\D/g, '')
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  return digits.replace(/\D/g, '')
}

/** "example.com/x" → "https://example.com/x"; anything with a scheme is left alone. */
export function normalizeUrl(input: string) {
  const s = input.trim()
  if (!s || /^[a-z][a-z\d+.-]*:/i.test(s)) return s
  return /^[\w-]+(\.[\w-]+)+([/?#:]|$)/.test(s) ? `https://${s}` : s
}

export function buildWifi(f: WifiFields) {
  const parts = [`T:${f.security}`, `S:${wifiEscape(f.ssid)}`]
  if (f.security !== 'nopass') parts.push(`P:${wifiEscape(f.password)}`)
  if (f.hidden) parts.push('H:true')
  return `WIFI:${parts.join(';')};;`
}

export function buildContact(f: ContactFields) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vcardEscape(f.name)};;;;`, `FN:${vcardEscape(f.name)}`]
  if (f.phone) lines.push(`TEL;TYPE=CELL:${f.phone.trim()}`)
  if (f.email) lines.push(`EMAIL:${f.email.trim()}`)
  if (f.org) lines.push(`ORG:${vcardEscape(f.org)}`)
  if (f.url) lines.push(`URL:${normalizeUrl(f.url)}`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

export function buildWhatsApp(f: MessageFields) {
  const text = f.body.trim() ? `?text=${encodeURIComponent(f.body.trim())}` : ''
  return `https://wa.me/${internationalPhone(f.to)}${text}`
}

export function buildEmail(f: MessageFields) {
  const q = [f.subject && `subject=${encodeURIComponent(f.subject)}`, f.body && `body=${encodeURIComponent(f.body)}`].filter(Boolean)
  return `mailto:${f.to.trim()}${q.length ? `?${q.join('&')}` : ''}`
}

export const buildPhone = (to: string) => `tel:+${internationalPhone(to)}`

// --- Reading ---

export interface ParsedQr {
  kind: QrKind
  title: string
  fields: { label: string; value: string; secret?: boolean }[]
  /** A link that is safe to offer (http, https, mailto, tel, sms) — never javascript: or data:. */
  href?: string
}

/** Splits "A:1;B:2;;" on unescaped ; and unescapes \x. */
function splitEscaped(body: string, sep: string) {
  const out: string[] = []
  let cur = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '\\' && i + 1 < body.length) cur += body[++i]
    else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur) out.push(cur)
  return out
}

const SAFE_SCHEMES = /^(https?:|mailto:|tel:|sms:|smsto:)/i

/** decodeURIComponent that leaves malformed % sequences as they are instead of throwing. */
function decode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export function parseQr(text: string): ParsedQr {
  const t = text.trim()

  if (/^WIFI:/i.test(t)) {
    const map = new Map<string, string>()
    for (const part of splitEscaped(t.slice(5), ';')) {
      const i = part.indexOf(':')
      if (i > 0) map.set(part.slice(0, i).toUpperCase(), part.slice(i + 1))
    }
    const security = map.get('T') || 'nopass'
    return {
      kind: 'wifi',
      title: tr('Jaringan Wi-Fi', 'Wi-Fi network'),
      fields: [
        { label: tr('Nama jaringan (SSID)', 'Network name (SSID)'), value: map.get('S') ?? '' },
        ...(security.toLowerCase() !== 'nopass' ? [{ label: 'Password', value: map.get('P') ?? '', secret: true }] : []),
        {
          label: tr('Keamanan', 'Security'),
          value: security.toLowerCase() === 'nopass' ? tr('Tanpa password', 'No password') : security,
        },
        ...(map.get('H') === 'true' ? [{ label: tr('Tersembunyi', 'Hidden'), value: tr('Ya', 'Yes') }] : []),
      ],
    }
  }

  if (/^BEGIN:VCARD/i.test(t)) {
    // Unfold continuation lines, then read the common properties.
    const lines = t.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
    const fields: ParsedQr['fields'] = []
    const labels: Record<string, string> = {
      FN: tr('Nama', 'Name'),
      TEL: tr('Telepon', 'Phone'),
      EMAIL: 'Email',
      ORG: tr('Organisasi', 'Organization'),
      TITLE: tr('Jabatan', 'Job title'),
      URL: tr('Situs', 'Website'),
      ADR: tr('Alamat', 'Address'),
      NOTE: tr('Catatan', 'Note'),
    }
    for (const line of lines) {
      const i = line.indexOf(':')
      if (i < 0) continue
      const key = line.slice(0, i).split(';')[0].toUpperCase()
      if (!labels[key]) continue
      const value = splitEscaped(line.slice(i + 1).replace(/\\n/gi, '\n'), ';').filter(Boolean).join(', ')
      if (value) fields.push({ label: labels[key], value })
    }
    return { kind: 'contact', title: tr('Kartu kontak', 'Contact card'), fields }
  }

  if (/^mailto:/i.test(t)) {
    const [addr, query = ''] = t.slice(7).split('?')
    const q = new URLSearchParams(query)
    return {
      kind: 'email',
      title: 'Email',
      fields: [
        { label: tr('Kepada', 'To'), value: decode(addr) },
        ...(q.get('subject') ? [{ label: tr('Subjek', 'Subject'), value: q.get('subject')! }] : []),
        ...(q.get('body') ? [{ label: tr('Isi', 'Body'), value: q.get('body')! }] : []),
      ],
      href: t,
    }
  }

  if (/^tel:/i.test(t)) return {
      kind: 'phone',
      title: tr('Nomor telepon', 'Phone number'),
      fields: [{ label: tr('Nomor', 'Number'), value: t.slice(4) }],
      href: t,
    }

  if (/^(sms|smsto):/i.test(t)) {
    const [, number = '', body = ''] = /^(?:sms|smsto):([^:?]*)[:?]?(?:body=)?(.*)$/i.exec(t) ?? []
    return {
      kind: 'phone',
      title: 'SMS',
      fields: [
        { label: tr('Nomor', 'Number'), value: number },
        ...(body ? [{ label: tr('Pesan', 'Message'), value: decode(body) }] : []),
      ],
      href: t,
    }
  }

  if (/^https?:\/\//i.test(t)) {
    try {
      const url = new URL(t)
      if (/(^|\.)wa\.me$/i.test(url.hostname)) {
        const msg = url.searchParams.get('text')
        return {
          kind: 'whatsapp',
          title: 'Chat WhatsApp',
          fields: [
            { label: tr('Nomor', 'Number'), value: `+${url.pathname.replace(/\D/g, '')}` },
            ...(msg ? [{ label: tr('Pesan', 'Message'), value: msg }] : []),
          ],
          href: url.href,
        }
      }
      return {
        kind: 'url',
        title: tr('Tautan', 'Link'),
        fields: [
          { label: tr('Alamat', 'Address'), value: url.href },
          { label: 'Domain', value: url.hostname },
        ],
        href: url.href,
      }
    } catch {
      // Not a valid URL after all; fall through to plain text.
    }
  }

  return {
    kind: 'text',
    title: tr('Teks', 'Text'),
    fields: [{ label: tr('Isi', 'Content'), value: text }],
    href: SAFE_SCHEMES.test(t) ? t : undefined,
  }
}
