import { useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { downloadBlob, withExtension } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { buildDocx, convertPdf, LockedPdfError, ScannedPdfError, type PdfConversion } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; result: PdfConversion; docx: Blob }
  | { kind: 'error'; message: string }

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

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.') })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const result = await convertPdf(next, (done, total) => setStatus({ kind: 'reading', done, total }))
      const docx = await buildDocx(result)
      setStatus({ kind: 'ready', result, docx })
    } catch (e) {
      setStatus({ kind: 'error', message: errorMessage(e) })
    }
  }

  function reset() {
    setFile(null)
    setStatus({ kind: 'idle' })
  }

  if (status.kind === 'ready' && file) {
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

        <p className="text-xs text-muted-foreground">
          {t(
            'Teks, ukuran huruf, tebal/miring, dan pemisah halaman ikut terbawa dan bisa diedit di Word. Gambar, garis tabel, dan posisi yang persis tidak ikut. Periksa hasilnya sebelum dipakai.',
            "Text, font sizes, bold/italic and page breaks carry over and can be edited in Word. Images, table borders and exact positioning don't. Check the result before using it.",
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
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
