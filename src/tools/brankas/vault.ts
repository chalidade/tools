// Vault crypto + backup format, free of browser storage so it can be tested
// in isolation. One AES-256-GCM key comes from PBKDF2-SHA-256 (random salt);
// every record gets a fresh 12-byte IV, and its name, type and date are
// encrypted together with the file bytes. Nothing but the salt, iteration
// count, IVs and sizes is stored in the clear.

export const ITERATIONS = 600_000
export const MAX_FILE = 25 * 1024 * 1024
const SALT_LEN = 16
const IV_LEN = 12
const VERIFIER_TEXT = 'toowl-brankas-v1'
const BACKUP_MAGIC = new TextEncoder().encode('TWLVAULT1')

export interface Meta {
  salt: Uint8Array
  iterations: number
  verifier: Sealed
}
export interface Sealed {
  iv: Uint8Array
  ct: Uint8Array
}
export interface Record extends Sealed {
  id: string
}
export interface Item {
  id: string
  name: string
  type: string
  added: number
  data: Uint8Array
}

export class BadPasswordError extends Error {}
export class BadBackupError extends Error {}

const bs = (u: Uint8Array) => u as BufferSource

export async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: bs(salt), iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function seal(key: CryptoKey, plain: Uint8Array): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(plain)))
  return { iv, ct }
}

async function open(key: CryptoKey, s: Sealed): Promise<Uint8Array> {
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(s.iv) }, key, bs(s.ct)))
  } catch {
    throw new BadPasswordError()
  }
}

/** A new vault: fresh salt, and a small encrypted marker that proves the password later. */
export async function createVault(password: string, iterations = ITERATIONS): Promise<{ meta: Meta; key: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const key = await deriveKey(password, salt, iterations)
  const verifier = await seal(key, new TextEncoder().encode(VERIFIER_TEXT))
  return { meta: { salt, iterations, verifier }, key }
}

export async function unlockVault(meta: Meta, password: string): Promise<CryptoKey> {
  const key = await deriveKey(password, meta.salt, meta.iterations)
  const text = new TextDecoder().decode(await open(key, meta.verifier))
  if (text !== VERIFIER_TEXT) throw new BadPasswordError()
  return key
}

export async function sealItem(key: CryptoKey, item: Omit<Item, 'id'>): Promise<Record> {
  const head = new TextEncoder().encode(JSON.stringify({ name: item.name, type: item.type, added: item.added }))
  const plain = new Uint8Array(4 + head.length + item.data.length)
  new DataView(plain.buffer).setUint32(0, head.length)
  plain.set(head, 4)
  plain.set(item.data, 4 + head.length)
  const s = await seal(key, plain)
  return { id: crypto.randomUUID(), ...s }
}

export async function openItem(key: CryptoKey, rec: Record): Promise<Item> {
  const plain = await open(key, rec)
  const n = new DataView(plain.buffer, plain.byteOffset).getUint32(0)
  const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + n)))
  return { id: rec.id, name: String(head.name), type: String(head.type), added: Number(head.added), data: plain.subarray(4 + n) }
}

/** Only the list view needs name/type/date, but they are encrypted too, so list = decrypt all (files are small). */

// ---- backup file: magic | headerLen u32 | header JSON | record bodies ----
const b64 = (u: Uint8Array) => {
  let s = ''
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(s)
}
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export function buildBackup(meta: Meta, records: Record[]): Uint8Array {
  const header = new TextEncoder().encode(
    JSON.stringify({
      v: 1,
      iterations: meta.iterations,
      salt: b64(meta.salt),
      verifier: { iv: b64(meta.verifier.iv), ct: b64(meta.verifier.ct) },
      records: records.map((r) => ({ id: r.id, iv: b64(r.iv), len: r.ct.length })),
    }),
  )
  const total = records.reduce((n, r) => n + r.ct.length, 0)
  const out = new Uint8Array(BACKUP_MAGIC.length + 4 + header.length + total)
  out.set(BACKUP_MAGIC, 0)
  new DataView(out.buffer).setUint32(BACKUP_MAGIC.length, header.length)
  out.set(header, BACKUP_MAGIC.length + 4)
  let p = BACKUP_MAGIC.length + 4 + header.length
  for (const r of records) {
    out.set(r.ct, p)
    p += r.ct.length
  }
  return out
}

export function parseBackup(bytes: Uint8Array): { meta: Meta; records: Record[] } {
  try {
    if (bytes.length < BACKUP_MAGIC.length + 4 || !BACKUP_MAGIC.every((b, i) => bytes[i] === b)) throw new Error()
    const hl = new DataView(bytes.buffer, bytes.byteOffset).getUint32(BACKUP_MAGIC.length)
    let p = BACKUP_MAGIC.length + 4
    const h = JSON.parse(new TextDecoder().decode(bytes.subarray(p, p + hl)))
    p += hl
    if (h.v !== 1 || !(h.iterations >= 1000 && h.iterations <= 10_000_000)) throw new Error()
    const records: Record[] = []
    for (const r of h.records) {
      if (!(r.len >= 16) || p + r.len > bytes.length) throw new Error()
      records.push({ id: String(r.id), iv: unb64(r.iv), ct: bytes.slice(p, p + r.len) })
      p += r.len
    }
    return { meta: { salt: unb64(h.salt), iterations: h.iterations, verifier: { iv: unb64(h.verifier.iv), ct: unb64(h.verifier.ct) } }, records }
  } catch {
    throw new BadBackupError()
  }
}
