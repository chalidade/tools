// Removes a PDF's encryption with qpdf (WebAssembly) in the visitor's browser.
// A PDF that needs a password to open is only decrypted with that password;
// one that opens freely loses its print/copy/edit restrictions. Nothing is
// uploaded, and the password is never stored.

import { isPasswordError, runQpdf } from '@/lib/qpdf'

export { encryptionInfo } from '@/lib/qpdf'

export class WrongPasswordError extends Error {}

/** The decrypted PDF. Throws WrongPasswordError when the password is missing or wrong. */
export async function unlockPdf(input: Uint8Array, password?: string): Promise<Uint8Array> {
  const { code, log, output } = await runQpdf(input, (i, o) => [
    ...(password ? [`--password=${password}`] : []),
    '--decrypt',
    i,
    o,
  ])
  if (isPasswordError(log)) throw new WrongPasswordError()
  if (code === 2 || !output) throw new Error('qpdf')
  return output
}
