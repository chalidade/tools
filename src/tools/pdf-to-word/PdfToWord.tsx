import { useEffect, useMemo, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { buildDocx, convertPdf, LockedPdfError, ScannedPdfError, type PdfConversion } from './convert'
import { buildLayoutDocx, convertPdfLayout, type LayoutConversion, type LayoutPage } from './layout'

/** layout: looks like the PDF (positioned text over the page drawing); flow: plain editable paragraphs. */
type Mode = 'layout' | 'flow'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; mode: 'flow'; result: PdfConversion; docx: Blob }
  | { kind: 'ready'; mode: 'layout'; result: LayoutConversion; docx: Blob }
  | { kind: 'error'; message: string }

/** How many pages the "same as PDF" preview draws. */
const PREVIEW_PAGES = 3

/** How many paragraphs the on-page preview shows; the .docx always has all. */
const PREVIEW_LIMIT = 60

function errorMessage(e: unknown) {
  if (e instanceof ScannedPdfError)
    return tr(
      'PDF ini tidak berisi teks. Biasanya karena hasil scan atau foto, dan butuh OCR yang belum didukung tool ini.',
      "This PDF has no text. It's usually a scan or photo, which needs OCR — not supported by this tool yet.",
    )
  if (e instanceof LockedPdfError)
    return tr(
      'PDF ini dikunci password. Buka kuncinya dulu, lalu coba lagi.',
      'This PDF is password-protected. Unlock it first, then try again.',
    )
  return tr('PDF tidak bisa dibaca. Pastikan filenya tidak rusak.', "The PDF couldn't be read. Make sure the file isn't damaged.")
}

