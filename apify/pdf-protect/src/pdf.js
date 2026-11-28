// Password-protect or unlock PDFs with qpdf (see qpdf.js), like the site's
// src/tools/protect-pdf/protect.ts and unlock-pdf.
import { randomBytes } from 'node:crypto'
import { qpdf } from './qpdf.js'

export class PdfError extends Error {}

const randomPassword = () => randomBytes(24).toString('base64url').slice(0, 32)

/** { encrypted, needsPassword } — needsPassword when it does not open without one. */
export async function encryptionInfo(bytes) {
  const r = await qpdf({ 'a.pdf': bytes }, ['--show-encryption', '/in/a.pdf'])
  if (r.code === 2) {
    if (/invalid password/i.test(r.log)) return { encrypted: true, needsPassword: true }
    if (/not a PDF|can't find PDF header|unable to find trailer/i.test(r.log)) throw new PdfError('Not a PDF file, or a badly damaged one.')
    throw new PdfError(r.log.split('\n').filter(Boolean).pop() ?? 'qpdf could not read the file')
  }
  return { encrypted: !/File is not encrypted/i.test(r.log), needsPassword: false }
}

/**
 * AES-256 encryption. `userPassword` opens the file (empty = opens freely but
 * keeps the restrictions); `ownerPassword` guards the permissions (random when empty).
 */
export async function protectPdf(bytes, { userPassword, ownerPassword, allow }) {
  const info = await encryptionInfo(bytes)
  if (info.encrypted) throw new PdfError('This PDF is already protected. Unlock it first (operation "unlock").')
  const owner = ownerPassword || randomPassword()
  const r = await qpdf({ 'a.pdf': bytes }, [
    '/in/a.pdf',
    '--encrypt',
    `--user-password=${userPassword ?? ''}`,
    `--owner-password=${owner}`,
    '--bits=256',
    `--print=${allow.print ? 'full' : 'none'}`,
    `--extract=${allow.copy ? 'y' : 'n'}`,
    `--modify=${allow.modify ? 'all' : 'none'}`,
    `--annotate=${allow.annotate ? 'y' : 'n'}`,
    `--form=${allow.forms ? 'y' : 'n'}`,
    `--assemble=${allow.assemble ? 'y' : 'n'}`,
    '--',
    '/out/out.pdf',
  ])
  const out = r.outputs.get('out.pdf')
  if ((r.code !== 0 && r.code !== 3) || !out) throw new PdfError(`Encryption failed: ${r.log.split('\n').filter(Boolean).pop() ?? r.code}`)
  return { bytes: out, ownerPasswordGenerated: !ownerPassword }
}

/** Removes the open password and every restriction. */
export async function unlockPdf(bytes, password) {
  const info = await encryptionInfo(bytes)
  if (!info.encrypted) throw new PdfError('This PDF is not protected; nothing to unlock.')
  if (info.needsPassword && !password) throw new PdfError('This PDF needs its open password: set "password".')
  const r = await qpdf({ 'a.pdf': bytes }, [...(password ? [`--password=${password}`] : []), '--decrypt', '/in/a.pdf', '/out/out.pdf'])
  const out = r.outputs.get('out.pdf')
  if (/invalid password/i.test(r.log)) throw new PdfError('Wrong password for this PDF.')
  if ((r.code !== 0 && r.code !== 3) || !out) throw new PdfError(`Unlock failed: ${r.log.split('\n').filter(Boolean).pop() ?? r.code}`)
  return out
}
