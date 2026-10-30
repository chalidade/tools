// Encrypts a PDF with qpdf (WebAssembly) in the visitor's browser: AES-256
// (PDF 2.0 / R6), an open password, and print/copy/edit permissions guarded by
// a random owner password. Nothing is uploaded, and the password is only
// handed to qpdf's in-memory run, never stored.

import { encryptionInfo, runQpdf } from '@/lib/qpdf'

export { encryptionInfo } from '@/lib/qpdf'

export type Permission = 'print' | 'copy' | 'modify'

export class AlreadyEncryptedError extends Error {}

/**
 * The owner password guards the permission flags. The visitor only sets the
 * open password; a random owner password keeps the restrictions from being
 * lifted with the open password alone in readers that honour them.
 */
function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 32)
}

/** The encrypted PDF. Throws AlreadyEncryptedError for a PDF that is already protected. */
export async function protectPdf(input: Uint8Array, password: string, allow: Record<Permission, boolean>): Promise<Uint8Array> {
  if (!password) throw new Error('password required')
  if ((await encryptionInfo(input)).encrypted) throw new AlreadyEncryptedError()
  const { code, output } = await runQpdf(input, (i, o) => [
    i,
    '--encrypt',
    `--user-password=${password}`,
    `--owner-password=${randomPassword()}`,
    '--bits=256', // AES-256, the strongest PDF encryption
    `--print=${allow.print ? 'full' : 'none'}`,
    `--extract=${allow.copy ? 'y' : 'n'}`,
    `--modify=${allow.modify ? 'all' : 'none'}`,
    '--',
    o,
  ])
  if (code === 2 || !output) throw new Error('qpdf')
  return output
}