export default function PdfToWord() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<Mode>('layout')

  async function open(next: File, as: Mode = mode) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.') })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const progress = (done: number, total: number) => setStatus({ kind: 'reading', done, total })
      if (as === 'layout') {
        const result = await convertPdfLayout(next, progress)
        setStatus({ kind: 'ready', mode: 'layout', result, docx: await buildLayoutDocx(result) })
      } else {
        const result = await convertPdf(next, progress)
        setStatus({ kind: 'ready', mode: 'flow', result, docx: await buildDocx(result) })
      }
    } catch (e) {
      setStatus({ kind: 'error', message: errorMessage(e) })
    }
  }

  function pickMode(next: Mode) {
    setMode(next)
    if (file && status.kind !== 'reading') void open(file, next)
  }

  const modePicker = (
    <Segmented
      label={t('Hasil Word', 'Word result')}
      value={mode}
      disabled={status.kind === 'reading'}
      options={[
        { value: 'layout', label: t('Sama persis seperti PDF', 'Same as the PDF') },
        { value: 'flow', label: t('Teks mengalir (mudah diedit)', 'Flowing text (easy to edit)') },
      ]}
      onChange={pickMode}
    />
  )

  function reset() {
    setFile(null)
    setStatus({ kind: 'idle' })
  }

  if (status.kind === 'ready' && status.mode === 'layout' && file) {
    const { result, docx } = status
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                `${result.pages.length} halaman · ${result.blocks} blok teks`,
                `${result.pages.length} pages · ${result.blocks} text blocks`,
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadBlob(docx, withExtension(file.name, '.docx'))}>
              <Download />
              {t('Unduh Word', 'Download Word')}
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        {modePicker}

        <p className="text-xs text-muted-foreground">
          {t(
            'Tiap halaman Word dibuat seukuran halaman PDF. Gambar, garis tabel, warna latar, dan logo ditaruh di belakang persis seperti PDF; teksnya tetap bisa diedit dan diletakkan di posisi aslinya dengan font, ukuran, tebal/miring, dan warna yang sama. Kalau font PDF tidak terpasang di komputermu, Word memakai font pengganti sehingga lebar teks bisa sedikit beda. Mau menulis ulang banyak teks? Pilih "Teks mengalir".',
            'Each Word page is the size of the PDF page. Images, table borders, background colours and logos sit behind, exactly as in the PDF; the text stays editable and is placed where it was, with the same font, size, bold/italic and colour. If a PDF font is not installed on your computer, Word substitutes one, so text width can differ slightly. Rewriting a lot of text? Choose "Flowing text".',
          )}
        </p>

        <div className="space-y-4">
          {result.pages.slice(0, PREVIEW_PAGES).map((page, i) => (
            <PagePreview key={i} page={page} />
          ))}
          {result.pages.length > PREVIEW_PAGES && (
            <p className="text-center text-xs text-muted-foreground">
              {t(
                `Pratinjau ${PREVIEW_PAGES} halaman pertama; file Word berisi semua ${result.pages.length} halaman.`,
                `Preview of the first ${PREVIEW_PAGES} pages; the Word file has all ${result.pages.length}.`,
              )}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (status.kind === 'ready' && status.mode === 'flow' && file) {
    const { result, docx } = status
    const shown = result.paragraphs.slice(0, PREVIEW_LIMIT)

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                `${result.pages} halaman · ${result.paragraphs.length} paragraf`,
                `${result.pages} pages · ${result.paragraphs.length} paragraphs`,
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadBlob(docx, withExtension(file.name, '.docx'))}>
              <Download />
              {t('Unduh Word', 'Download Word')}
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        {modePicker}

        <p className="text-xs text-muted-foreground">
          {t(
            'Teks, ukuran huruf, tebal/miring, dan pemisah halaman ikut terbawa dan bisa diedit di Word. Gambar, garis tabel, dan posisi yang persis tidak ikut; pilih "Sama persis seperti PDF" kalau tampilannya harus sama.',
            "Text, font sizes, bold/italic and page breaks carry over and can be edited in Word. Images, table borders and exact positioning don't; choose \"Same as the PDF\" when it has to look the same.",
          )}
        </p>

        <div className="overflow-hidden rounded-2xl border">
          <div className="border-b bg-muted px-4 py-2 text-xs text-muted-foreground">
            {t('Pratinjau teks', 'Text preview')}
            {result.paragraphs.length > PREVIEW_LIMIT &&
              t(` (${PREVIEW_LIMIT} paragraf pertama)`, ` (first ${PREVIEW_LIMIT} paragraphs)`)}
          </div>
          <div className="max-h-[32rem] space-y-3 overflow-auto bg-card p-6 text-sm">
            {shown.map((p, i) => (
              <div key={i}>
                {p.pageBreakBefore && (
                  <div className="my-4 border-t border-dashed pt-1 text-center text-[10px] tracking-wide text-muted-foreground uppercase">
                    {t('halaman baru', 'new page')}
                  </div>
                )}
                <p
                  className={cn('whitespace-pre-wrap', p.align === 'center' && 'text-center')}
                  style={{ paddingLeft: p.align === 'left' ? Math.min(p.indent, 120) : undefined }}
                >
                  {p.runs.map((r, j) => (
                    <span
                      key={j}
                      className={cn(r.bold && 'font-semibold', r.italic && 'italic')}
                      // Scaled down a little so headings stay readable in the panel.
                      style={{ fontSize: `${Math.min(Math.max(r.size * 1.1, 11), 26)}px` }}
                    >
                      {r.text.replace(/\t/g, '    ')}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drag a .pdf file here')}
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? t(`Membaca halaman ${status.done}/${status.total}…`, `Reading page ${status.done}/${status.total}…`)
              : t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`)
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {modePicker}
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}

/** Draws a converted page the way Word lays it out: the page picture, with the text frames over it. */
function PagePreview({ page }: { page: LayoutPage }) {
  const src = useMemo(
    () =>
      page.background
        ? URL.createObjectURL(new Blob([page.background.data as BlobPart], { type: 'image/jpeg' }))
        : null,
    [page],
  )
  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src])
  const pct = (v: number, of: number) => `${(v / of) * 100}%`

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-lg border shadow-sm">
      {/* Container query units let the text scale with the page's on-screen width. */}
      <div
        className="relative bg-white text-black [container-type:inline-size]"
        style={{ aspectRatio: `${page.width} / ${page.height}` }}
      >
        {src && <img src={src} alt="" className="absolute inset-0 h-full w-full" />}
        {page.blocks.map((b, i) => (
          <div
            key={i}
            className="absolute whitespace-pre"
            style={{
              left: pct(b.x, page.width),
              width: b.justify.some(Boolean) ? pct(b.width, page.width) : undefined,
              top: pct(b.top, page.height),
              lineHeight: `${(b.pitch / page.width) * 100}cqw`,
            }}
          >
            {b.lines.map((runs, j) => (
              <div key={j} style={b.justify[j] ? { textAlign: 'justify', textAlignLast: 'justify' } : undefined}>
                {runs.map((r, k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: `${(r.size / page.width) * 100}cqw`,
                      fontWeight: r.bold ? 700 : 400,
                      fontStyle: r.italic ? 'italic' : undefined,
                      fontFamily: r.font ? `"${r.font}", sans-serif` : undefined,
                      color: `#${r.color}`,
                    }}
                  >
                    {r.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
