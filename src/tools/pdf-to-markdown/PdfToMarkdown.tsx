import { useMemo, useState } from 'react'
import { Check, Copy, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import type { PageText } from '@/lib/pdf-text'
import { LockedPdfError, readPdfText, ScannedPdfError, toMarkdown } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; pages: PageText[] }
  | { kind: 'error'; message: string }

const BREAK_OPTIONS: { value: 'off' | 'on'; label: string }[] = [
  { value: 'off', label: 'Tanpa' },
  { value: 'on', label: 'Garis (---)' },
]

function errorMessage(e: unknown) {
  if (e instanceof ScannedPdfError)
    return 'PDF ini tidak berisi teks. Biasanya karena hasil scan atau foto, dan butuh OCR yang belum didukung tool ini.'
  if (e instanceof LockedPdfError)
    return 'PDF ini dikunci password. Buka kuncinya dulu dengan tool “Buka Proteksi PDF”.'
  return 'PDF tidak bisa dibaca. Pastikan filenya tidak rusak.'
}

export default function PdfToMarkdown() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [pageBreaks, setPageBreaks] = useState(false)
  const [copied, setCopied] = useState(false)

  const pages = status.kind === 'ready' ? status.pages : null
  const markdown = useMemo(() => (pages ? toMarkdown(pages, { pageBreaks }) : ''), [pages, pageBreaks])

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: 'Pilih file berformat .pdf.' })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const read = await readPdfText(next, (done, total) => setStatus({ kind: 'reading', done, total }))
      setStatus({ kind: 'ready', pages: read })
    } catch (e) {
      setStatus({ kind: 'error', message: errorMessage(e) })
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (e.g. insecure context): the text area stays selectable.
    }
  }

  if (pages && file) {
    const lines = markdown.split('\n').length
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {pages.length} halaman · {lines} baris Markdown
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), withExtension(file.name, '.md'))
              }
            >
              <Download />
              Unduh .md
            </Button>
            <Button variant="outline" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Tersalin' : 'Salin'}
            </Button>
            <Button variant="ghost" onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              File lain
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-2xl border bg-card p-4">
          <Segmented
            label="Pemisah halaman"
            value={pageBreaks ? 'on' : 'off'}
            options={BREAK_OPTIONS}
            onChange={(v) => setPageBreaks(v === 'on')}
          />
          <p className="max-w-md text-xs text-muted-foreground">
            Judul dikenali dari ukuran huruf, lalu tebal/miring, daftar, dan tabel ikut. Gambar tidak ikut.
          </p>
        </div>

        <textarea
          readOnly
          value={markdown}
          spellCheck={false}
          className="h-[32rem] w-full resize-y rounded-2xl border bg-card p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-brand-2/50"
        />
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
