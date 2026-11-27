// Renders PDF pages to images with Poppler's pdftoppm.
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

function run(cmd, args, timeoutMs = 600_000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 8 << 20 }, (err, stdout, stderr) => {
      if (err) {
        const text = String(stderr).trim()
        if (/Incorrect password|password/i.test(text)) reject(new Error('The PDF is password-protected: set "password".'))
        else reject(new Error(err.killed ? 'Timed out.' : text.split('\n').pop() || err.message))
      } else resolve(String(stdout))
    })
  })
}

/** "1-3, 5, 8-" → sorted unique page numbers within 1..total. Empty → all pages. */
export function parsePages(spec, total) {
  const s = String(spec ?? '').replace(/\s+/g, '').toLowerCase()
  if (!s) return Array.from({ length: total }, (_, i) => i + 1)
  const out = new Set()
  for (const part of s.split(',')) {
    if (!part) continue
    const m = part.match(/^(\d+|last)?(-)?(\d+|last)?$/)
    if (!m || (!m[1] && !m[3])) throw new Error(`Invalid page range "${part}". Use e.g. "1-3,5,10-".`)
    const num = (v, d) => (v === 'last' ? total : v ? Number(v) : d)
    const a = num(m[1], 1)
    const b = m[2] ? num(m[3], total) : a
    for (let p = Math.max(1, a); p <= Math.min(total, b); p++) out.add(p)
  }
  return [...out].sort((x, y) => x - y)
}

/**
 * @returns {Promise<{ totalPages: number, pages: { page: number, ext: string, bytes: Buffer, width: number, height: number }[] }>}
 */
export async function renderPdf(bytes, opt) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-'))
  try {
    const src = path.join(dir, 'in.pdf')
    await fs.writeFile(src, bytes)
    const pw = opt.password ? ['-upw', opt.password] : []
    const info = await run('pdfinfo', [...pw, src], 60_000)
    const totalPages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1])
    if (!totalPages) throw new Error('Could not read the PDF.')
    let wanted = parsePages(opt.pages, totalPages)
    if (!wanted.length) throw new Error(`No pages in that range (the PDF has ${totalPages}).`)
    wanted = wanted.slice(0, opt.maxPages)

    const dpi = opt.dpi
    const format = opt.format
    const pages = []
    // Contiguous runs go to pdftoppm in one call (-f/-l); it names files out-<n>.
    const runs = []
    for (const p of wanted) {
      const last = runs.at(-1)
      if (last && last[1] === p - 1) last[1] = p
      else runs.push([p, p])
    }
    for (const [f, l] of runs) {
      const args = [...pw, '-r', String(dpi), '-f', String(f), '-l', String(l)]
      if (opt.maxSide) args.push('-scale-to', String(opt.maxSide))
      if (format === 'jpg') args.push('-jpeg', '-jpegopt', `quality=${opt.quality},optimize=y,progressive=y`)
      else args.push('-png')
      if (opt.gray) args.push('-gray')
      args.push(src, path.join(dir, 'out'))
      await run('pdftoppm', args)
    }
    const files = (await fs.readdir(dir)).filter((n) => n.startsWith('out-'))
    const byPage = new Map(files.map((n) => [Number(n.match(/out-0*(\d+)\./)[1]), n]))
    for (const p of wanted) {
      const n = byPage.get(p)
      if (!n) continue
      let buf = await fs.readFile(path.join(dir, n))
      let ext = format
      if (format === 'webp') buf = await sharp(buf).webp({ quality: opt.quality, effort: 4 }).toBuffer()
      else if (format === 'png') buf = await sharp(buf).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
      const meta = await sharp(buf).metadata()
      pages.push({ page: p, ext, bytes: buf, width: meta.width, height: meta.height })
    }
    return { totalPages, pages }
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

/** A ZIP of the rendered pages (Info-ZIP's `zip`, stored: images are already compressed). */
export async function zipPages(pages, stem) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zip-'))
  try {
    const width = String(Math.max(...pages.map((p) => p.page))).length
    const names = []
    for (const p of pages) {
      const n = `${stem}-${String(p.page).padStart(width, '0')}.${p.ext}`
      await fs.writeFile(path.join(dir, n), p.bytes)
      names.push(n)
    }
    await new Promise((resolve, reject) =>
      execFile('zip', ['-q', '-0', 'pages.zip', ...names], { cwd: dir }, (e) => (e ? reject(e) : resolve())),
    )
    return await fs.readFile(path.join(dir, 'pages.zip'))
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}
