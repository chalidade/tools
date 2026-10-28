// QRIS is an EMV merchant-presented QR: a flat list of tag(2) length(2) value
// items ending in tag 63, a CRC-16 of everything before it. A shop's printed
// QRIS is "static" (tag 01 = 11, no amount); adding tag 54 and setting tag 01
// to 12 makes it ask for that amount. Everything here is plain string work.

import { tr } from '@/lib/i18n'

export interface Tlv {
  tag: string
  value: string
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), four uppercase hex digits. */
export function crc16(text: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Splits the top level into items; null when a length runs past the end. */
export function parseTlv(text: string): Tlv[] | null {
  const out: Tlv[] = []
  let i = 0
  while (i < text.length) {
    const tag = text.slice(i, i + 2)
    const len = text.slice(i + 2, i + 4)
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(len)) return null
    const end = i + 4 + Number(len)
    if (end > text.length) return null
    out.push({ tag, value: text.slice(i + 4, end) })
    i = end
  }
  return out
}

const encode = (items: Tlv[]) => items.map((x) => x.tag + String(x.value.length).padStart(2, '0') + x.value).join('')

export interface QrisInfo {
  items: Tlv[]
  merchant: string
  city: string
  /** True when tag 01 says 12 (the code already asks for an amount). */
  dynamic: boolean
  /** Existing tag 54, or ''. */
  amount: string
  crcOk: boolean
}

export class NotQrisError extends Error {}

/** Reads a scanned text as QRIS; throws NotQrisError with a readable message otherwise. */
export function readQris(text: string): QrisInfo {
  const raw = text.trim()
  const items = raw.startsWith('000201') ? parseTlv(raw) : null
  if (!items) throw new NotQrisError(tr('Ini bukan QRIS: isinya tidak berformat EMV (harus diawali 000201).', 'This is not a QRIS: it is not in EMV format (it must start with 000201).'))
  const get = (tag: string) => items.find((x) => x.tag === tag)?.value ?? ''
  if (get('58') !== 'ID' || !items.some((x) => +x.tag >= 26 && +x.tag <= 51))
    throw new NotQrisError(tr('Kode ini QR pembayaran, tapi bukan QRIS Indonesia (negara bukan ID atau data merchant tidak ada).', 'This is a payment QR, but not an Indonesian QRIS (country is not ID, or merchant data is missing).'))
  const last = items[items.length - 1]
  const crcOk = last.tag === '63' && last.value === crc16(raw.slice(0, -4))
  return { items, merchant: get('59'), city: get('60'), dynamic: get('01') === '12', amount: get('54'), crcOk }
}

/** "25000", "25.000" or "25.000,50" → "25000" / "25000.5"; null if not a positive amount. */
export function parseAmount(input: string): string | null {
  let s = input.trim().replace(/^rp\.?\s*/i, '').replace(/\s/g, '')
  if (!s) return null
  // Indonesian style: dots group thousands, a comma starts the decimals.
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.')
  else if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const n = Number(s)
  if (!(n > 0) || s.replace('.', '').length > 13) return null
  // The EMV amount field has no trailing zeros after the point.
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

/** The same QRIS with an amount: tag 01 → 12, tag 54 placed in order, CRC recomputed. */
export function withAmount(info: QrisInfo, amount: string): string {
  const items = info.items.filter((x) => x.tag !== '54' && x.tag !== '63').map((x) => (x.tag === '01' ? { ...x, value: '12' } : x))
  const at = items.findIndex((x) => +x.tag > 54)
  items.splice(at < 0 ? items.length : at, 0, { tag: '54', value: amount })
  const body = encode(items) + '6304'
  return body + crc16(body)
}
