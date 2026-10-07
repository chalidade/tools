// Splits a PDF in the visitor's browser with pdf-lib: each group of pages is
// copied into its own document — one PDF, or a ZIP when there are several.

import { tr } from '@/lib/i18n'
import { newPdfDoc, openPdfDoc, pdfBlob } from '@/lib/pdf-doc'

/** A run of pages to save as one file; 1-based, in reading order. */
export type PageGroup = number[]

/**
 * "1-3, 5, 8-" → [[1,2,3],[5],[8..count]]. Returns an error message instead
 * when a part is not a page or range inside the document.
 */
export function parseRanges(text: string, count: number): PageGroup[] | string {
  const parts = text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return tr('Tulis rentang halaman, misalnya 1-3, 5, 8-10.', 'Type page ranges, for example 1-3, 5, 8-10.')
  const groups: PageGroup[] = []
  for (const part of parts) {
    const m = /^(\d+)\s*(?:[-–—]\s*(\d*))?$/.exec(part)
    if (!m) return tr(`“${part}” bukan rentang halaman. Contoh: 1-3, 5, 8-10.`, `“${part}” isn't a page range. Example: 1-3, 5, 8-10.`)
    const from = Number(m[1])
    const to = m[2] === undefined ? from : m[2] === '' ? count : Number(m[2])
    if (from < 1 || to < 1 || from > count || to > count)
      return tr(`“${part}” di luar halaman 1–${count}.`, `“${part}” is outside pages 1–${count}.`)
    if (to < from)
      return tr(
        `“${part}”: halaman awal harus lebih kecil dari halaman akhir.`,
        `“${part}”: the first page must come before the last page.`,
      )
    groups.push(Array.from({ length: to - from + 1 }, (_, i) => from + i))
  }
  return groups
}

/** Every `size` pages: 10 pages by 3 → [1-3], [4-6], [7-9], [10]. */
export function chunkPages(count: number, size: number): PageGroup[] {
  const groups: PageGroup[] = []
  for (let start = 1; start <= count; start += size) {
    groups.push(Array.from({ length: Math.min(size, count - start + 1) }, (_, i) => start + i))
  }
  return groups
}

/** "hlm-4", "hlm-1-3" for a run, "hlm-2_5_9" for picked pages, "12-halaman" when long (English: "page-4", "pages-1-3", …). */
function label(group: PageGroup) {
  if (group.length === 1) return `${tr('hlm', 'page')}-${group[0]}`
  const pages = tr('hlm', 'pages')
  const run = group.every((n, i) => i === 0 || n === group[i - 1] + 1)
  if (run) return `${pages}-${group[0]}-${group[group.length - 1]}`
  return group.length <= 5 ? `${pages}-${group.join('_')}` : `${group.length}-${tr('halaman', 'pages')}`
}

export async function splitPdf(
  file: File,
  groups: PageGroup[],
  baseName: string,
  onProgress: (done: number, total: number) => void,
): Promise<{ blob: Blob; fileName: string }> {
  const src = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const files: { name: string; blob: Blob }[] = []
  for (const [i, group] of groups.entries()) {
    const out = await newPdfDoc()
    const pages = await out.copyPages(src, group.map((n) => n - 1))
    for (const page of pages) out.addPage(page)
    files.push({ name: `${baseName}-${label(group)}.pdf`, blob: await pdfBlob(out) })
    onProgress(i + 1, groups.length)
  }

  if (files.length === 1) return { blob: files[0].blob, fileName: files[0].name }
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.blob)
  return { blob: await zip.generateAsync({ type: 'blob' }), fileName: `${baseName}-${tr('terpisah', 'split')}.zip` }
}
