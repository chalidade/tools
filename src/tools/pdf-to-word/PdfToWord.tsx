import { useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { downloadBlob, withExtension } from '@/lib/download'
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
    return 'PDF ini tidak berisi teks. Biasanya karena hasil scan atau foto, dan butuh OCR yang belum didukung tool ini.'
  if (e instanceof LockedPdfError) return 'PDF ini dikunci password. Buka kuncinya dulu, lalu coba lagi.'
  return 'PDF tidak bisa dibaca. Pastikan filenya tidak rusak.'
}

export default function PdfToWord() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: 'Pilih file berformat .pdf.' })
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
              {result.pages} halaman · {result.paragraphs.length} paragraf
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadBlob(docx, withExtension(file.name, '.docx'))}>
              <Download />
              Unduh Word
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw />
              File lain
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Teks, ukuran huruf, tebal/miring, dan pemisah halaman ikut terbawa dan bisa diedit di Word.
          Gambar, garis tabel, dan posisi yang persis tidak ikut. Periksa hasilnya sebelum dipakai.
        </p>

        <div className="overflow-hidden rounded-2xl border">
          <div className="border-b bg-muted px-4 py-2 text-xs text-muted-foreground">
            Pratinjau teks
            {result.paragraphs.length > PREVIEW_LIMIT && ` (${PREVIEW_LIMIT} paragraf pertama)`}
          </div>
          <div className="max-h-[32rem] space-y-3 overflow-auto bg-card p-6 text-sm">
            {shown.map((p, i) => (
              <div key={i}>
                {p.pageBreakBefore && (
                  <div className="my-4 border-t border-dashed pt-1 text-center text-[10px] tracking-wide text-muted-foreground uppercase">
                    halaman baru
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
        label="Tarik file .pdf ke sini"
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? `Membaca halaman ${status.done}/${status.total}…`
              : `Membuka ${file?.name}…`
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
