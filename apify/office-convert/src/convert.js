// Converts one office document with LibreOffice headless.
//
// Each concurrent conversion gets its own LibreOffice profile folder (two
// soffice processes cannot share one); folders are reused, so only the first
// file per slot pays for creating the profile.
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const KINDS = {
  text: ['doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'ott', 'rtf', 'txt', 'wpd', 'pages', 'fodt'],
  sheet: ['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'ods', 'ots', 'csv', 'tsv', 'fods', 'numbers'],
  slides: ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'pot', 'potx', 'odp', 'otp', 'fodp', 'key'],
}

/** What each output choice means per kind: [extension, LibreOffice filter]. */
const TARGETS = {
  pdf: { text: ['pdf', 'writer_pdf_Export'], sheet: ['pdf', 'calc_pdf_Export'], slides: ['pdf', 'impress_pdf_Export'] },
  office: {
    text: ['docx', 'MS Word 2007 XML'],
    sheet: ['xlsx', 'Calc MS Excel 2007 XML'],
    slides: ['pptx', 'Impress MS PowerPoint 2007 XML'],
  },
  odf: { text: ['odt', 'writer8'], sheet: ['ods', 'calc8'], slides: ['odp', 'impress8'] },
  // CSV: comma, double quotes, UTF-8 (76), every sheet (-1) as its own file.
  text: { text: ['txt', 'Text (encoded):UTF8'], sheet: ['csv', 'Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1'] },
}

export const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
}

const ext = (name) => (name.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? '').toLowerCase()

/** The input's extension: from its name, else sniffed from the bytes. */
export function detectExt(name, bytes) {
  const e = ext(name)
  if (Object.values(KINDS).some((l) => l.includes(e))) return e
  const head = bytes.subarray(0, 8)
  if (head[0] === 0x50 && head[1] === 0x4b) {
    // A zip: OOXML or ODF. The part names sit in the zip's central directory.
    const s = bytes.toString('latin1')
    if (s.includes('word/')) return 'docx'
    if (s.includes('xl/')) return 'xlsx'
    if (s.includes('ppt/')) return 'pptx'
    if (s.includes('application/vnd.oasis.opendocument.text')) return 'odt'
    if (s.includes('application/vnd.oasis.opendocument.spreadsheet')) return 'ods'
    if (s.includes('application/vnd.oasis.opendocument.presentation')) return 'odp'
  }
  if (head.readUInt32BE(0) === 0xd0cf11e0) {
    // Old binary Office: LibreOffice tells Word/Excel/PowerPoint apart itself.
    const s = bytes.toString('latin1')
    if (s.includes('W\0o\0r\0d\0D\0o\0c\0u\0m\0e\0n\0t')) return 'doc'
    if (s.includes('W\0o\0r\0k\0b\0o\0o\0k') || s.includes('B\0o\0o\0k')) return 'xls'
    if (s.includes('P\0o\0w\0e\0r\0P\0o\0i\0n\0t')) return 'ppt'
    return 'doc'
  }
  if (bytes.toString('latin1', 0, 5) === '{\\rtf') return 'rtf'
  throw new Error('Unsupported file: expected a Word, Excel, PowerPoint, OpenDocument, RTF or CSV document.')
}

export const kindOf = (e) => Object.keys(KINDS).find((k) => KINDS[k].includes(e))

// --- profile pool --------------------------------------------------------

const free = []
let made = 0
async function takeProfile() {
  return free.pop() ?? path.join(os.tmpdir(), `lo-profile-${made++}`)
}

function run(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 8 << 20 }, (err, stdout, stderr) => {
      if (err) {
        const msg = err.killed ? `timed out after ${Math.round(timeoutMs / 1000)} s` : (String(stderr).trim().split('\n').pop() || err.message)
        reject(new Error(msg))
      } else resolve(String(stdout))
    })
  })
}

async function pdfPages(file) {
  try {
    const info = await run('pdfinfo', [file], 30_000)
    return Number(info.match(/^Pages:\s+(\d+)/m)?.[1]) || null
  } catch {
    return null
  }
}

/**
 * @returns {Promise<{ inputFormat: string, kind: string, outputs: { name: string, ext: string, bytes: Buffer }[], pages: number | null }>}
 */
export async function convertDocument(bytes, name, opt) {
  const inExt = detectExt(name, bytes)
  const kind = kindOf(inExt)
  const target = TARGETS[opt.output]?.[kind]
  if (!target) throw new Error(`"${opt.output}" output is not available for ${kind === 'slides' ? 'presentations' : kind + ' documents'}.`)
  let [outExt, filter] = target

  if (outExt === 'pdf') {
    const o = {}
    if (opt.pdfA) o.SelectPdfVersion = { type: 'long', value: '2' } // PDF/A-2b
    if (kind === 'sheet' && opt.onePagePerSheet) o.SinglePageSheets = { type: 'boolean', value: 'true' }
    if (kind === 'slides' && opt.includeNotes) o.ExportNotesPages = { type: 'boolean', value: 'true' }
    if (opt.imageQuality) {
      o.Quality = { type: 'long', value: String(opt.imageQuality) }
      o.ReduceImageResolution = { type: 'boolean', value: 'true' }
      o.MaxImageResolution = { type: 'long', value: '300' }
    }
    if (Object.keys(o).length) filter += ':' + JSON.stringify(o)
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-'))
  const outDir = path.join(dir, 'out')
  const profile = await takeProfile()
  try {
    await fs.mkdir(outDir)
    const base = 'document'
    const src = path.join(dir, `${base}.${inExt}`)
    await fs.writeFile(src, bytes)
    await run(
      'soffice',
      [
        `-env:UserInstallation=file://${profile}`,
        '--headless', '--invisible', '--nologo', '--nodefault', '--norestore', '--nolockcheck',
        '--convert-to', `${outExt}:${filter}`,
        '--outdir', outDir,
        src,
      ],
      opt.timeoutMs ?? 180_000,
    )
    const files = (await fs.readdir(outDir)).sort()
    if (!files.length) throw new Error('LibreOffice could not convert this file (damaged, password-protected, or not what its name says).')
    const stem = name.replace(/\.[^.]+$/, '') || 'document'
    const outputs = []
    for (const f of files) {
      // CSV of a workbook: document-<Sheet>.csv per sheet.
      const suffix = f.slice(base.length).replace(new RegExp(`\\.${outExt}$`), '')
      outputs.push({ name: `${stem}${suffix}.${outExt}`, ext: outExt, bytes: await fs.readFile(path.join(outDir, f)) })
    }
    const pages = outExt === 'pdf' ? await pdfPages(path.join(outDir, files[0])) : null
    return { inputFormat: inExt, kind, outputs, pages }
  } finally {
    free.push(profile)
    await fs.rm(dir, { recursive: true, force: true })
  }
}
