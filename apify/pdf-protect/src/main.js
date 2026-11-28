import { Actor, log } from 'apify'
import { zipSync } from 'fflate'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { PdfError, protectPdf, unlockPdf } from './pdf.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) await Actor.fail('Add at least one PDF URL to "files".')

const operation = input.operation === 'unlock' ? 'unlock' : 'protect'

// Per-file passwords: { "url": "…", "password": "…" } (or userData.password) in
// "files", or a url → password map in "passwords". The global one fills the rest.
const perFile = new Map(Object.entries(input.passwords && typeof input.passwords === 'object' ? input.passwords : {}))
for (const f of Array.isArray(input.files) ? input.files : []) {
  const pw = f?.password ?? f?.userData?.password
  if (f?.url && pw != null) perFile.set(f.url.trim(), String(pw))
}
const passwordFor = (url) => perFile.get(url) ?? input.password ?? ''

if (operation === 'protect' && !input.password && !perFile.size && !input.ownerPassword && !input.restrictOnly) {
  await Actor.fail('Set "password" (the one that will open the PDFs), per-file passwords, or turn on "restrictOnly" to only block printing/copying.')
}

const allow = {
  print: input.allowPrint ?? true,
  copy: input.allowCopy ?? false,
  modify: input.allowModify ?? false,
  annotate: input.allowAnnotate ?? false,
  forms: input.allowForms ?? true,
  assemble: input.allowAssemble ?? false,
}

const zip = {}
const summary = await runBatch({
  urls,
  eventName: 'pdf-secured',
  maxMb: input.maxFileSizeMb ?? 100,
  concurrency: 3,
  async process({ url, name, index, bytes, store }) {
    if (bytes.toString('latin1', 0, 1024).indexOf('%PDF-') < 0) throw new PdfError('Not a PDF file.')
    let out
    const row = { operation }
    if (operation === 'protect') {
      const userPassword = input.restrictOnly ? '' : passwordFor(url)
      const r = await protectPdf(new Uint8Array(bytes), { userPassword, ownerPassword: input.ownerPassword, allow })
      out = r.bytes
      row.opensWithPassword = Boolean(userPassword)
      row.encryption = 'AES-256'
    } else {
      out = await unlockPdf(new Uint8Array(bytes), passwordFor(url))
    }
    const key = storeKey(index, name.replace(/\.pdf$/i, '') + '.pdf')
    await store.setValue(key, Buffer.from(out), { contentType: 'application/pdf' })
    if (input.zip ?? true) zip[key] = [out, { level: 0 }]
    return { ...row, sizeKb: Math.round(out.length / 102.4) / 10, pdfUrl: store.getPublicUrl(key) }
  },
})

if (Object.keys(zip).length > 1) {
  const store = await Actor.openKeyValueStore()
  await store.setValue('pdfs.zip', Buffer.from(zipSync(zip)), { contentType: 'application/zip' })
  summary.zipUrl = store.getPublicUrl('pdfs.zip')
  await Actor.setValue('SUMMARY', summary)
  log.info(`All PDFs in one ZIP: ${summary.zipUrl}`)
}
await Actor.exit()
