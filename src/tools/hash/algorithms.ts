import { createMD5, createSHA1, createSHA256, createSHA384, createSHA512, type IHasher } from 'hash-wasm'

export const ALGORITHMS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
export type Algorithm = (typeof ALGORITHMS)[number]

const MAKERS: Record<Algorithm, () => Promise<IHasher>> = {
  MD5: createMD5,
  'SHA-1': createSHA1,
  'SHA-256': createSHA256,
  'SHA-384': createSHA384,
  'SHA-512': createSHA512,
}

/** One incremental hasher per algorithm, fed the same bytes. */
export async function hashers() {
  const list = await Promise.all(ALGORITHMS.map((a) => MAKERS[a]()))
  list.forEach((h) => h.init())
  return {
    update: (bytes: Uint8Array) => list.forEach((h) => h.update(bytes)),
    digest: () => Object.fromEntries(ALGORITHMS.map((a, i) => [a, list[i].digest('hex')])) as Record<Algorithm, string>,
  }
}

/** All digests of a short text (UTF-8). */
export async function hashText(text: string) {
  const h = await hashers()
  h.update(new TextEncoder().encode(text))
  return h.digest()
}
