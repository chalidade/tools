// Password encryption of any file with WebCrypto: AES-256-GCM, key from
// PBKDF2-SHA-256 (high iteration count, random salt). The original file name
// travels inside the encrypted payload. Layout:
//   magic "TWLENC1" | iterations u32 | salt 16 | iv 12 | AES-GCM(payload)
//   payload = nameLength u16 | name (UTF-8) | file bytes
// The header is authenticated as additional data, so tampering is detected.

const MAGIC = new TextEncoder().encode('TWLENC1')
const SALT_LEN = 16
const IV_LEN = 12
export const ITERATIONS = 600_000
const HEADER_LEN = MAGIC.length + 4 + SALT_LEN + IV_LEN

export class BadPasswordError extends Error {}
export class NotEncryptedError extends Error {}

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBytes(data: Uint8Array, name: string, password: string): Promise<Uint8Array> {
  const nameBytes = new TextEncoder().encode(name).slice(0, 65535)
  const payload = new Uint8Array(2 + nameBytes.length + data.length)
  new DataView(payload.buffer).setUint16(0, nameBytes.length)
  payload.set(nameBytes, 2)
  payload.set(data, 2 + nameBytes.length)

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const header = new Uint8Array(HEADER_LEN)
  header.set(MAGIC, 0)
  new DataView(header.buffer).setUint32(MAGIC.length, ITERATIONS)
  header.set(salt, MAGIC.length + 4)
  header.set(iv, MAGIC.length + 4 + SALT_LEN)

  const key = await deriveKey(password, salt, ITERATIONS)
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: header as BufferSource }, key, payload as BufferSource),
  )
  const out = new Uint8Array(HEADER_LEN + cipher.length)
  out.set(header, 0)
  out.set(cipher, HEADER_LEN)
  return out
}

export const hasMagic = (head: Uint8Array) => MAGIC.every((b, i) => head[i] === b)

export function isEncrypted(bytes: Uint8Array) {
  return bytes.length > HEADER_LEN + 16 && hasMagic(bytes)
}

export async function decryptBytes(bytes: Uint8Array, password: string): Promise<{ name: string; data: Uint8Array }> {
  if (!isEncrypted(bytes)) throw new NotEncryptedError()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const iterations = view.getUint32(MAGIC.length)
  // Refuse absurd counts from a crafted file instead of freezing the tab.
  if (iterations < 1000 || iterations > 10_000_000) throw new NotEncryptedError()
  const salt = bytes.slice(MAGIC.length + 4, MAGIC.length + 4 + SALT_LEN)
  const iv = bytes.slice(MAGIC.length + 4 + SALT_LEN, HEADER_LEN)
  const header = bytes.slice(0, HEADER_LEN)
  const key = await deriveKey(password, salt, iterations)
  let payload: Uint8Array
  try {
    payload = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: header as BufferSource }, key, bytes.subarray(HEADER_LEN) as BufferSource),
    )
  } catch {
    throw new BadPasswordError()
  }
  const nameLen = new DataView(payload.buffer, payload.byteOffset).getUint16(0)
  const name = new TextDecoder().decode(payload.subarray(2, 2 + nameLen))
  return { name, data: payload.subarray(2 + nameLen) }
}
